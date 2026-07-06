const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const clean = (value, max = 255) => String(value || "").trim().slice(0, max);

const generatePassword = (name) => {
  const prefix = clean(name, 40).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6) || "hbt";
  return `${prefix}@${Math.floor(10000 + Math.random() * 90000)}`;
};

const provisionHbtFromRegistration = async (registrationId, connection = pool) => {
  const [[registration]] = await connection.query("SELECT * FROM hbt_registrations WHERE id = ? LIMIT 1", [registrationId]);
  if (!registration) return null;
  if (registration.team_id && registration.user_id) return { team_id: registration.team_id, user_id: registration.user_id, already_created: true };

  const [teamResult] = await connection.query(
    `INSERT INTO home_buying_teams (name, description, is_active) VALUES (?, ?, 1)`,
    [registration.company_name, `Created from EBP signup #${registration.id}`]
  );

  const initialPassword = process.env.DEFAULT_HBT_ADMIN_PASSWORD || generatePassword(registration.full_name);
  const hash = await bcrypt.hash(initialPassword, 10);

  const [userResult] = await connection.query(
    `INSERT INTO users (full_name, email, password, role, team_id, is_active) VALUES (?, ?, ?, 'hbt_admin', ?, 1)`,
    [registration.full_name, registration.email, hash, teamResult.insertId]
  );

  await connection.query(
    `UPDATE hbt_registrations SET team_id = ?, user_id = ?, status = 'portal_created', payment_status = 'paid' WHERE id = ?`,
    [teamResult.insertId, userResult.insertId, registrationId]
  );

  return { team_id: teamResult.insertId, user_id: userResult.insertId, already_created: false };
};

module.exports = { provisionHbtFromRegistration };
