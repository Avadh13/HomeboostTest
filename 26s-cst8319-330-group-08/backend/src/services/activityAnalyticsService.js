const pool = require("../config/db");

let initializationPromise = null;

const createAnalyticsTables = async (connection) => {
  await connection.query(`CREATE TABLE IF NOT EXISTS employee_activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    partnership_id INT NULL,
    activity_type VARCHAR(80) NOT NULL,
    activity_label VARCHAR(255) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_partnership (partnership_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_activity_created (created_at)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS resource_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT NOT NULL,
    user_id INT NOT NULL,
    partnership_id INT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_resource_views_resource (resource_id),
    INDEX idx_resource_views_user (user_id),
    INDEX idx_resource_views_partnership (partnership_id),
    INDEX idx_resource_views_viewed_at (viewed_at)
  )`);
};

const ensureActivityAnalyticsTables = async (connection = pool) => {
  if (connection !== pool) {
    await createAnalyticsTables(connection);
    return;
  }

  if (!initializationPromise) {
    initializationPromise = createAnalyticsTables(pool).catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  await initializationPromise;
};

const logEmployeeActivity = async (
  {
    userId,
    partnershipId = null,
    activityType = "portal_activity",
    activityLabel = "Employee activity",
    metadata = {},
    dedupeHours = 0,
  },
  connection = pool
) => {
  if (!userId) return false;

  await ensureActivityAnalyticsTables(connection);

  const safeType = String(activityType || "portal_activity").trim().slice(0, 80);
  const safeLabel = String(activityLabel || "Employee activity").trim().slice(0, 255);
  const hours = Math.max(0, Number(dedupeHours) || 0);

  if (hours > 0) {
    const [existing] = await connection.query(
      `SELECT id
       FROM employee_activity_logs
       WHERE user_id = ?
         AND activity_type = ?
         AND created_at >= TIMESTAMPADD(HOUR, -?, NOW())
       LIMIT 1`,
      [userId, safeType, hours]
    );

    if (existing.length > 0) return false;
  }

  await connection.query(
    `INSERT INTO employee_activity_logs
     (user_id, partnership_id, activity_type, activity_label, metadata)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, partnershipId || null, safeType, safeLabel, JSON.stringify(metadata || {})]
  );

  return true;
};

const recordResourceView = async (
  { resourceId, userId, partnershipId = null, resourceTitle = "Resource viewed" },
  connection = pool
) => {
  if (!resourceId || !userId) return false;

  await ensureActivityAnalyticsTables(connection);

  await connection.query(
    `INSERT INTO resource_views (resource_id, user_id, partnership_id)
     VALUES (?, ?, ?)`,
    [resourceId, userId, partnershipId || null]
  );

  await logEmployeeActivity(
    {
      userId,
      partnershipId,
      activityType: "resource_view",
      activityLabel: resourceTitle,
      metadata: { resource_id: Number(resourceId) },
    },
    connection
  );

  return true;
};

module.exports = {
  ensureActivityAnalyticsTables,
  logEmployeeActivity,
  recordResourceView,
};
