const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const pool = require("../config/db");
const { createActivationInvitation } = require("./accountActivationService");

const clean = (value, max = 255) => String(value || "").trim().slice(0, max);
const normalizeEmail = (value) => clean(value, 180).toLowerCase();

const conflictError = (message, code = "HBT_ACCOUNT_CONFLICT") => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 409;
  return error;
};

const provisionHbtFromRegistration = async (
  registrationId,
  connection = pool,
  options = {},
) => {
  const [[registration]] = await connection.query(
    "SELECT * FROM hbt_registrations WHERE id = ? LIMIT 1 FOR UPDATE",
    [registrationId],
  );
  if (!registration) return null;

  if (registration.payment_status !== "paid") {
    throw conflictError("Portal provisioning requires a confirmed payment", "HBT_PAYMENT_NOT_CONFIRMED");
  }

  const loginUrl = `${(process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "")}/login`;
  const email = normalizeEmail(registration.email);

  const [[existingUser]] = await connection.query(
    "SELECT id, role, team_id, is_active FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
    [email],
  );

  if (existingUser) {
    if (existingUser.role !== "hbt_admin") {
      throw conflictError("An account already exists with this email under a different role. Admin review is required.");
    }

    if (
      registration.team_id &&
      existingUser.team_id &&
      Number(registration.team_id) !== Number(existingUser.team_id)
    ) {
      throw conflictError("This HBT Admin account is already linked to a different team. Admin review is required.");
    }
  }

  let teamId = registration.team_id || existingUser?.team_id || null;
  if (!teamId) {
    const [teamResult] = await connection.query(
      `INSERT INTO home_buying_teams
       (name, email, phone, website, description, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [
        registration.company_name,
        email,
        registration.phone || null,
        registration.website_url || null,
        `Created from Employee Benefit Program signup #${registration.id}`,
      ],
    );
    teamId = teamResult.insertId;
  }

  if (existingUser) {
    await connection.query(
      "UPDATE users SET team_id = ? WHERE id = ? AND role = 'hbt_admin'",
      [teamId, existingUser.id],
    );

    if (Number(existingUser.is_active) === 1) {
      await connection.query(
        `UPDATE hbt_registrations
         SET team_id = ?, user_id = ?, status = 'portal_created', payment_status = 'paid'
         WHERE id = ?`,
        [teamId, existingUser.id, registrationId],
      );
      return {
        team_id: teamId,
        user_id: existingUser.id,
        login_email: email,
        login_url: loginUrl,
        already_created: true,
        reused_existing_user: true,
        activation_required: false,
      };
    }

    const activation = await createActivationInvitation(connection, {
      userId: existingUser.id,
      email,
      targetRole: "hbt_admin",
      teamId,
      createdByUserId: options.createdByUserId || null,
    });
    await connection.query(
      `UPDATE hbt_registrations
       SET team_id = ?, user_id = ?, status = 'activation_pending', payment_status = 'paid'
       WHERE id = ?`,
      [teamId, existingUser.id, registrationId],
    );
    return {
      team_id: teamId,
      user_id: existingUser.id,
      login_email: email,
      login_url: loginUrl,
      already_created: false,
      reused_existing_user: true,
      activation_required: true,
      activation_url: activation.activation_url,
      activation_expires_in_hours: activation.expires_in_hours,
    };
  }

  const unusablePassword = crypto.randomBytes(48).toString("base64url");
  const hash = await bcrypt.hash(unusablePassword, 12);
  const [userResult] = await connection.query(
    `INSERT INTO users
     (full_name, email, password, role, team_id, is_active)
     VALUES (?, ?, ?, 'hbt_admin', ?, 0)`,
    [registration.full_name, email, hash, teamId],
  );

  const activation = await createActivationInvitation(connection, {
    userId: userResult.insertId,
    email,
    targetRole: "hbt_admin",
    teamId,
    createdByUserId: options.createdByUserId || null,
  });

  await connection.query(
    `UPDATE hbt_registrations
     SET team_id = ?, user_id = ?, status = 'activation_pending', payment_status = 'paid'
     WHERE id = ?`,
    [teamId, userResult.insertId, registrationId],
  );

  return {
    team_id: teamId,
    user_id: userResult.insertId,
    login_email: email,
    login_url: loginUrl,
    already_created: false,
    activation_required: true,
    activation_url: activation.activation_url,
    activation_expires_in_hours: activation.expires_in_hours,
  };
};

module.exports = { provisionHbtFromRegistration };
