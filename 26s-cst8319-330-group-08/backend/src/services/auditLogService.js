const crypto = require("crypto");
const pool = require("../config/db");

const REDACTED_KEYS = new Set([
  "password",
  "password_hash",
  "token",
  "token_hash",
  "invite_token",
  "invite_code",
  "authorization",
  "jwt",
  "api_key",
  "secret",
  "document_content",
  "file_buffer",
]);

const sanitizeValue = (value, depth = 0) => {
  if (depth > 4) return "[max-depth]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value.slice(0, 1000);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 100)
        .map(([key, item]) => [
          key,
          REDACTED_KEYS.has(String(key).toLowerCase()) ? "[redacted]" : sanitizeValue(item, depth + 1),
        ]),
    );
  }
  return String(value).slice(0, 1000);
};

const hashIp = (req) => {
  const rawIp = String(req?.ip || req?.socket?.remoteAddress || "").trim();
  const secret = process.env.AUDIT_IP_HASH_SECRET || process.env.JWT_SECRET || "";
  if (!rawIp || !secret) return null;
  return crypto.createHmac("sha256", secret).update(rawIp).digest("hex");
};

const recordAuditEvent = async ({
  connection = pool,
  req = null,
  actorUserId = null,
  actorRole = null,
  action,
  entityType,
  entityId = null,
  teamId = null,
  partnershipId = null,
  result = "success",
  metadata = null,
}) => {
  if (!action || !entityType) {
    throw new Error("Audit action and entity type are required");
  }

  const actor = req?.user || null;
  await connection.query(
    `INSERT INTO audit_logs
     (actor_user_id, actor_role, action, entity_type, entity_id, team_id, partnership_id, request_id, ip_hash, result, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      actorUserId ?? actor?.id ?? null,
      actorRole ?? actor?.role ?? null,
      String(action).slice(0, 120),
      String(entityType).slice(0, 80),
      entityId === null || entityId === undefined ? null : String(entityId).slice(0, 120),
      teamId ?? actor?.team_id ?? null,
      partnershipId ?? actor?.partnership_id ?? null,
      req?.requestId || null,
      hashIp(req),
      String(result || "success").slice(0, 30),
      metadata === null ? null : JSON.stringify(sanitizeValue(metadata)),
    ],
  );
};

const safeRecordAuditEvent = async (event) => {
  try {
    await recordAuditEvent(event);
    return true;
  } catch (error) {
    console.error(`Audit log write failed for ${event?.action || "unknown action"}: ${error.message}`);
    return false;
  }
};

module.exports = {
  sanitizeValue,
  hashIp,
  recordAuditEvent,
  safeRecordAuditEvent,
};
