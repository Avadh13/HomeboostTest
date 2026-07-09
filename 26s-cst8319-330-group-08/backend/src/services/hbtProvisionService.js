const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const clean = (value, max = 255) => String(value || "").trim().slice(0, max);
const normalizeEmail = (value) => clean(value, 180).toLowerCase();

const generatePassword = (name) => {
  const prefix = clean(name, 40).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) || "hbt";
  return `${prefix}@${Math.floor(10000 + Math.random() * 90000)}`;
};

const provisionHbtFromRegistration = async (registrationId, connection = pool) => {
  const [[registration]] = await connection.query("SELECT * FROM hbt_registrations WHERE id = ? LIMIT 1", [registrationId]);
  if (!registration) return null;

  const loginUrl = `${(process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "")}/login`;
  const email = normalizeEmail(registration.email);

  if (registration.team_id && registration.user_id) {
    return {
      team_id: registration.team_id,
      user_id: registration.user_id,
      login_email: email,
      login_url: loginUrl,
      already_created: true,
    };
  }

  let teamId = registration.team_id;
  if (!teamId) {
    const [teamResult] = await connection.query(
      `INSERT INTO home_buying_teams (name, email, phone, website, description, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [
        registration.company_name,
        email,
        registration.phone || null,
        registration.website_url || null,
        `Created from EBP signup #${registration.id}`,
      ]
    );
    teamId = teamResult.insertId;
  }

  const [[existingUser]] = await connection.query("SELECT id, role, team_id FROM users WHERE email = ? LIMIT 1", [email]);
  if (existingUser) {
    await connection.query(
      `UPDATE users SET role = 'hbt_admin', team_id = ?, is_active = 1 WHERE id = ?`,
      [teamId, existingUser.id]
    );
    await connection.query(
      `UPDATE hbt_registrations SET team_id = ?, user_id = ?, status = 'portal_created', payment_status = 'paid' WHERE id = ?`,
      [teamId, existingUser.id, registrationId]
    );
    return {
      team_id: teamId,
      user_id: existingUser.id,
      login_email: email,
      login_url: loginUrl,
      already_created: true,
      reused_existing_user: true,
    };
  }

  const initialPassword = process.env.DEFAULT_HBT_ADMIN_PASSWORD || generatePassword(registration.full_name);
  const hash = await bcrypt.hash(initialPassword, 10);

  const [userResult] = await connection.query(
    `INSERT INTO users (full_name, email, password, role, team_id, is_active)
     VALUES (?, ?, ?, 'hbt_admin', ?, 1)`,
    [registration.full_name, email, hash, teamId]
  );

  await connection.query(
    `UPDATE hbt_registrations SET team_id = ?, user_id = ?, status = 'portal_created', payment_status = 'paid' WHERE id = ?`,
    [teamId, userResult.insertId, registrationId]
  );

  return {
    team_id: teamId,
    user_id: userResult.insertId,
    login_email: email,
    login_url: loginUrl,
    initial_password: initialPassword,
    already_created: false,
  };
};

module.exports = { provisionHbtFromRegistration };
