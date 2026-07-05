const pool = require("../config/db");

const VALID_TYPES = new Set(["info", "success", "warning", "appointment", "message", "service_request", "system"]);

const createNotification = async ({
  user_id = null,
  target_role = null,
  target_team_id = null,
  target_partnership_id = null,
  title,
  message = null,
  link = null,
  type = "info",
}) => {
  if (!title || !String(title).trim()) return null;

  const normalizedType = VALID_TYPES.has(type) ? type : "info";

  const [result] = await pool.query(
    `INSERT INTO notifications
     (user_id, target_role, target_team_id, target_partnership_id, title, message, link, type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user_id,
      target_role,
      target_team_id,
      target_partnership_id,
      String(title).trim().slice(0, 255),
      message ? String(message).trim() : null,
      link ? String(link).trim().slice(0, 500) : null,
      normalizedType,
    ]
  );

  return result.insertId;
};

const createAdminNotification = async ({ title, message, link, type = "system" }) => {
  await createNotification({ target_role: "admin", title, message, link, type });
  await createNotification({ target_role: "super_admin", title, message, link, type });
};

module.exports = {
  createNotification,
  createAdminNotification,
};
