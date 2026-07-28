const version = "20260728_quiz_security";

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

const addColumnIfMissing = async (connection, tableName, columnName, definition) => {
  if (!(await columnExists(connection, tableName, columnName))) {
    await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

const addIndexIfMissing = async (connection, tableName, indexName, columns) => {
  if (!(await indexExists(connection, tableName, indexName))) {
    await connection.query(`CREATE INDEX ${indexName} ON ${tableName} (${columns})`);
  }
};

const up = async (connection) => {
  await addColumnIfMissing(connection, "quizzes", "team_id", "INT NULL AFTER id");
  await addColumnIfMissing(connection, "quizzes", "is_global", "TINYINT(1) NOT NULL DEFAULT 1 AFTER description");
  await addColumnIfMissing(connection, "quizzes", "is_active", "TINYINT(1) NOT NULL DEFAULT 1 AFTER is_global");
  await addColumnIfMissing(connection, "quizzes", "access_type", "VARCHAR(40) NOT NULL DEFAULT 'public' AFTER is_active");
  await addColumnIfMissing(connection, "quiz_questions", "is_required", "TINYINT(1) NOT NULL DEFAULT 1 AFTER question_type");
  await addColumnIfMissing(connection, "quiz_answers", "selected_option_id", "INT NULL AFTER question_id");

  await connection.query(
    `UPDATE quizzes
     SET access_type = CASE
       WHEN COALESCE(is_global, 0) = 1 THEN 'public'
       ELSE 'private'
     END
     WHERE access_type IS NULL
        OR access_type NOT IN ('public', 'private', 'employee')`,
  );

  await connection.query(`CREATE TABLE IF NOT EXISTS quiz_partnerships (
    quiz_id INT NOT NULL,
    partnership_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (quiz_id, partnership_id),
    INDEX idx_quiz_partnerships_quiz (quiz_id),
    INDEX idx_quiz_partnerships_partnership (partnership_id),
    CONSTRAINT fk_quiz_partnerships_quiz
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
      ON DELETE CASCADE,
    CONSTRAINT fk_quiz_partnerships_partnership
      FOREIGN KEY (partnership_id) REFERENCES partnerships(id)
      ON DELETE CASCADE
  ) ENGINE=InnoDB`);

  await addIndexIfMissing(connection, "quizzes", "idx_quizzes_visibility", "is_active, is_global, team_id");
  await addIndexIfMissing(connection, "quizzes", "idx_quizzes_access_type", "access_type");
  await addIndexIfMissing(connection, "quiz_questions", "idx_quiz_questions_quiz_required", "quiz_id, is_required");
};

module.exports = { version, up };
