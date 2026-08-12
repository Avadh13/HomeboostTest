const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");
const {
  InviteLifecycleError,
  createOrRefreshEmployeeInvite,
} = require("../src/services/inviteLifecycleService");

const config = {
  host: process.env.INTEGRATION_DB_HOST || "127.0.0.1",
  port: Number(process.env.INTEGRATION_DB_PORT || 3306),
  user: process.env.INTEGRATION_DB_USER || "root",
  password: process.env.INTEGRATION_DB_PASSWORD || "root",
};
const database = `${process.env.INTEGRATION_DB_NAME || "homeboost_security_integration"}_roles`;
let connection;

test.before(async () => {
  connection = await mysql.createConnection(config);
  await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await connection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE \`${database}\``);

  await connection.query(`CREATE TABLE home_buying_teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_active TINYINT(1) DEFAULT 1
  ) ENGINE=InnoDB`);
  await connection.query(`CREATE TABLE employers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
  ) ENGINE=InnoDB`);
  await connection.query(`CREATE TABLE partnerships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    employer_id INT NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    status VARCHAR(40) NOT NULL DEFAULT 'active'
  ) ENGINE=InnoDB`);
  await connection.query(`CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE
  ) ENGINE=InnoDB`);
  await connection.query(`CREATE TABLE employee_invites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partnership_id INT NOT NULL,
    enrollment_batch_id INT NULL,
    invited_by_user_id INT NULL,
    registered_user_id INT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'invited',
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
    UNIQUE KEY uq_invite_partnership_email (partnership_id, email)
  ) ENGINE=InnoDB`);

  await connection.query("INSERT INTO home_buying_teams (id, name, is_active) VALUES (1, 'Role Test HBT', 1)");
  await connection.query("INSERT INTO employers (id, name) VALUES (1, 'Role Test Employer')");
  await connection.query("INSERT INTO partnerships (id, team_id, employer_id, slug, status) VALUES (1, 1, 1, 'role-test', 'active')");
  await connection.query(
    `INSERT INTO employee_invites
     (partnership_id, full_name, email, status, invite_role, invite_token_hash, invite_code_hash, expires_at)
     VALUES (1, 'Company Manager', 'manager@example.com', 'invited', 'company_admin', REPEAT('a', 64), REPEAT('b', 64), DATE_ADD(NOW(), INTERVAL 14 DAY))`,
  );
});

test.after(async () => {
  if (!connection) return;
  await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await connection.end();
});

test("employee invite creation rejects and preserves a pending company_admin invitation", async () => {
  await connection.beginTransaction();
  await assert.rejects(
    () => createOrRefreshEmployeeInvite(connection, {
      partnershipId: 1,
      fullName: "Wrong Employee Role",
      email: "manager@example.com",
    }),
    (error) => {
      assert.equal(error instanceof InviteLifecycleError, true);
      assert.equal(error.statusCode, 409);
      assert.equal(error.code, "INVITE_ROLE_CONFLICT");
      return true;
    },
  );
  await connection.rollback();

  const [[invite]] = await connection.query(
    `SELECT full_name, status, invite_role, invite_token_hash, invite_code_hash
     FROM employee_invites
     WHERE partnership_id = 1 AND email = 'manager@example.com'`,
  );

  assert.equal(invite.full_name, "Company Manager");
  assert.equal(invite.status, "invited");
  assert.equal(invite.invite_role, "company_admin");
  assert.equal(invite.invite_token_hash, "a".repeat(64));
  assert.equal(invite.invite_code_hash, "b".repeat(64));
});
