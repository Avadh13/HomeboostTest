const pool = require("../config/db");

const VALID_TYPES = new Set(["info", "success", "warning", "appointment", "message", "service_request", "system"]);

const normalizeText = (value, maxLength) => String(value || "").trim().slice(0, maxLength);

const insertNotification = async ({ user_id = null, target_role = null, target_team_id = null, target_partnership_id = null, title, message = null, link = null, type = "info" }) => {
  const normalizedTitle = normalizeText(title, 255);
  if (!normalizedTitle) return null;

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
      normalizedTitle,
      message ? String(message).trim() : null,
      link ? normalizeText(link, 500) : null,
      normalizedType,
    ]
  );

  return result.insertId;
};

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
  if (user_id || !target_role || target_role === "all") {
    return insertNotification({ user_id, target_role, target_team_id, target_partnership_id, title, message, link, type });
  }

  const conditions = ["role = ?", "is_active = 1"];
  const params = [target_role];

  if (target_team_id) {
    conditions.push("team_id = ?");
    params.push(target_team_id);
  }

  if (target_partnership_id) {
    conditions.push("partnership_id = ?");
    params.push(target_partnership_id);
  }

  const [users] = await pool.query(`SELECT id FROM users WHERE ${conditions.join(" AND ")}`, params);

  if (!users.length) {
    return insertNotification({ user_id: null, target_role, target_team_id, target_partnership_id, title, message, link, type });
  }

  let firstInsertedId = null;

  for (const user of users) {
    const insertedId = await insertNotification({ user_id: user.id, title, message, link, type });
    if (!firstInsertedId) firstInsertedId = insertedId;
  }

  return firstInsertedId;
};

const createAdminNotification = async ({ title, message, link, type = "system" }) => {
  await createNotification({ target_role: "admin", title, message, link, type });
  await createNotification({ target_role: "super_admin", title, message, link, type });
};

module.exports = {
  createNotification,
  createAdminNotification,
};
