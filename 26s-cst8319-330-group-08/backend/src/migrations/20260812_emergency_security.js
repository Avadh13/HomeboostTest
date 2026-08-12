const version = "20260812_emergency_security";

const columnExists = async (connection, tableName, columnName) => {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName],
  );
  return rows.length > 0;
};

const indexExists = async (connection, tableName, indexName) => {
  const [rows] = await connection.query(
    `SELECT INDEX_NAME
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?
     LIMIT 1`,
    [tableName, indexName],
  );
  return rows.length > 0;
};

const tableExists = async (connection, tableName) => {
  const [rows] = await connection.query(
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     LIMIT 1`,
    [tableName],
  );
  return rows.length > 0;
};

const up = async (connection) => {
  if (await tableExists(connection, "employee_invites")) {
    if (await columnExists(connection, "employee_invites", "invite_token_hash")) {
      await connection.query(
        `UPDATE employee_invites
         SET invite_token_hash = SHA2(invite_token, 256)
         WHERE invite_token IS NOT NULL
           AND invite_token <> ''
           AND invite_token_hash IS NULL`,
      );
    }

    if (await columnExists(connection, "employee_invites", "invite_code_hash")) {
      await connection.query(
        `UPDATE employee_invites
         SET invite_code_hash = SHA2(invite_code, 256)
         WHERE invite_code IS NOT NULL
           AND invite_code <> ''
           AND invite_code_hash IS NULL`,
      );
    }

    if (
      (await columnExists(connection, "employee_invites", "invite_token")) &&
      (await columnExists(connection, "employee_invites", "invite_code"))
    ) {
      await connection.query(
        `UPDATE employee_invites
         SET invite_token = NULL,
             invite_code = NULL`,
      );
    }
  }

  await connection.query(`CREATE TABLE IF NOT EXISTS resource_recommendation_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT NOT NULL,
    team_id INT NULL,
    readiness_level VARCHAR(60) NULL,
    priority VARCHAR(20) NULL,
    keyword VARCHAR(120) NULL,
    rule_label VARCHAR(255) NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_resource_rule_resource (resource_id),
    INDEX idx_resource_rule_team (team_id),
    INDEX idx_resource_rule_level (readiness_level),
    INDEX idx_resource_rule_priority (priority),
    INDEX idx_resource_rule_keyword (keyword)
  ) ENGINE=InnoDB`);

  if (!(await columnExists(connection, "resource_recommendation_rules", "team_id"))) {
    await connection.query(
      "ALTER TABLE resource_recommendation_rules ADD COLUMN team_id INT NULL AFTER resource_id",
    );
  }

  if (!(await indexExists(connection, "resource_recommendation_rules", "idx_resource_rule_team"))) {
    await connection.query(
      "CREATE INDEX idx_resource_rule_team ON resource_recommendation_rules (team_id)",
    );
  }

  // Legacy rules have no reliable creator/team attribution. Fail closed and
  // require an Admin to review/reactivate them under an explicit scope.
  await connection.query(
    `UPDATE resource_recommendation_rules
     SET is_active = 0
     WHERE team_id IS NULL
       AND is_active = 1`,
  );
};

module.exports = { version, up };
