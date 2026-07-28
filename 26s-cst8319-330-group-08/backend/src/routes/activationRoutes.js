const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/roleMiddleware");
const {
  createActivationInvitation,
  getActivationByToken,
  validateActivationPassword,
  activationPublicPayload,
} = require("../services/accountActivationService");
const { recordAuditEvent } = require("../services/auditLogService");

const router = express.Router();
const clean = (value, max = 255) => String(value || "").trim().slice(0, max);

const activationStateError = (activation) => {
  if (!activation) return { status: 404, message: "Activation link is unavailable" };
  if (activation.status === "accepted" || Number(activation.is_active) === 1) {
    return { status: 409, message: "Activation link has already been used" };
  }
  if (activation.status !== "pending" || activation.revoked_at) {
    return { status: 410, message: "Activation link is no longer valid" };
  }
  if (new Date(activation.expires_at).getTime() <= Date.now()) {
    return { status: 410, message: "Activation link has expired" };
  }
  if (activation.user_role !== activation.target_role) {
    return { status: 409, message: "Account activation requires administrator review" };
  }
  return null;
};

router.get("/validate/:token", async (req, res) => {
  try {
    const activation = await getActivationByToken(pool, req.params.token);
    const stateError = activationStateError(activation);
    if (stateError) {
      return res.status(stateError.status).json({ status: "error", message: stateError.message });
    }

    return res.json({
      status: "success",
      activation: activationPublicPayload(activation),
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to validate activation link" });
  }
});

router.post("/accept", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const token = clean(req.body.token, 200);
    const password = String(req.body.password || "");
    const fullName = clean(req.body.full_name, 180);
    if (!token) return res.status(400).json({ status: "error", message: "Activation token is required" });

    const passwordError = validateActivationPassword(password);
    if (passwordError) return res.status(400).json({ status: "error", message: passwordError });

    await connection.beginTransaction();
    const activation = await getActivationByToken(connection, token, { forUpdate: true });
    const stateError = activationStateError(activation);
    if (stateError) {
      await connection.rollback();
      return res.status(stateError.status).json({ status: "error", message: stateError.message });
    }

    const hash = await bcrypt.hash(password, 12);
    const [userUpdate] = await connection.query(
      `UPDATE users
       SET password = ?, full_name = COALESCE(NULLIF(?, ''), full_name), is_active = 1
       WHERE id = ? AND role = ? AND is_active = 0`,
      [hash, fullName, activation.user_id, activation.target_role],
    );
    if (Number(userUpdate.affectedRows || 0) !== 1) {
      throw new Error("Activation user update failed");
    }

    await connection.query(
      `UPDATE account_activation_invitations
       SET status = 'accepted', accepted_at = NOW()
       WHERE id = ?`,
      [activation.id],
    );
    await connection.query(
      `UPDATE hbt_registrations
       SET status = 'portal_created'
       WHERE user_id = ? AND payment_status = 'paid'`,
      [activation.user_id],
    );

    await recordAuditEvent({
      connection,
      req,
      actorUserId: activation.user_id,
      actorRole: activation.target_role,
      action: "account.activation_completed",
      entityType: "user",
      entityId: activation.user_id,
      teamId: activation.team_id,
      partnershipId: activation.partnership_id,
      metadata: { activation_invitation_id: activation.id },
    });
    await connection.commit();

    const redirectTo = activation.target_role === "hbt_admin"
      ? "/hbt/dashboard"
      : activation.target_role === "employee"
        ? "/employee-portal"
        : "/company/dashboard";
    const authToken = jwt.sign(
      {
        id: activation.user_id,
        role: activation.target_role,
        team_id: activation.team_id || null,
        partnership_id: activation.partnership_id || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
    );

    return res.status(201).json({
      status: "success",
      message: "Account activated successfully",
      token: authToken,
      redirect_to: redirectTo,
      user: {
        id: activation.user_id,
        full_name: fullName || activation.full_name,
        email: activation.email,
        role: activation.target_role,
        team_id: activation.team_id || null,
        partnership_id: activation.partnership_id || null,
      },
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to activate account" });
  } finally {
    connection.release();
  }
});

router.use(protect, requireAdmin);

router.get("/admin/pending", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 300);
    const [activations] = await pool.query(
      `SELECT
         a.id,
         a.user_id,
         a.email,
         a.target_role,
         a.team_id,
         a.partnership_id,
         a.status,
         a.expires_at,
         a.created_at,
         u.full_name,
         h.name AS team_name,
         e.name AS employer_name
       FROM account_activation_invitations a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN home_buying_teams h ON h.id = a.team_id
       LEFT JOIN partnerships p ON p.id = a.partnership_id
       LEFT JOIN employers e ON e.id = p.employer_id
       WHERE a.status = 'pending' AND a.revoked_at IS NULL
       ORDER BY a.created_at DESC
       LIMIT ${limit}`,
    );
    return res.json({ status: "success", activations });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load pending activations" });
  }
});

router.post("/admin/users/:userId/resend", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ status: "error", message: "Invalid user ID" });

    await connection.beginTransaction();
    const [[user]] = await connection.query(
      `SELECT id, full_name, email, role, team_id, partnership_id, is_active
       FROM users
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [userId],
    );
    if (!user || Number(user.is_active) === 1) {
      await connection.rollback();
      return res.status(404).json({ status: "error", message: "Inactive account not found" });
    }

    const activation = await createActivationInvitation(connection, {
      userId: user.id,
      email: user.email,
      targetRole: user.role,
      teamId: user.team_id || null,
      partnershipId: user.partnership_id || null,
      createdByUserId: req.user.id,
    });
    await recordAuditEvent({
      connection,
      req,
      action: "account.activation_resent",
      entityType: "user",
      entityId: user.id,
      teamId: user.team_id,
      partnershipId: user.partnership_id,
      metadata: { target_role: user.role },
    });
    await connection.commit();

    return res.status(201).json({
      status: "success",
      message: "A new activation link was generated",
      activation_link: activation.activation_url,
      expires_in_hours: activation.expires_in_hours,
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to generate activation link" });
  } finally {
    connection.release();
  }
});

module.exports = router;
