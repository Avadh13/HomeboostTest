const crypto = require("crypto");
const { hashOpaqueToken } = require("./paymentSecurityService");

const appUrl = () => (process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");

const createInviteCredentials = () => {
  const token = crypto.randomBytes(32).toString("base64url");
  const code = crypto.randomInt(100000, 1000000).toString();
  return {
    token,
    code,
    tokenHash: hashOpaqueToken(token),
    codeHash: hashOpaqueToken(code),
  };
};

const findInviteByCredential = async (connection, credential, options = {}) => {
  const value = String(credential || "").trim();
  if (value.length < 6 || value.length > 200) return null;
  const hash = hashOpaqueToken(value);
  const lock = options.forUpdate ? " FOR UPDATE" : "";

  const [[invite]] = await connection.query(
    `SELECT
       ei.*,
       p.slug AS partnership_slug,
       p.team_id,
       p.status AS partnership_status,
       e.name AS employer_name
     FROM employee_invites ei
     JOIN partnerships p ON p.id = ei.partnership_id
     LEFT JOIN employers e ON e.id = p.employer_id
     WHERE ei.invite_token_hash = ? OR ei.invite_code_hash = ?
     LIMIT 1${lock}`,
    [hash, hash],
  );
  return invite || null;
};

const inviteStateError = (invite) => {
  if (!invite) return { status: 404, message: "Invite not found" };
  if (invite.status === "revoked") return { status: 410, message: "Invite has been revoked" };
  if (invite.status === "registered") return { status: 409, message: "Invite has already been used" };
  if (invite.status !== "invited") return { status: 409, message: "Invite is not available" };
  if (invite.expires_at && new Date(invite.expires_at).getTime() <= Date.now()) {
    return { status: 410, message: "Invite has expired" };
  }
  return null;
};

const publicInvitePayload = (invite) => ({
  id: invite.id,
  full_name: invite.full_name,
  email: invite.email,
  status: invite.status,
  invite_role: invite.invite_role,
  partnership_id: invite.partnership_id,
  employer_name: invite.employer_name || null,
  partnership_slug: invite.partnership_slug || null,
  expires_at: invite.expires_at,
  created_at: invite.created_at,
});

const deliveryPayload = (invite, credentials) => ({
  ...publicInvitePayload(invite),
  invite_code: credentials.code,
  invite_link: `${appUrl()}/invite/${encodeURIComponent(credentials.token)}`,
});

module.exports = {
  createInviteCredentials,
  findInviteByCredential,
  inviteStateError,
  publicInvitePayload,
  deliveryPayload,
};
