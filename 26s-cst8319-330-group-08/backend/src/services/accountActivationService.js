const crypto = require("crypto");
const pool = require("../config/db");
const { hashOpaqueToken } = require("./paymentSecurityService");

const appUrl = () => (process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");

const createActivationInvitation = async (
  connection,
  {
    userId,
    email,
    targetRole,
    teamId = null,
    partnershipId = null,
    createdByUserId = null,
    ttlHours = 336,
  },
) => {
  const id = Number(userId);
  if (!id || !email || !targetRole) throw new Error("Activation invitation context is incomplete");

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashOpaqueToken(token);
  const ttl = Math.min(Math.max(Number(ttlHours || 336), 1), 720);

  await connection.query(
    `UPDATE account_activation_invitations
     SET status = 'revoked', revoked_at = NOW()
     WHERE user_id = ? AND status = 'pending'`,
    [id],
  );

  await connection.query(
    `INSERT INTO account_activation_invitations
     (user_id, email, target_role, team_id, partnership_id, token_hash, status, expires_at, created_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', DATE_ADD(NOW(), INTERVAL ? HOUR), ?)`,
    [
      id,
      String(email).trim().toLowerCase(),
      targetRole,
      teamId,
      partnershipId,
      tokenHash,
      ttl,
      createdByUserId,
    ],
  );

  return {
    token,
    activation_url: `${appUrl()}/activate/${encodeURIComponent(token)}`,
    expires_in_hours: ttl,
  };
};

const getActivationByToken = async (connection, token, options = {}) => {
  const value = String(token || "").trim();
  if (value.length < 32 || value.length > 200) return null;
  const tokenHash = hashOpaqueToken(value);
  const lock = options.forUpdate ? " FOR UPDATE" : "";

  const [[activation]] = await connection.query(
    `SELECT
       a.*,
       u.full_name,
       u.role AS user_role,
       u.is_active,
       h.name AS team_name,
       e.name AS employer_name
     FROM account_activation_invitations a
     JOIN users u ON u.id = a.user_id
     LEFT JOIN home_buying_teams h ON h.id = a.team_id
     LEFT JOIN partnerships p ON p.id = a.partnership_id
     LEFT JOIN employers e ON e.id = p.employer_id
     WHERE a.token_hash = ?
     LIMIT 1${lock}`,
    [tokenHash],
  );
  return activation || null;
};

const maskEmail = (email) => {
  const value = String(email || "").trim();
  const [local, domain] = value.split("@");
  if (!local || !domain) return "hidden";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 2))}@${domain}`;
};

const validateActivationPassword = (password) => {
  const value = String(password || "");
  if (value.length < 8) return "Password must be at least 8 characters";
  if (!/[a-z]/.test(value)) return "Password must include a lowercase letter";
  if (!/[A-Z]/.test(value)) return "Password must include an uppercase letter";
  if (!/\d/.test(value)) return "Password must include a number";
  return null;
};

const activationPublicPayload = (activation) => ({
  email: maskEmail(activation.email),
  role: activation.target_role,
  organization: activation.team_name || activation.employer_name || "Employee Benefit Program",
  expires_at: activation.expires_at,
});

module.exports = {
  createActivationInvitation,
  getActivationByToken,
  maskEmail,
  validateActivationPassword,
  activationPublicPayload,
};
