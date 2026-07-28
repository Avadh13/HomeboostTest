const crypto = require("crypto");

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizeCurrency = (value) => String(value || "").trim().toLowerCase();
const hashOpaqueToken = (token) => crypto.createHash("sha256").update(String(token || ""), "utf8").digest("hex");

const createRegistrationStatusToken = async (connection, registrationId, ttlHours = 48) => {
  const id = Number(registrationId);
  if (!id) throw new Error("Valid registration ID is required");

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashOpaqueToken(token);
  const ttl = Math.min(Math.max(Number(ttlHours || 48), 1), 168);

  await connection.query(
    `INSERT INTO hbt_registration_status_tokens
     (registration_id, token_hash, expires_at, revoked_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR), NULL)
     ON DUPLICATE KEY UPDATE
       token_hash = VALUES(token_hash),
       expires_at = VALUES(expires_at),
       revoked_at = NULL,
       updated_at = CURRENT_TIMESTAMP`,
    [id, tokenHash, ttl],
  );

  return token;
};

const getRegistrationByStatusToken = async (connection, token, options = {}) => {
  const value = String(token || "").trim();
  if (value.length < 32 || value.length > 200) return null;
  const tokenHash = hashOpaqueToken(value);
  const lock = options.forUpdate ? " FOR UPDATE" : "";

  const [[registration]] = await connection.query(
    `SELECT r.*
     FROM hbt_registration_status_tokens st
     JOIN hbt_registrations r ON r.id = st.registration_id
     WHERE st.token_hash = ?
       AND st.revoked_at IS NULL
       AND st.expires_at > NOW()
     LIMIT 1${lock}`,
    [tokenHash],
  );
  return registration || null;
};

const toPublicRegistrationStatus = (registration) => ({
  status: registration.status,
  payment_status: registration.payment_status,
  portal_ready: Boolean(registration.team_id && registration.user_id),
  created_at: registration.created_at,
});

const checkoutValidationError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = 400;
  return error;
};

const getSessionEmail = (session) => normalizeEmail(
  session?.customer_details?.email || session?.customer_email || "",
);

const validateCheckoutSession = ({ session, registration, payment }) => {
  if (!session?.id || !registration || !payment) {
    throw checkoutValidationError("CHECKOUT_CONTEXT_INVALID", "Checkout context is incomplete");
  }

  const metadataRegistrationId = Number(session?.metadata?.registration_id || 0);
  if (metadataRegistrationId !== Number(registration.id)) {
    throw checkoutValidationError("CHECKOUT_REGISTRATION_MISMATCH", "Checkout registration does not match");
  }

  if (
    String(registration.checkout_session_id || "") !== String(session.id) ||
    String(payment.provider_session_id || "") !== String(session.id)
  ) {
    throw checkoutValidationError("CHECKOUT_SESSION_MISMATCH", "Checkout session does not match stored payment");
  }

  if (String(payment.provider || "").toLowerCase() !== "stripe") {
    throw checkoutValidationError("CHECKOUT_PROVIDER_MISMATCH", "Stored payment provider does not match");
  }

  if (String(session.payment_status || "").toLowerCase() !== "paid") {
    throw checkoutValidationError("CHECKOUT_NOT_PAID", "Checkout session is not paid");
  }

  if (Number(session.amount_total) !== Number(payment.amount_cents)) {
    throw checkoutValidationError("CHECKOUT_AMOUNT_MISMATCH", "Checkout amount does not match stored payment");
  }

  if (normalizeCurrency(session.currency) !== normalizeCurrency(payment.currency)) {
    throw checkoutValidationError("CHECKOUT_CURRENCY_MISMATCH", "Checkout currency does not match stored payment");
  }

  const sessionEmail = getSessionEmail(session);
  if (!sessionEmail || sessionEmail !== normalizeEmail(registration.email)) {
    throw checkoutValidationError("CHECKOUT_EMAIL_MISMATCH", "Checkout customer does not match registration");
  }

  return true;
};

const claimStripeEvent = async (connection, event) => {
  const eventId = String(event?.id || "").trim();
  const eventType = String(event?.type || "").trim();
  if (!eventId || !eventType) {
    throw checkoutValidationError("STRIPE_EVENT_INVALID", "Stripe event is missing required identifiers");
  }

  const session = event?.data?.object || {};
  const [result] = await connection.query(
    `INSERT IGNORE INTO stripe_webhook_events
     (event_id, event_type, provider_session_id, registration_id, processing_status)
     VALUES (?, ?, ?, ?, 'processing')`,
    [
      eventId,
      eventType,
      session.id || null,
      Number(session?.metadata?.registration_id || 0) || null,
    ],
  );

  return Number(result.affectedRows || 0) === 1;
};

const markStripeEventProcessed = async (connection, eventId) => {
  await connection.query(
    `UPDATE stripe_webhook_events
     SET processing_status = 'processed', processed_at = NOW(), failure_code = NULL
     WHERE event_id = ?`,
    [eventId],
  );
};

module.exports = {
  normalizeEmail,
  normalizeCurrency,
  hashOpaqueToken,
  createRegistrationStatusToken,
  getRegistrationByStatusToken,
  toPublicRegistrationStatus,
  validateCheckoutSession,
  claimStripeEvent,
  markStripeEventProcessed,
  checkoutValidationError,
};
