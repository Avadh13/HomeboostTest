const {
  createInviteCredentials,
  publicInvitePayload,
  deliveryPayload,
} = require("./inviteSecurityService");

class InviteLifecycleError extends Error {
  constructor(message, statusCode = 400, code = "INVITE_ERROR") {
    super(message);
    this.name = "InviteLifecycleError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizeName = (value) => String(value || "").trim();
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const loadInvite = async (connection, partnershipId, email) => {
  const [[invite]] = await connection.query(
    `SELECT
       ei.*,
       p.team_id,
       p.status AS partnership_status,
       p.slug AS partnership_slug,
       e.name AS employer_name
     FROM employee_invites ei
     JOIN partnerships p ON p.id = ei.partnership_id
     LEFT JOIN employers e ON e.id = p.employer_id
     WHERE ei.partnership_id = ? AND ei.email = ?
     LIMIT 1`,
    [partnershipId, email],
  );
  return invite || null;
};

const createOrRefreshEmployeeInvite = async (
  connection,
  {
    partnershipId,
    invitedByUserId,
    fullName,
    email,
    enrollmentBatchId = null,
    expiresDays = 14,
  },
) => {
  const normalizedPartnershipId = Number(partnershipId);
  const normalizedName = normalizeName(fullName);
  const normalizedEmail = normalizeEmail(email);
  const normalizedBatchId = enrollmentBatchId ? Number(enrollmentBatchId) : null;
  const ttlDays = Math.min(Math.max(Number(expiresDays || 14), 1), 30);

  if (!normalizedPartnershipId || !normalizedName || !isValidEmail(normalizedEmail)) {
    throw new InviteLifecycleError(
      "Valid partnership, full name, and email are required",
      400,
      "INVITE_INPUT_INVALID",
    );
  }

  const [[partnership]] = await connection.query(
    `SELECT id, team_id, status
     FROM partnerships
     WHERE id = ?
     LIMIT 1`,
    [normalizedPartnershipId],
  );
  if (!partnership || partnership.status !== "active") {
    throw new InviteLifecycleError("Active partnership not found", 404, "PARTNERSHIP_NOT_ACTIVE");
  }

  const [[existingUser]] = await connection.query(
    "SELECT id FROM users WHERE email = ? LIMIT 1 FOR UPDATE",
    [normalizedEmail],
  );
  if (existingUser) {
    throw new InviteLifecycleError("This email already has an account", 409, "ACCOUNT_EXISTS");
  }

  const [[existingInvite]] = await connection.query(
    `SELECT id, status, invite_role
     FROM employee_invites
     WHERE partnership_id = ? AND email = ?
     LIMIT 1 FOR UPDATE`,
    [normalizedPartnershipId, normalizedEmail],
  );
  if (existingInvite?.status === "registered") {
    throw new InviteLifecycleError(
      "This invite has already been registered",
      409,
      "INVITE_ALREADY_REGISTERED",
    );
  }
  if (existingInvite?.invite_role && existingInvite.invite_role !== "employee") {
    throw new InviteLifecycleError(
      "This email already has a non-employee invitation. Resolve or revoke that invitation before creating an employee invite.",
      409,
      "INVITE_ROLE_CONFLICT",
    );
  }

  const credentials = createInviteCredentials();

  await connection.query(
    `INSERT INTO employee_invites
     (partnership_id, enrollment_batch_id, invited_by_user_id, registered_user_id,
      full_name, email, status, invite_role,
      invite_token, invite_code, invite_token_hash, invite_code_hash,
      expires_at, accepted_at, last_sent_at, registered_at, revoked_at)
     VALUES (?, ?, ?, NULL, ?, ?, 'invited', 'employee', NULL, NULL, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), NULL, NOW(), NULL, NULL)
     ON DUPLICATE KEY UPDATE
       enrollment_batch_id = VALUES(enrollment_batch_id),
       invited_by_user_id = VALUES(invited_by_user_id),
       registered_user_id = NULL,
       full_name = VALUES(full_name),
       status = 'invited',
       invite_role = 'employee',
       invite_token = NULL,
       invite_code = NULL,
       invite_token_hash = VALUES(invite_token_hash),
       invite_code_hash = VALUES(invite_code_hash),
       expires_at = VALUES(expires_at),
       accepted_at = NULL,
       last_sent_at = NOW(),
       registered_at = NULL,
       revoked_at = NULL`,
    [
      normalizedPartnershipId,
      normalizedBatchId,
      invitedByUserId ? Number(invitedByUserId) : null,
      normalizedName,
      normalizedEmail,
      credentials.tokenHash,
      credentials.codeHash,
      ttlDays,
    ],
  );

  const rawInvite = await loadInvite(connection, normalizedPartnershipId, normalizedEmail);
  if (!rawInvite) {
    throw new InviteLifecycleError("Invite could not be loaded after creation", 500, "INVITE_LOAD_FAILED");
  }

  return {
    rawInvite,
    invite: publicInvitePayload(rawInvite),
    delivery: deliveryPayload(rawInvite, credentials),
  };
};

const listPublicInvitesForPartnership = async (connection, partnershipId) => {
  const id = Number(partnershipId);
  if (!id) return [];

  const [rows] = await connection.query(
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
     WHERE ei.partnership_id = ?
     ORDER BY ei.id DESC`,
    [id],
  );

  return rows.map(publicInvitePayload);
};

const revokePendingBatchInvites = async (connection, { batchId, partnershipId = null }) => {
  const id = Number(batchId);
  if (!id) throw new InviteLifecycleError("Valid batch ID is required", 400, "BATCH_ID_INVALID");

  const params = [id];
  let partnershipClause = "";
  if (partnershipId) {
    partnershipClause = " AND partnership_id = ?";
    params.push(Number(partnershipId));
  }

  const [result] = await connection.query(
    `UPDATE employee_invites
     SET status = 'revoked',
         revoked_at = NOW(),
         invite_token = NULL,
         invite_code = NULL,
         invite_token_hash = NULL,
         invite_code_hash = NULL
     WHERE enrollment_batch_id = ?
       ${partnershipClause}
       AND status = 'invited'
       AND invite_role = 'employee'`,
    params,
  );

  return Number(result.affectedRows || 0);
};

module.exports = {
  InviteLifecycleError,
  normalizeEmail,
  normalizeName,
  isValidEmail,
  createOrRefreshEmployeeInvite,
  listPublicInvitesForPartnership,
  revokePendingBatchInvites,
};
