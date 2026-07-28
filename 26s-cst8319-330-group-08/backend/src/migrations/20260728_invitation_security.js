const version = "20260728_invitation_security";

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

const up = async (connection) => {
  await connection.query(`CREATE TABLE IF NOT EXISTS employee_invites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partnership_id INT NOT NULL,
    enrollment_batch_id INT NULL,
    invited_by_user_id INT NULL,
    registered_user_id INT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    status ENUM('invited', 'registered', 'revoked') NOT NULL DEFAULT 'invited',
    invite_role VARCHAR(40) NOT NULL DEFAULT 'employee',
    invite_token VARCHAR(120) NULL,
    invite_code VARCHAR(40) NULL,
    invite_token_hash CHAR(64) NULL,
    invite_code_hash CHAR(64) NULL,
    expires_at DATETIME NULL,
    accepted_at DATETIME NULL,
    last_sent_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    registered_at DATETIME NULL,
    revoked_at DATETIME NULL,
    UNIQUE KEY uq_employee_invite_partnership_email (partnership_id, email),
    UNIQUE KEY uq_employee_invite_token_hash (invite_token_hash),
    UNIQUE KEY uq_employee_invite_code_hash (invite_code_hash),
    INDEX idx_employee_invites_email (email),
    INDEX idx_employee_invites_status (status)
  ) ENGINE=InnoDB`);

  if (!(await columnExists(connection, "employee_invites", "invite_token_hash"))) {
    await connection.query("ALTER TABLE employee_invites ADD COLUMN invite_token_hash CHAR(64) NULL AFTER invite_code");
  }
  if (!(await columnExists(connection, "employee_invites", "invite_code_hash"))) {
    await connection.query("ALTER TABLE employee_invites ADD COLUMN invite_code_hash CHAR(64) NULL AFTER invite_token_hash");
  }

  await connection.query(
    `UPDATE employee_invites
     SET invite_token_hash = SHA2(invite_token, 256)
     WHERE invite_token IS NOT NULL
       AND invite_token <> ''
       AND invite_token_hash IS NULL`,
  );
  await connection.query(
    `UPDATE employee_invites
     SET invite_code_hash = SHA2(invite_code, 256)
     WHERE invite_code IS NOT NULL
       AND invite_code <> ''
       AND invite_code_hash IS NULL`,
  );
  await connection.query(
    `UPDATE employee_invites
     SET invite_token = NULL, invite_code = NULL
     WHERE invite_token_hash IS NOT NULL OR invite_code_hash IS NOT NULL`,
  );

  if (!(await indexExists(connection, "employee_invites", "uq_employee_invite_token_hash"))) {
    await connection.query("CREATE UNIQUE INDEX uq_employee_invite_token_hash ON employee_invites (invite_token_hash)");
  }
  if (!(await indexExists(connection, "employee_invites", "uq_employee_invite_code_hash"))) {
    await connection.query("CREATE UNIQUE INDEX uq_employee_invite_code_hash ON employee_invites (invite_code_hash)");
  }

  await connection.query(`CREATE TABLE IF NOT EXISTS invite_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invite_id INT NOT NULL,
    action VARCHAR(80) NOT NULL,
    actor_user_id INT NULL,
    message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_invite_logs_invite (invite_id),
    INDEX idx_invite_logs_action (action)
  ) ENGINE=InnoDB`);
};

module.exports = { version, up };
