const pool = require("../config/db");

const getAudienceCondition = (user) => {
  const conditions = ["n.user_id = ?", "n.target_role = 'all'"];
  const params = [user.id];

  let roleCondition = "n.target_role = ?";
  const roleParams = [user.role];

  if (user.team_id) {
    roleCondition += " AND (n.target_team_id IS NULL OR n.target_team_id = ?)";
    roleParams.push(user.team_id);
  } else {
    roleCondition += " AND n.target_team_id IS NULL";
  }

  if (user.partnership_id) {
    roleCondition += " AND (n.target_partnership_id IS NULL OR n.target_partnership_id = ?)";
    roleParams.push(user.partnership_id);
  } else {
    roleCondition += " AND n.target_partnership_id IS NULL";
  }

  conditions.push(`(${roleCondition})`);
  params.push(...roleParams);

  return {
    where: `(${conditions.join(" OR ")})`,
    params,
  };
};

exports.getNotifications = async (req, res, next) => {
  try {
    const audience = getAudienceCondition(req.user);

    const [notifications] = await pool.query(
      `SELECT
        n.id,
        n.title,
        n.message,
        n.link,
        n.type,
        n.is_read,
        n.created_at,
        n.target_role,
        n.target_team_id,
        n.target_partnership_id
       FROM notifications n
       WHERE ${audience.where}
       ORDER BY n.created_at DESC
       LIMIT 100`,
      audience.params
    );

    res.json(notifications);
  } catch (error) {
    next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const audience = getAudienceCondition(req.user);

    const [rows] = await pool.query(
      `SELECT COUNT(*) AS unread_count
       FROM notifications n
       WHERE ${audience.where}
         AND n.is_read = 0`,
      audience.params
    );

    res.json({ unread_count: rows[0]?.unread_count || 0 });
  } catch (error) {
    next(error);
  }
};

exports.markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const audience = getAudienceCondition(req.user);

    const [result] = await pool.query(
      `UPDATE notifications n
       SET is_read = 1
       WHERE n.id = ?
         AND ${audience.where}`,
      [id, ...audience.params]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: "error", message: "Notification not found" });
    }

    res.json({ status: "success", message: "Notification marked as read" });
  } catch (error) {
    next(error);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    const audience = getAudienceCondition(req.user);

    await pool.query(
      `UPDATE notifications n
       SET is_read = 1
       WHERE ${audience.where}`,
      audience.params
    );

    res.json({ status: "success", message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
};
