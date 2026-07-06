const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const hbtRoles = ["hbt_admin", "hbt_member"];
const canInvite = (user) => adminRoles.includes(user?.role) || user?.role === "hbt_admin" || user?.role === "company" || user?.role === "company_admin";
const clean = (value, max = 255) => String(value || "").trim().slice(0, max);
const emailClean = (value) => clean(value, 255).toLowerCase();
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const appUrl = () => (process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");
const tokenValue = () => crypto.randomBytes(24).toString("hex");
const codeValue = () => Math.floor(100000 + Math.random() * 900000).toString();

const columnExists = async (connection, tableName, columnName) => {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [tableName, columnName]
  );
  return rows.length > 0;
};

const addColumnIfMissing = async (connection, tableName, columnName, definition) => {
  if (!(await columnExists(connection, tableName, columnName))) {
    await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

const ensureInviteTables = async (connection = pool) => {
  await connection.query(`CREATE TABLE IF NOT EXISTS employee_invites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partnership_id INT NOT NULL,
    enrollment_batch_id INT NULL,
    invited_by_user_id INT NULL,
    registered_user_id INT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    status ENUM('invited', 'registered', 'revoked') NOT NULL DEFAULT 'invited',
    invite_token VARCHAR(120) NULL,
    invite_code VARCHAR(40) NULL,
    expires_at DATETIME NULL,
    accepted_at DATETIME NULL,
    last_sent_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    registered_at DATETIME NULL,
    revoked_at DATETIME NULL,
    UNIQUE KEY uq_employee_invite_partnership_email (partnership_id, email),
    INDEX idx_employee_invites_email (email),
    INDEX idx_employee_invites_status (status)
  )`);

  await addColumnIfMissing(connection, "employee_invites", "invite_token", "VARCHAR(120) NULL");
  await addColumnIfMissing(connection, "employee_invites", "invite_code", "VARCHAR(40) NULL");
  await addColumnIfMissing(connection, "employee_invites", "expires_at", "DATETIME NULL");
  await addColumnIfMissing(connection, "employee_invites", "accepted_at", "DATETIME NULL");
  await addColumnIfMissing(connection, "employee_invites", "last_sent_at", "DATETIME NULL");

  await connection.query(`CREATE TABLE IF NOT EXISTS invite_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invite_id INT NOT NULL,
    action VARCHAR(80) NOT NULL,
    actor_user_id INT NULL,
    message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_invite_logs_invite (invite_id),
    INDEX idx_invite_logs_action (action)
  )`);
};

const logInvite = async (inviteId, action, actorUserId = null, message = null) => {
  await pool.query("INSERT INTO invite_logs (invite_id, action, actor_user_id, message) VALUES (?, ?, ?, ?)", [inviteId, action, actorUserId, message]);
};

const requirePartnershipAccess = async (user, partnershipId) => {
  if (adminRoles.includes(user.role)) return true;
  if ((user.role === "company" || user.role === "company_admin") && Number(user.partnership_id) === Number(partnershipId)) return true;
  if (user.role === "hbt_admin") {
    const [[partnership]] = await pool.query("SELECT team_id FROM partnerships WHERE id = ? LIMIT 1", [partnershipId]);
    return Number(partnership?.team_id) === Number(user.team_id);
  }
  return false;
};

const invitePayload = (invite) => ({
  id: invite.id,
  full_name: invite.full_name,
  email: invite.email,
  status: invite.status,
  partnership_id: invite.partnership_id,
  invite_code: invite.invite_code,
  invite_link: invite.invite_token ? `${appUrl()}/invite/${invite.invite_token}` : null,
  expires_at: invite.expires_at,
  created_at: invite.created_at,
});

router.get("/validate/:token", async (req, res) => {
  try {
    await ensureInviteTables();
    const [[invite]] = await pool.query(
      `SELECT ei.*, p.slug AS partnership_slug, e.name AS employer_name
       FROM employee_invites ei
       LEFT JOIN partnerships p ON p.id = ei.partnership_id
       LEFT JOIN employers e ON e.id = p.employer_id
       WHERE ei.invite_token = ? OR ei.invite_code = ?
       LIMIT 1`,
      [req.params.token, req.params.token]
    );
    if (!invite) return res.status(404).json({ status: "error", message: "Invite not found" });
    if (invite.status === "revoked") return res.status(403).json({ status: "error", message: "Invite has been revoked" });
    if (invite.status === "registered") return res.status(409).json({ status: "error", message: "Invite already used" });
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) return res.status(410).json({ status: "error", message: "Invite has expired" });
    return res.json({ status: "success", invite: { ...invitePayload(invite), employer_name: invite.employer_name, partnership_slug: invite.partnership_slug } });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to validate invite", error: error.message });
  }
});

router.post("/accept", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await ensureInviteTables(connection);
    const token = clean(req.body.token, 120);
    const fullName = clean(req.body.full_name, 255);
    const password = String(req.body.password || "");
    if (!token || !fullName || password.length < 6) return res.status(400).json({ status: "error", message: "Token, full name, and password are required" });

    await connection.beginTransaction();
    const [[invite]] = await connection.query("SELECT * FROM employee_invites WHERE invite_token = ? OR invite_code = ? LIMIT 1", [token, token]);
    if (!invite) {
      await connection.rollback();
      return res.status(404).json({ status: "error", message: "Invite not found" });
    }
    if (invite.status !== "invited") {
      await connection.rollback();
      return res.status(409).json({ status: "error", message: "Invite is not available" });
    }
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      await connection.rollback();
      return res.status(410).json({ status: "error", message: "Invite has expired" });
    }

    const [existing] = await connection.query("SELECT id FROM users WHERE email = ? LIMIT 1", [invite.email]);
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({ status: "error", message: "This email already has an account. Please sign in." });
    }

    const hash = await bcrypt.hash(password, 10);
    const [userResult] = await connection.query(
      `INSERT INTO users (full_name, email, password, role, partnership_id, is_active) VALUES (?, ?, ?, 'employee', ?, 1)`,
      [fullName, invite.email, hash, invite.partnership_id]
    );

    await connection.query(
      `UPDATE employee_invites SET status = 'registered', registered_user_id = ?, registered_at = NOW(), accepted_at = NOW() WHERE id = ?`,
      [userResult.insertId, invite.id]
    );
    await connection.query("INSERT INTO invite_logs (invite_id, action, actor_user_id, message) VALUES (?, 'accepted', ?, ?)", [invite.id, userResult.insertId, "Employee accepted invite link"]);
    await connection.commit();

    const tokenJwt = jwt.sign({ id: userResult.insertId, role: "employee", partnership_id: invite.partnership_id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "1d" });
    return res.status(201).json({ status: "success", message: "Employee account created", token: tokenJwt, redirect_to: "/employee-portal", user: { id: userResult.insertId, full_name: fullName, email: invite.email, role: "employee", partnership_id: invite.partnership_id } });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to accept invite", error: error.message });
  } finally {
    connection.release();
  }
});

router.use(protect);

router.get("/", async (req, res) => {
  try {
    if (!canInvite(req.user)) return res.status(403).json({ status: "error", message: "Invite access required" });
    await ensureInviteTables();
    const params = [];
    let clause = "WHERE 1=1";
    if (req.user.role === "company" || req.user.role === "company_admin") {
      clause += " AND ei.partnership_id = ?";
      params.push(req.user.partnership_id);
    } else if (req.user.role === "hbt_admin") {
      clause += " AND p.team_id = ?";
      params.push(req.user.team_id);
    }
    const [invites] = await pool.query(
      `SELECT ei.*, e.name AS employer_name, p.slug AS partnership_slug
       FROM employee_invites ei
       LEFT JOIN partnerships p ON p.id = ei.partnership_id
       LEFT JOIN employers e ON e.id = p.employer_id
       ${clause}
       ORDER BY ei.id DESC
       LIMIT 300`,
      params
    );
    return res.json({ status: "success", invites: invites.map(invitePayload) });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load invites", error: error.message });
  }
});

router.post("/employee", async (req, res) => {
  try {
    if (!canInvite(req.user)) return res.status(403).json({ status: "error", message: "Invite access required" });
    await ensureInviteTables();
    const partnershipId = Number(req.body.partnership_id || req.user.partnership_id);
    const fullName = clean(req.body.full_name, 255);
    const email = emailClean(req.body.email);
    if (!partnershipId || !fullName || !isEmail(email)) return res.status(400).json({ status: "error", message: "Valid partnership, full name, and email are required" });
    if (!(await requirePartnershipAccess(req.user, partnershipId))) return res.status(403).json({ status: "error", message: "Not allowed to invite for this partnership" });

    const inviteToken = tokenValue();
    const inviteCode = codeValue();
    const expiresDays = Number(req.body.expires_days || 14);
    await pool.query(
      `INSERT INTO employee_invites (partnership_id, invited_by_user_id, full_name, email, status, invite_token, invite_code, expires_at, last_sent_at)
       VALUES (?, ?, ?, ?, 'invited', ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), NOW())
       ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), invited_by_user_id = VALUES(invited_by_user_id), status = IF(status = 'registered', 'registered', 'invited'), invite_token = VALUES(invite_token), invite_code = VALUES(invite_code), expires_at = VALUES(expires_at), revoked_at = NULL, last_sent_at = NOW()`,
      [partnershipId, req.user.id, fullName, email, inviteToken, inviteCode, expiresDays]
    );

    const [[invite]] = await pool.query("SELECT * FROM employee_invites WHERE partnership_id = ? AND email = ? LIMIT 1", [partnershipId, email]);
    await logInvite(invite.id, "created", req.user.id, "Invite link generated");
    return res.status(201).json({ status: "success", message: "Employee invite created", invite: invitePayload(invite) });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to create invite", error: error.message });
  }
});

router.post("/resend/:id", async (req, res) => {
  try {
    if (!canInvite(req.user)) return res.status(403).json({ status: "error", message: "Invite access required" });
    await ensureInviteTables();
    const [[invite]] = await pool.query("SELECT * FROM employee_invites WHERE id = ? LIMIT 1", [req.params.id]);
    if (!invite) return res.status(404).json({ status: "error", message: "Invite not found" });
    if (!(await requirePartnershipAccess(req.user, invite.partnership_id))) return res.status(403).json({ status: "error", message: "Not allowed to resend this invite" });
    const inviteToken = tokenValue();
    const inviteCode = codeValue();
    await pool.query("UPDATE employee_invites SET invite_token = ?, invite_code = ?, expires_at = DATE_ADD(NOW(), INTERVAL 14 DAY), last_sent_at = NOW(), status = IF(status = 'registered', 'registered', 'invited') WHERE id = ?", [inviteToken, inviteCode, invite.id]);
    const [[updated]] = await pool.query("SELECT * FROM employee_invites WHERE id = ? LIMIT 1", [invite.id]);
    await logInvite(invite.id, "resent", req.user.id, "Invite link regenerated");
    return res.json({ status: "success", message: "Invite resent", invite: invitePayload(updated) });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to resend invite", error: error.message });
  }
});

module.exports = router;
module.exports.ensureInviteTables = ensureInviteTables;
