const version = "20260812_invite_schema_completion";

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

const addColumnIfMissing = async (connection, tableName, columnName, definition) => {
  if (!(await columnExists(connection, tableName, columnName))) {
    await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

const up = async (connection) => {
  if (!(await tableExists(connection, "employee_invites"))) {
    await connection.query(`CREATE TABLE employee_invites (
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
      INDEX idx_employee_invites_status (status),
      INDEX idx_employee_invites_batch (enrollment_batch_id)
    ) ENGINE=InnoDB`);
  } else {
    await addColumnIfMissing(connection, "employee_invites", "enrollment_batch_id", "INT NULL");
    await addColumnIfMissing(connection, "employee_invites", "invited_by_user_id", "INT NULL");
    await addColumnIfMissing(connection, "employee_invites", "registered_user_id", "INT NULL");
    await addColumnIfMissing(connection, "employee_invites", "invite_role", "VARCHAR(40) NOT NULL DEFAULT 'employee'");
    await addColumnIfMissing(connection, "employee_invites", "invite_token", "VARCHAR(120) NULL");
    await addColumnIfMissing(connection, "employee_invites", "invite_code", "VARCHAR(40) NULL");
    await addColumnIfMissing(connection, "employee_invites", "invite_token_hash", "CHAR(64) NULL");
    await addColumnIfMissing(connection, "employee_invites", "invite_code_hash", "CHAR(64) NULL");
    await addColumnIfMissing(connection, "employee_invites", "expires_at", "DATETIME NULL");
    await addColumnIfMissing(connection, "employee_invites", "accepted_at", "DATETIME NULL");
    await addColumnIfMissing(connection, "employee_invites", "last_sent_at", "DATETIME NULL");
  }

  if (!(await indexExists(connection, "employee_invites", "uq_employee_invite_token_hash"))) {
    await connection.query("CREATE UNIQUE INDEX uq_employee_invite_token_hash ON employee_invites (invite_token_hash)");
  }
  if (!(await indexExists(connection, "employee_invites", "uq_employee_invite_code_hash"))) {
    await connection.query("CREATE UNIQUE INDEX uq_employee_invite_code_hash ON employee_invites (invite_code_hash)");
  }
  if (!(await indexExists(connection, "employee_invites", "idx_employee_invites_batch"))) {
    await connection.query("CREATE INDEX idx_employee_invites_batch ON employee_invites (enrollment_batch_id)");
  }

  await connection.query(
    `UPDATE employee_invites ei
     LEFT JOIN users u ON u.id = ei.registered_user_id
     SET ei.invite_role = CASE
       WHEN u.role IN ('company', 'company_admin') THEN u.role
       ELSE COALESCE(NULLIF(ei.invite_role, ''), 'employee')
     END`,
  );

  if (await tableExists(connection, "employer_approval_requests")) {
    await connection.query(
      `UPDATE employee_invites ei
       JOIN employer_approval_requests ear
         ON ear.partnership_id = ei.partnership_id
        AND LOWER(ear.contact_email) = LOWER(ei.email)
        AND ear.approval_status = 'approved'
       SET ei.invite_role = 'company_admin'
       WHERE ei.status = 'invited'`,
    );
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
     SET invite_token = NULL,
         invite_code = NULL
     WHERE invite_token IS NOT NULL OR invite_code IS NOT NULL`,
  );
};

module.exports = { version, up };
