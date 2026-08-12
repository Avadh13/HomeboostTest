const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");

const migration = require("../src/migrations/20260812_invite_schema_completion");
const { listPublicInvitesForPartnership } = require("../src/services/inviteLifecycleService");

const config = {
  host: process.env.INTEGRATION_DB_HOST || "127.0.0.1",
  port: Number(process.env.INTEGRATION_DB_PORT || 3306),
  user: process.env.INTEGRATION_DB_USER || "root",
  password: process.env.INTEGRATION_DB_PASSWORD || "root",
};
const database = `${process.env.INTEGRATION_DB_NAME || "homeboost_security_integration"}_schema_hotfix`;
let connection;

test.before(async () => {
  connection = await mysql.createConnection(config);
  await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await connection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE \`${database}\``);

  await connection.query(`CREATE TABLE home_buying_teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
  ) ENGINE=InnoDB`);
  await connection.query(`CREATE TABLE employers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
  ) ENGINE=InnoDB`);
  await connection.query(`CREATE TABLE partnerships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    employer_id INT NOT NULL,
    slug VARCHAR(150) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'active'
  ) ENGINE=InnoDB`);
  await connection.query(`CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(40) NOT NULL
  ) ENGINE=InnoDB`);

  // Production legacy shape from employee_invites_security_2026_06_29.sql.
  await connection.query(`CREATE TABLE employee_invites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partnership_id INT NOT NULL,
    enrollment_batch_id INT NULL,
    invited_by_user_id INT NULL,
    registered_user_id INT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    status ENUM('invited', 'registered', 'revoked') NOT NULL DEFAULT 'invited',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    registered_at DATETIME NULL,
    revoked_at DATETIME NULL,
    UNIQUE KEY uq_employee_invite_partnership_email (partnership_id, email),
    INDEX idx_employee_invites_email (email),
    INDEX idx_employee_invites_status (status),
    INDEX idx_employee_invites_batch (enrollment_batch_id)
  ) ENGINE=InnoDB`);

  await connection.query("INSERT INTO home_buying_teams (id, name) VALUES (1, 'Schema HBT')");
  await connection.query("INSERT INTO employers (id, name) VALUES (1, 'Schema Employer')");
  await connection.query("INSERT INTO partnerships (id, team_id, employer_id, slug, status) VALUES (1, 1, 1, 'schema-employer', 'active')");
  await connection.query(
    `INSERT INTO employee_invites
     (partnership_id, full_name, email, status)
     VALUES (1, 'Legacy Employee', 'legacy@example.com', 'invited')`,
  );
});

test.after(async () => {
  if (!connection) return;
  await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await connection.end();
});

test("schema completion upgrades the legacy invite table used by Company Manager dashboard", async () => {
  await migration.up(connection);

  const requiredColumns = [
    "invite_role",
    "invite_token",
    "invite_code",
    "invite_token_hash",
    "invite_code_hash",
    "expires_at",
    "accepted_at",
    "last_sent_at",
  ];
  const [columns] = await connection.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'employee_invites'`,
    [database],
  );
  const names = new Set(columns.map((row) => row.COLUMN_NAME));
  for (const column of requiredColumns) assert.equal(names.has(column), true, `missing ${column}`);

  const invites = await listPublicInvitesForPartnership(connection, 1);
  assert.equal(invites.length, 1);
  assert.equal(invites[0].email, "legacy@example.com");
  assert.equal(invites[0].invite_role, "employee");
});
