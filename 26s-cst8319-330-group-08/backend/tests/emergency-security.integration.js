const test = require("node:test");
const assert = require("node:assert/strict");
const mysql = require("mysql2/promise");

const {
  createOrRefreshEmployeeInvite,
  revokePendingBatchInvites,
} = require("../src/services/inviteLifecycleService");
const { createActivationInvitation } = require("../src/services/accountActivationService");
const { hashOpaqueToken } = require("../src/services/paymentSecurityService");
const emergencyMigration = require("../src/migrations/20260812_emergency_security");

const config = {
  host: process.env.INTEGRATION_DB_HOST || "127.0.0.1",
  port: Number(process.env.INTEGRATION_DB_PORT || 3306),
  user: process.env.INTEGRATION_DB_USER || "root",
  password: process.env.INTEGRATION_DB_PASSWORD || "root",
};
const database = process.env.INTEGRATION_DB_NAME || "homeboost_security_integration";
let connection;

const createSchema = async () => {
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
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(40) NOT NULL,
    team_id INT NULL,
    partnership_id INT NULL,
    enrollment_batch_id INT NULL,
    is_active TINYINT(1) DEFAULT 1
  ) ENGINE=InnoDB`);

  await connection.query(`CREATE TABLE enrollment_batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partnership_id INT NOT NULL,
    uploaded_by_user_id INT NULL,
    original_filename VARCHAR(255) NULL,
    created_count INT DEFAULT 0,
    skipped_count INT DEFAULT 0,
    status VARCHAR(40) DEFAULT 'active',
    revoked_at DATETIME NULL
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
    UNIQUE KEY uq_invite_partnership_email (partnership_id, email),
    UNIQUE KEY uq_invite_token_hash (invite_token_hash),
    UNIQUE KEY uq_invite_code_hash (invite_code_hash)
  ) ENGINE=InnoDB`);

  await connection.query(`CREATE TABLE account_activation_invitations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    email VARCHAR(180) NOT NULL,
    target_role VARCHAR(40) NOT NULL,
    team_id INT NULL,
    partnership_id INT NULL,
    token_hash CHAR(64) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'pending',
    expires_at DATETIME NOT NULL,
    accepted_at DATETIME NULL,
    revoked_at DATETIME NULL,
    created_by_user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_activation_token_hash (token_hash),
    INDEX idx_activation_user (user_id),
    INDEX idx_activation_status (status)
  ) ENGINE=InnoDB`);

  // Intentionally use the pre-hardening schema so the migration must add team_id.
  await connection.query(`CREATE TABLE resource_recommendation_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT NOT NULL,
    readiness_level VARCHAR(60) NULL,
    priority VARCHAR(20) NULL,
    keyword VARCHAR(120) NULL,
    rule_label VARCHAR(255) NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);

  await connection.query("INSERT INTO home_buying_teams (id, name, is_active) VALUES (1, 'Integration HBT A', 1), (2, 'Integration HBT B', 1)");
  await connection.query("INSERT INTO employers (id, name) VALUES (1, 'Integration Employer')");
  await connection.query("INSERT INTO partnerships (id, team_id, employer_id, slug, status) VALUES (1, 1, 1, 'integration-employer', 'active')");
};

test.before(async () => {
  connection = await mysql.createConnection(config);
  await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await connection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE \`${database}\``);
  await createSchema();
});

test.after(async () => {
  if (!connection) return;
  await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
  await connection.end();
});

test("emergency migration hashes legacy invite credentials and fails legacy global rules closed", async () => {
  await connection.query(
    `INSERT INTO employee_invites
     (partnership_id, full_name, email, status, invite_role, invite_token, invite_code)
     VALUES (1, 'Legacy Employee', 'legacy@example.com', 'invited', 'employee', 'legacy-raw-token', '123456')`,
  );
  await connection.query(
    `INSERT INTO resource_recommendation_rules
     (resource_id, readiness_level, rule_label, is_active)
     VALUES (77, 'Ready', 'Legacy unowned rule', 1)`,
  );

  await emergencyMigration.up(connection);

  const [[invite]] = await connection.query(
    "SELECT invite_token, invite_code, invite_token_hash, invite_code_hash FROM employee_invites WHERE email = 'legacy@example.com'",
  );
  assert.equal(invite.invite_token, null);
  assert.equal(invite.invite_code, null);
  assert.equal(invite.invite_token_hash, hashOpaqueToken("legacy-raw-token"));
  assert.equal(invite.invite_code_hash, hashOpaqueToken("123456"));

  const [columns] = await connection.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'resource_recommendation_rules' AND COLUMN_NAME = 'team_id'`,
    [database],
  );
  assert.equal(columns.length, 1);

  const [[legacyRule]] = await connection.query(
    "SELECT team_id, is_active FROM resource_recommendation_rules WHERE rule_label = 'Legacy unowned rule'",
  );
  assert.equal(legacyRule.team_id, null);
  assert.equal(Number(legacyRule.is_active), 0);
});

test("recommendation ownership query excludes another HBT team's rules", async () => {
  await connection.query(
    `INSERT INTO resource_recommendation_rules
     (resource_id, team_id, rule_label, is_active)
     VALUES
       (100, NULL, 'Admin global rule', 1),
       (101, 1, 'Team A rule', 1),
       (102, 2, 'Team B rule', 1)`,
  );

  const [visibleToTeamA] = await connection.query(
    `SELECT rule_label
     FROM resource_recommendation_rules
     WHERE is_active = 1 AND (team_id IS NULL OR team_id = ?)
     ORDER BY id`,
    [1],
  );

  assert.deepEqual(visibleToTeamA.map((row) => row.rule_label), ["Admin global rule", "Team A rule"]);
});

test("shared invitation lifecycle stores hashes only and returns credentials once", async () => {
  await connection.beginTransaction();
  const created = await createOrRefreshEmployeeInvite(connection, {
    partnershipId: 1,
    invitedByUserId: null,
    fullName: "Secure Employee",
    email: "secure@example.com",
    expiresDays: 14,
  });
  await connection.commit();

  const [[stored]] = await connection.query(
    `SELECT invite_token, invite_code, invite_token_hash, invite_code_hash, status, invite_role
     FROM employee_invites WHERE partnership_id = 1 AND email = 'secure@example.com'`,
  );

  assert.equal(stored.invite_token, null);
  assert.equal(stored.invite_code, null);
  assert.equal(stored.status, "invited");
  assert.equal(stored.invite_role, "employee");
  assert.match(stored.invite_token_hash, /^[a-f0-9]{64}$/);
  assert.match(stored.invite_code_hash, /^[a-f0-9]{64}$/);

  const encodedToken = created.delivery.invite_link.split("/invite/").pop();
  const rawToken = decodeURIComponent(encodedToken);
  assert.equal(stored.invite_token_hash, hashOpaqueToken(rawToken));
  assert.equal(stored.invite_code_hash, hashOpaqueToken(created.delivery.invite_code));
});

test("HBT Member activation stores only a token hash", async () => {
  const [member] = await connection.query(
    `INSERT INTO users
     (full_name, email, password, role, team_id, is_active)
     VALUES ('Pending HBT Member', 'member@example.com', 'unusable-test-hash', 'hbt_member', 1, 0)`,
  );

  await connection.beginTransaction();
  const delivery = await createActivationInvitation(connection, {
    userId: member.insertId,
    email: "member@example.com",
    targetRole: "hbt_member",
    teamId: 1,
    createdByUserId: null,
    ttlHours: 24,
  });
  await connection.commit();

  const [[stored]] = await connection.query(
    `SELECT token_hash, status, target_role, team_id
     FROM account_activation_invitations
     WHERE user_id = ?`,
    [member.insertId],
  );
  const encodedToken = delivery.activation_url.split("/activate/").pop();
  const rawToken = decodeURIComponent(encodedToken);

  assert.equal(stored.token_hash, hashOpaqueToken(rawToken));
  assert.equal(stored.status, "pending");
  assert.equal(stored.target_role, "hbt_member");
  assert.equal(Number(stored.team_id), 1);
  assert.equal(Object.hasOwn(stored, "token"), false);
});

test("batch revocation revokes only pending invitations and preserves registered users", async () => {
  const [batch] = await connection.query(
    `INSERT INTO enrollment_batches (partnership_id, original_filename, status)
     VALUES (1, 'employees.csv', 'active')`,
  );

  await connection.beginTransaction();
  await createOrRefreshEmployeeInvite(connection, {
    partnershipId: 1,
    enrollmentBatchId: batch.insertId,
    fullName: "Pending Employee",
    email: "pending@example.com",
  });
  await createOrRefreshEmployeeInvite(connection, {
    partnershipId: 1,
    enrollmentBatchId: batch.insertId,
    fullName: "Registered Employee",
    email: "registered@example.com",
  });
  await connection.commit();

  const [user] = await connection.query(
    `INSERT INTO users
     (full_name, email, password, role, partnership_id, enrollment_batch_id, is_active)
     VALUES ('Registered Employee', 'registered@example.com', 'unimportant-test-hash', 'employee', 1, ?, 1)`,
    [batch.insertId],
  );
  await connection.query(
    `UPDATE employee_invites
     SET status = 'registered', registered_user_id = ?, registered_at = NOW(),
         invite_token_hash = NULL, invite_code_hash = NULL
     WHERE partnership_id = 1 AND email = 'registered@example.com'`,
    [user.insertId],
  );

  await connection.beginTransaction();
  const revoked = await revokePendingBatchInvites(connection, {
    batchId: batch.insertId,
    partnershipId: 1,
  });
  await connection.commit();

  assert.equal(revoked, 1);

  const [[pending]] = await connection.query(
    "SELECT status, invite_token_hash, invite_code_hash FROM employee_invites WHERE email = 'pending@example.com'",
  );
  const [[registered]] = await connection.query(
    "SELECT status FROM employee_invites WHERE email = 'registered@example.com'",
  );
  const [[registeredUser]] = await connection.query(
    "SELECT COUNT(*) AS total FROM users WHERE id = ? AND email = 'registered@example.com'",
    [user.insertId],
  );

  assert.equal(pending.status, "revoked");
  assert.equal(pending.invite_token_hash, null);
  assert.equal(pending.invite_code_hash, null);
  assert.equal(registered.status, "registered");
  assert.equal(Number(registeredUser.total), 1);
});
