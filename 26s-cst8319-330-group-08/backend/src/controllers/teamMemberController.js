const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { createActivationInvitation } = require("../services/accountActivationService");
const { recordAuditEvent } = require("../services/auditLogService");

const canManageTeam = (req, targetTeamId) => {
  if (!req.user) return false;

  if (req.user.role === "admin" || req.user.role === "super_admin") {
    return true;
  }

  if (req.user.role === "hbt_admin") {
    return Number(req.user.team_id) === Number(targetTeamId);
  }

  return false;
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizeText = (value) => String(value || "").trim();
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const createUnusablePasswordHash = async () => {
  const bootstrapSecret = crypto.randomBytes(48).toString("base64url");
  return bcrypt.hash(bootstrapSecret, 12);
};

exports.getTeamMembers = async (req, res) => {
  try {
    let teamId = null;

    if (req.user.role === "hbt_admin" || req.user.role === "hbt_member") {
      teamId = req.user.team_id;
    } else {
      teamId = req.query.team_id || null;
    }

    const sql = teamId
      ? `SELECT
          tm.*,
          h.name AS team_name,
          u.email AS login_email,
          u.role AS login_role,
          u.is_active AS login_active
         FROM team_members tm
         LEFT JOIN home_buying_teams h ON tm.team_id = h.id
         LEFT JOIN users u ON tm.user_id = u.id
         WHERE tm.team_id = ?
         ORDER BY tm.id DESC`
      : `SELECT
          tm.*,
          h.name AS team_name,
          u.email AS login_email,
          u.role AS login_role,
          u.is_active AS login_active
         FROM team_members tm
         LEFT JOIN home_buying_teams h ON tm.team_id = h.id
         LEFT JOIN users u ON tm.user_id = u.id
         ORDER BY tm.id DESC`;

    const params = teamId ? [teamId] : [];
    const [members] = await pool.query(sql, params);
    return res.json(members);
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load team members" });
  }
};

exports.createTeamMember = async (req, res) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    const teamId = req.user?.role === "hbt_admin" ? req.user.team_id : req.body.team_id || req.user?.team_id;
    const fullName = normalizeText(req.body.full_name);
    const email = normalizeEmail(req.body.email);
    const title = normalizeText(req.body.title || req.body.role_title) || "HBT Team Member";
    const phone = normalizeText(req.body.phone) || null;
    const photoUrl = normalizeText(req.body.photo_url) || null;
    const bookingLink = normalizeText(req.body.booking_link || req.body.booking_url) || null;
    const bio = normalizeText(req.body.bio) || null;

    if (!teamId || !fullName || !isValidEmail(email)) {
      return res.status(400).json({
        status: "error",
        message: "Team, full name, and a valid email are required",
      });
    }

    if (!canManageTeam(req, teamId)) {
      return res.status(403).json({
        status: "error",
        message: "You are not allowed to create members for this team",
      });
    }

    if (req.body.password) {
      return res.status(400).json({
        status: "error",
        code: "PASSWORD_NOT_ACCEPTED",
        message: "Do not set a password for a new HBT Member. The member must choose a password through their secure activation link.",
      });
    }

    await connection.beginTransaction();
    transactionStarted = true;

    const [[team]] = await connection.query(
      "SELECT id FROM home_buying_teams WHERE id = ? AND is_active = 1 LIMIT 1 FOR UPDATE",
      [teamId],
    );
    if (!team) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ status: "error", message: "Active HBT team not found" });
    }

    const [[existingUser]] = await connection.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
      [email],
    );
    if (existingUser) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({ status: "error", message: "A user with this email already exists" });
    }

    const unusablePasswordHash = await createUnusablePasswordHash();
    const [userResult] = await connection.query(
      `INSERT INTO users
       (full_name, email, password, role, team_id, is_active)
       VALUES (?, ?, ?, 'hbt_member', ?, 0)`,
      [fullName, email, unusablePasswordHash, teamId],
    );

    const userId = userResult.insertId;
    const [memberResult] = await connection.query(
      `INSERT INTO team_members
       (user_id, team_id, full_name, title, email, phone, photo_url, booking_link, bio, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [userId, teamId, fullName, title, email, phone, photoUrl, bookingLink, bio],
    );

    const activation = await createActivationInvitation(connection, {
      userId,
      email,
      targetRole: "hbt_member",
      teamId,
      createdByUserId: req.user.id,
    });

    await recordAuditEvent({
      connection,
      req,
      action: "hbt_member.activation_created",
      entityType: "user",
      entityId: userId,
      teamId,
      metadata: { team_member_id: memberResult.insertId, target_role: "hbt_member" },
    });

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      status: "success",
      message: "Team member created. Share the one-time activation link with the member.",
      member_id: memberResult.insertId,
      user_id: userId,
      activation: {
        email,
        role: "hbt_member",
        activation_link: activation.activation_url,
        expires_in_hours: activation.expires_in_hours,
      },
    });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to create team member" });
  } finally {
    connection.release();
  }
};

exports.updateTeamMember = async (req, res) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    const { id } = req.params;

    if (req.body.password && String(req.body.password).trim()) {
      return res.status(400).json({
        status: "error",
        code: "PASSWORD_SELF_SERVICE_REQUIRED",
        message: "HBT Member passwords cannot be set by another user. Resend activation for inactive accounts or have active members change their own password through the account-security workflow.",
      });
    }

    const [[existingMember]] = await connection.query(
      `SELECT tm.*, u.is_active AS login_active, u.email AS login_email
       FROM team_members tm
       LEFT JOIN users u ON u.id = tm.user_id
       WHERE tm.id = ?
       LIMIT 1`,
      [id],
    );

    if (!existingMember) {
      return res.status(404).json({ status: "error", message: "Team member not found" });
    }

    const finalTeamId = req.user?.role === "hbt_admin"
      ? req.user.team_id
      : req.body.team_id || existingMember.team_id;

    if (!canManageTeam(req, finalTeamId) || !canManageTeam(req, existingMember.team_id)) {
      return res.status(403).json({
        status: "error",
        message: "You are not allowed to update this team member",
      });
    }

    const fullName = normalizeText(req.body.full_name || existingMember.full_name);
    const email = normalizeEmail(req.body.email || existingMember.email || existingMember.login_email);
    if (!fullName || !isValidEmail(email)) {
      return res.status(400).json({ status: "error", message: "Valid full name and email are required" });
    }

    await connection.beginTransaction();
    transactionStarted = true;

    if (existingMember.user_id) {
      const [[emailOwner]] = await connection.query(
        "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1 FOR UPDATE",
        [email, existingMember.user_id],
      );
      if (emailOwner) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(409).json({ status: "error", message: "A user with this email already exists" });
      }
    }

    const requestedActive = Number(req.body.is_active ?? existingMember.is_active) === 1 ? 1 : 0;
    const canBeActive = Number(existingMember.login_active || 0) === 1;
    const finalActive = requestedActive && canBeActive ? 1 : 0;

    await connection.query(
      `UPDATE team_members
       SET team_id = ?,
           full_name = ?,
           title = ?,
           email = ?,
           phone = ?,
           photo_url = ?,
           booking_link = ?,
           bio = ?,
           is_active = ?
       WHERE id = ?`,
      [
        finalTeamId,
        fullName,
        normalizeText(req.body.title || req.body.role_title) || existingMember.title || null,
        email,
        normalizeText(req.body.phone) || null,
        normalizeText(req.body.photo_url) || null,
        normalizeText(req.body.booking_link || req.body.booking_url) || null,
        normalizeText(req.body.bio) || null,
        finalActive,
        id,
      ],
    );

    if (existingMember.user_id) {
      await connection.query(
        `UPDATE users
         SET full_name = ?, email = ?, team_id = ?, is_active = ?
         WHERE id = ? AND role = 'hbt_member'`,
        [fullName, email, finalTeamId, finalActive, existingMember.user_id],
      );
    }

    await recordAuditEvent({
      connection,
      req,
      action: "hbt_member.updated",
      entityType: "team_member",
      entityId: id,
      teamId: finalTeamId,
      metadata: { login_active: finalActive },
    });

    await connection.commit();
    transactionStarted = false;

    return res.json({
      status: "success",
      message: finalActive ? "Team member updated successfully" : "Team member updated; account remains pending activation or disabled",
    });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to update team member" });
  } finally {
    connection.release();
  }
};

exports.resendTeamMemberActivation = async (req, res) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    const { id } = req.params;
    await connection.beginTransaction();
    transactionStarted = true;

    const [[member]] = await connection.query(
      `SELECT tm.id, tm.team_id, tm.user_id, tm.full_name, tm.email,
              u.email AS login_email, u.role, u.is_active AS login_active
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.id = ? AND u.role = 'hbt_member'
       LIMIT 1
       FOR UPDATE`,
      [id],
    );

    if (!member || !canManageTeam(req, member.team_id)) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ status: "error", message: "Inactive HBT Member not found" });
    }

    if (Number(member.login_active) === 1) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({ status: "error", message: "This HBT Member account is already active" });
    }

    const activation = await createActivationInvitation(connection, {
      userId: member.user_id,
      email: member.login_email || member.email,
      targetRole: "hbt_member",
      teamId: member.team_id,
      createdByUserId: req.user.id,
    });

    await connection.query("UPDATE team_members SET is_active = 0 WHERE id = ?", [member.id]);
    await recordAuditEvent({
      connection,
      req,
      action: "hbt_member.activation_resent",
      entityType: "user",
      entityId: member.user_id,
      teamId: member.team_id,
      metadata: { team_member_id: member.id, target_role: "hbt_member" },
    });

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      status: "success",
      message: "A new activation link was generated",
      activation: {
        email: member.login_email || member.email,
        role: "hbt_member",
        activation_link: activation.activation_url,
        expires_in_hours: activation.expires_in_hours,
      },
    });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to generate activation link" });
  } finally {
    connection.release();
  }
};

exports.deleteTeamMember = async (req, res) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    const { id } = req.params;
    const [[member]] = await connection.query(
      "SELECT * FROM team_members WHERE id = ? LIMIT 1",
      [id],
    );

    if (!member) {
      return res.status(404).json({ status: "error", message: "Team member not found" });
    }

    if (!canManageTeam(req, member.team_id)) {
      return res.status(403).json({ status: "error", message: "You are not allowed to disable this team member" });
    }

    await connection.beginTransaction();
    transactionStarted = true;
    await connection.query("UPDATE team_members SET is_active = 0 WHERE id = ?", [id]);

    if (member.user_id) {
      await connection.query("UPDATE users SET is_active = 0 WHERE id = ? AND role = 'hbt_member'", [member.user_id]);
      await connection.query(
        `UPDATE account_activation_invitations
         SET status = 'revoked', revoked_at = NOW()
         WHERE user_id = ? AND status = 'pending'`,
        [member.user_id],
      );
    }

    await recordAuditEvent({
      connection,
      req,
      action: "hbt_member.disabled",
      entityType: "team_member",
      entityId: id,
      teamId: member.team_id,
      metadata: { user_id: member.user_id || null },
    });

    await connection.commit();
    transactionStarted = false;

    return res.json({ status: "success", message: "Team member disabled successfully" });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to disable team member" });
  } finally {
    connection.release();
  }
};

exports.getTeamMembersByTeam = async (req, res) => {
  try {
    const { teamId } = req.params;

    if (
      (req.user.role === "hbt_admin" || req.user.role === "hbt_member") &&
      Number(req.user.team_id) !== Number(teamId)
    ) {
      return res.status(403).json({
        status: "error",
        message: "You can only view your own team members",
      });
    }

    const [members] = await pool.query(
      `SELECT
        tm.*,
        h.name AS team_name,
        u.email AS login_email,
        u.role AS login_role,
        u.is_active AS login_active
       FROM team_members tm
       LEFT JOIN home_buying_teams h ON tm.team_id = h.id
       LEFT JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = ?
       AND tm.is_active = 1
       ORDER BY tm.id DESC`,
      [teamId],
    );

    return res.json(members);
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load team members" });
  }
};
