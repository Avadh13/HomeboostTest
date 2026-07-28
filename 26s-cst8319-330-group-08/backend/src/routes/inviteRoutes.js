const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");
const { validateActivationPassword } = require("../services/accountActivationService");
const {
  createInviteCredentials,
  findInviteByCredential,
  inviteStateError,
  publicInvitePayload,
  deliveryPayload,
} = require("../services/inviteSecurityService");
const { recordAuditEvent } = require("../services/auditLogService");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const companyRoles = ["company", "company_admin"];
const canInvite = (user) => adminRoles.includes(user?.role) || user?.role === "hbt_admin" || companyRoles.includes(user?.role);
const allowedInviteRoles = new Set(["employee", "company", "company_admin"]);
const clean = (value, max = 255) => String(value || "").trim().slice(0, max);
const emailClean = (value) => clean(value, 255).toLowerCase();
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const ensureInviteTables = async () => undefined;

const requirePartnershipAccess = async (user, partnershipId, connection = pool) => {
  const id = Number(partnershipId);
  if (!id) return false;
  if (adminRoles.includes(user?.role)) return true;
  if (companyRoles.includes(user?.role)) return Number(user.partnership_id) === id;
  if (user?.role === "hbt_admin" && user.team_id) {
    const [[partnership]] = await connection.query(
      "SELECT team_id FROM partnerships WHERE id = ? LIMIT 1",
      [id],
    );
    return Number(partnership?.team_id) === Number(user.team_id);
  }
  return false;
};

const logInvite = async (connection, inviteId, action, actorUserId = null, message = null) => {
  await connection.query(
    "INSERT INTO invite_logs (invite_id, action, actor_user_id, message) VALUES (?, ?, ?, ?)",
    [inviteId, action, actorUserId, message],
  );
};

router.get("/validate/:token", async (req, res) => {
  try {
    const invite = await findInviteByCredential(pool, req.params.token);
    const stateError = inviteStateError(invite);
    if (stateError) {
      return res.status(stateError.status).json({ status: "error", message: stateError.message });
    }
    if (invite.partnership_status !== "active") {
      return res.status(410).json({ status: "error", message: "Employer portal is not active" });
    }

    return res.json({ status: "success", invite: publicInvitePayload(invite) });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to validate invite" });
  }
});

router.post("/accept", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const credential = clean(req.body.token, 200);
    const fullName = clean(req.body.full_name, 255);
    const password = String(req.body.password || "");
    if (!credential || !fullName) {
      return res.status(400).json({ status: "error", message: "Token and full name are required" });
    }
    const passwordError = validateActivationPassword(password);
    if (passwordError) {
      return res.status(400).json({ status: "error", message: passwordError });
    }

    await connection.beginTransaction();
    const invite = await findInviteByCredential(connection, credential, { forUpdate: true });
    const stateError = inviteStateError(invite);
    if (stateError) {
      await connection.rollback();
      return res.status(stateError.status).json({ status: "error", message: stateError.message });
    }
    if (invite.partnership_status !== "active") {
      await connection.rollback();
      return res.status(410).json({ status: "error", message: "Employer portal is not active" });
    }

    const [[existingUser]] = await connection.query(
      "SELECT id, role FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
      [invite.email],
    );
    if (existingUser) {
      await connection.rollback();
      return res.status(409).json({ status: "error", message: "This email already has an account. Please sign in." });
    }

    const inviteRole = allowedInviteRoles.has(invite.invite_role) ? invite.invite_role : "employee";
    const hash = await bcrypt.hash(password, 12);
    const [userResult] = await connection.query(
      `INSERT INTO users
       (full_name, email, password, role, partnership_id, is_active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [fullName, invite.email, hash, inviteRole, invite.partnership_id],
    );

    const [inviteUpdate] = await connection.query(
      `UPDATE employee_invites
       SET status = 'registered',
           registered_user_id = ?,
           registered_at = NOW(),
           accepted_at = NOW(),
           invite_token_hash = NULL,
           invite_code_hash = NULL,
           invite_token = NULL,
           invite_code = NULL
       WHERE id = ? AND status = 'invited'`,
      [userResult.insertId, invite.id],
    );
    if (Number(inviteUpdate.affectedRows || 0) !== 1) {
      throw new Error("Invite state changed during acceptance");
    }

    await logInvite(connection, invite.id, "accepted", userResult.insertId, `${inviteRole} accepted invite`);

    if (inviteRole === "company" || inviteRole === "company_admin") {
      await connection.query(
        `UPDATE company_points_of_contact
         SET user_id = ?, is_active = 1
         WHERE partnership_id = ? AND email = ?`,
        [userResult.insertId, invite.partnership_id, invite.email],
      );
    }

    await recordAuditEvent({
      connection,
      req,
      actorUserId: userResult.insertId,
      actorRole: inviteRole,
      action: "invite.accepted",
      entityType: "employee_invite",
      entityId: invite.id,
      teamId: invite.team_id,
      partnershipId: invite.partnership_id,
      metadata: { invite_role: inviteRole },
    });
    await connection.commit();

    const redirectTo = inviteRole === "employee" ? "/employee-portal" : "/company/dashboard";
    const authToken = jwt.sign(
      { id: userResult.insertId, role: inviteRole, partnership_id: invite.partnership_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
    );
    return res.status(201).json({
      status: "success",
      message: inviteRole === "employee" ? "Employee account created" : "Company Manager account created",
      token: authToken,
      redirect_to: redirectTo,
      user: {
        id: userResult.insertId,
        full_name: fullName,
        email: invite.email,
        role: inviteRole,
        partnership_id: invite.partnership_id,
      },
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to accept invite" });
  } finally {
    connection.release();
  }
});

router.use(protect);

router.get("/", async (req, res) => {
  try {
    if (!canInvite(req.user)) {
      return res.status(403).json({ status: "error", message: "Invite access required" });
    }

    const params = [];
    let clause = "WHERE 1=1";
    if (companyRoles.includes(req.user.role)) {
      clause += " AND ei.partnership_id = ?";
      params.push(req.user.partnership_id);
    } else if (req.user.role === "hbt_admin") {
      if (!req.user.team_id) {
        return res.status(403).json({ status: "error", message: "HBT account is not linked to a team" });
      }
      clause += " AND p.team_id = ?";
      params.push(req.user.team_id);
    }

    const [invites] = await pool.query(
      `SELECT
         ei.id,
         ei.partnership_id,
         ei.registered_user_id,
         ei.full_name,
         ei.email,
         ei.status,
         ei.invite_role,
         ei.expires_at,
         ei.accepted_at,
         ei.last_sent_at,
         ei.created_at,
         ei.registered_at,
         ei.revoked_at,
         e.name AS employer_name,
         p.slug AS partnership_slug
       FROM employee_invites ei
       JOIN partnerships p ON p.id = ei.partnership_id
       LEFT JOIN employers e ON e.id = p.employer_id
       ${clause}
       ORDER BY ei.id DESC
       LIMIT 300`,
      params,
    );
    return res.json({ status: "success", invites: invites.map(publicInvitePayload) });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load invites" });
  }
});

router.post("/employee", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (!canInvite(req.user)) {
      return res.status(403).json({ status: "error", message: "Invite access required" });
    }

    const partnershipId = Number(req.body.partnership_id || req.user.partnership_id);
    const fullName = clean(req.body.full_name, 255);
    const email = emailClean(req.body.email);
    if (!partnershipId || !fullName || !isEmail(email)) {
      return res.status(400).json({ status: "error", message: "Valid partnership, full name, and email are required" });
    }
    if (!(await requirePartnershipAccess(req.user, partnershipId, connection))) {
      return res.status(404).json({ status: "error", message: "Partnership not found" });
    }

    const expiresDays = Math.min(Math.max(Number(req.body.expires_days || 14), 1), 30);
    const credentials = createInviteCredentials();

    await connection.beginTransaction();
    const [[account]] = await connection.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
      [email],
    );
    if (account) {
      await connection.rollback();
      return res.status(409).json({ status: "error", message: "This email already has an account" });
    }

    const [[existingInvite]] = await connection.query(
      `SELECT id, status FROM employee_invites
       WHERE partnership_id = ? AND email = ?
       LIMIT 1 FOR UPDATE`,
      [partnershipId, email],
    );
    if (existingInvite?.status === "registered") {
      await connection.rollback();
      return res.status(409).json({ status: "error", message: "This invite has already been registered" });
    }

    await connection.query(
      `INSERT INTO employee_invites
       (partnership_id, invited_by_user_id, full_name, email, status, invite_role,
        invite_token, invite_code, invite_token_hash, invite_code_hash,
        expires_at, last_sent_at, revoked_at)
       VALUES (?, ?, ?, ?, 'invited', 'employee', NULL, NULL, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), NOW(), NULL)
       ON DUPLICATE KEY UPDATE
         full_name = VALUES(full_name),
         invited_by_user_id = VALUES(invited_by_user_id),
         status = 'invited',
         invite_role = 'employee',
         invite_token = NULL,
         invite_code = NULL,
         invite_token_hash = VALUES(invite_token_hash),
         invite_code_hash = VALUES(invite_code_hash),
         expires_at = VALUES(expires_at),
         revoked_at = NULL,
         last_sent_at = NOW()`,
      [partnershipId, req.user.id, fullName, email, credentials.tokenHash, credentials.codeHash, expiresDays],
    );

    const [[invite]] = await connection.query(
      `SELECT ei.*, p.team_id, p.status AS partnership_status, p.slug AS partnership_slug,
              e.name AS employer_name
       FROM employee_invites ei
       JOIN partnerships p ON p.id = ei.partnership_id
       LEFT JOIN employers e ON e.id = p.employer_id
       WHERE ei.partnership_id = ? AND ei.email = ?
       LIMIT 1`,
      [partnershipId, email],
    );
    await logInvite(connection, invite.id, "created", req.user.id, "Employee invite generated");
    await recordAuditEvent({
      connection,
      req,
      action: "invite.created",
      entityType: "employee_invite",
      entityId: invite.id,
      teamId: invite.team_id,
      partnershipId,
      metadata: { invite_role: "employee", expires_days: expiresDays },
    });
    await connection.commit();

    return res.status(201).json({
      status: "success",
      message: "Employee invite created",
      invite: publicInvitePayload(invite),
      delivery: deliveryPayload(invite, credentials),
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to create invite" });
  } finally {
    connection.release();
  }
});

router.post("/resend/:id", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (!canInvite(req.user)) {
      return res.status(403).json({ status: "error", message: "Invite access required" });
    }

    await connection.beginTransaction();
    const [[invite]] = await connection.query(
      `SELECT ei.*, p.team_id, p.status AS partnership_status, p.slug AS partnership_slug,
              e.name AS employer_name
       FROM employee_invites ei
       JOIN partnerships p ON p.id = ei.partnership_id
       LEFT JOIN employers e ON e.id = p.employer_id
       WHERE ei.id = ?
       LIMIT 1 FOR UPDATE`,
      [req.params.id],
    );
    if (!invite || !(await requirePartnershipAccess(req.user, invite.partnership_id, connection))) {
      await connection.rollback();
      return res.status(404).json({ status: "error", message: "Invite not found" });
    }
    if (invite.status === "registered") {
      await connection.rollback();
      return res.status(409).json({ status: "error", message: "Registered invite cannot be resent" });
    }

    const credentials = createInviteCredentials();
    await connection.query(
      `UPDATE employee_invites
       SET invite_token = NULL,
           invite_code = NULL,
           invite_token_hash = ?,
           invite_code_hash = ?,
           expires_at = DATE_ADD(NOW(), INTERVAL 14 DAY),
           last_sent_at = NOW(),
           status = 'invited',
           revoked_at = NULL
       WHERE id = ?`,
      [credentials.tokenHash, credentials.codeHash, invite.id],
    );
    await logInvite(connection, invite.id, "resent", req.user.id, `${invite.invite_role || "employee"} invite regenerated`);
    await recordAuditEvent({
      connection,
      req,
      action: "invite.resent",
      entityType: "employee_invite",
      entityId: invite.id,
      teamId: invite.team_id,
      partnershipId: invite.partnership_id,
      metadata: { invite_role: invite.invite_role || "employee" },
    });
    await connection.commit();

    return res.json({
      status: "success",
      message: "Invite regenerated",
      invite: publicInvitePayload({ ...invite, status: "invited" }),
      delivery: deliveryPayload({ ...invite, status: "invited" }, credentials),
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to resend invite" });
  } finally {
    connection.release();
  }
});

router.post("/revoke/:id", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (!canInvite(req.user)) {
      return res.status(403).json({ status: "error", message: "Invite access required" });
    }

    await connection.beginTransaction();
    const [[invite]] = await connection.query(
      `SELECT ei.*, p.team_id
       FROM employee_invites ei
       JOIN partnerships p ON p.id = ei.partnership_id
       WHERE ei.id = ?
       LIMIT 1 FOR UPDATE`,
      [req.params.id],
    );
    if (!invite || !(await requirePartnershipAccess(req.user, invite.partnership_id, connection))) {
      await connection.rollback();
      return res.status(404).json({ status: "error", message: "Invite not found" });
    }
    if (invite.status === "registered") {
      await connection.rollback();
      return res.status(409).json({ status: "error", message: "Registered invite cannot be revoked" });
    }

    const [result] = await connection.query(
      `UPDATE employee_invites
       SET status = 'revoked',
           revoked_at = NOW(),
           invite_token_hash = NULL,
           invite_code_hash = NULL,
           invite_token = NULL,
           invite_code = NULL
       WHERE id = ? AND status <> 'registered'`,
      [invite.id],
    );
    if (Number(result.affectedRows || 0) !== 1) {
      throw new Error("Invite revoke failed");
    }

    await logInvite(connection, invite.id, "revoked", req.user.id, "Invite revoked");
    await recordAuditEvent({
      connection,
      req,
      action: "invite.revoked",
      entityType: "employee_invite",
      entityId: invite.id,
      teamId: invite.team_id,
      partnershipId: invite.partnership_id,
      metadata: { invite_role: invite.invite_role || "employee" },
    });
    await connection.commit();

    return res.json({ status: "success", message: "Invite revoked" });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to revoke invite" });
  } finally {
    connection.release();
  }
});

module.exports = router;
module.exports.ensureInviteTables = ensureInviteTables;
module.exports.requirePartnershipAccess = requirePartnershipAccess;
