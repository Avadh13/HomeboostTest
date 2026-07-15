const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");
const { ensureSignupTables, getCheckoutClient } = require("./hbtSignupRoutes");
const { provisionHbtFromRegistration } = require("../services/hbtProvisionService");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const allowedStatuses = new Set(["pending", "demo_pending", "paid", "failed", "cancelled", "refunded"]);

const toCents = (value) => Number(value || 0);
const formatCurrency = (cents, currency = "cad") => new Intl.NumberFormat("en-CA", { style: "currency", currency: String(currency || "cad").toUpperCase() }).format(toCents(cents) / 100);
const isAdmin = (user) => adminRoles.includes(user?.role);
const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const ensureAdmin = (req, res, next) => {
  if (!isAdmin(req.user)) return res.status(403).json({ status: "error", message: "Admin payment access required" });
  next();
};

const formatDate = (value) => value ? new Date(value).toLocaleString("en-CA", { timeZone: "America/Toronto" }) : "—";

const receiptHtml = (payment) => {
  const currency = payment.currency || process.env.HBT_PROGRAM_CURRENCY || "cad";
  const amountCents = toCents(payment.amount_cents || process.env.HBT_PROGRAM_PRICE_CENTS || 99000);
  const paidStatus = payment.payment_status === "paid" || payment.payment_record_status === "paid";
  const receiptNumber = `HBP-${String(payment.registration_id).padStart(5, "0")}`;
  const issuedAt = formatDate(new Date().toISOString());

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Payment Receipt ${escapeHtml(receiptNumber)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; background: #f8fafc; color: #0f172a; }
    .page { max-width: 820px; margin: 32px auto; background: white; border-radius: 24px; padding: 40px; box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12); }
    .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; }
    .brand { font-size: 28px; font-weight: 900; letter-spacing: -0.04em; }
    .subtitle { color: #64748b; margin-top: 6px; font-size: 14px; line-height: 1.6; }
    .badge { display: inline-block; border-radius: 999px; padding: 8px 14px; font-size: 12px; font-weight: 900; text-transform: uppercase; background: ${paidStatus ? "#dcfce7" : "#fef3c7"}; color: ${paidStatus ? "#047857" : "#b45309"}; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px; }
    .card { border: 1px solid #e2e8f0; border-radius: 18px; padding: 18px; }
    .label { color: #64748b; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
    .value { font-size: 15px; font-weight: 700; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; margin-top: 28px; }
    th { background: #0f172a; color: white; text-align: left; padding: 14px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
    td { border-bottom: 1px solid #e2e8f0; padding: 14px; font-size: 14px; }
    .total { text-align: right; font-size: 28px; font-weight: 900; margin-top: 26px; }
    .note { margin-top: 30px; border-radius: 16px; background: #f1f5f9; padding: 16px; color: #475569; font-size: 13px; line-height: 1.6; }
    @media print { body { background: white; } .page { box-shadow: none; margin: 0; max-width: none; border-radius: 0; } }
  </style>
</head>
<body>
  <main class="page">
    <section class="header">
      <div>
        <div class="brand">Home Buying Program</div>
        <div class="subtitle">HBT Membership Payment Receipt<br />Generated from the HomeBoost Admin Payment Dashboard</div>
      </div>
      <div style="text-align:right">
        <span class="badge">${escapeHtml(payment.payment_status || payment.payment_record_status || "pending")}</span>
        <div class="subtitle" style="margin-top:12px">Receipt #: <strong>${escapeHtml(receiptNumber)}</strong><br />Issued: ${escapeHtml(issuedAt)}</div>
      </div>
    </section>

    <section class="grid">
      <div class="card">
        <div class="label">Bill To</div>
        <div class="value">${escapeHtml(payment.full_name)}<br />${escapeHtml(payment.email)}<br />${escapeHtml(payment.phone || "")}</div>
      </div>
      <div class="card">
        <div class="label">Organization</div>
        <div class="value">${escapeHtml(payment.company_name)}<br />${escapeHtml(payment.role_title || "HBT Membership")}</div>
      </div>
      <div class="card">
        <div class="label">Payment Info</div>
        <div class="value">Provider: ${escapeHtml(payment.provider || "stripe/demo")}<br />Session: ${escapeHtml(payment.provider_session_id || payment.checkout_session_id || "—")}<br />Payment ID: ${escapeHtml(payment.payment_id || "—")}</div>
      </div>
      <div class="card">
        <div class="label">Portal Access</div>
        <div class="value">Team: ${escapeHtml(payment.hbt_team_name || "Pending") }<br />Portal user: ${escapeHtml(payment.portal_user_email || "Pending")}</div>
      </div>
    </section>

    <table>
      <thead><tr><th>Description</th><th>Status</th><th>Date</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        <tr>
          <td>Home Buying Program HBT Membership Enrollment</td>
          <td>${escapeHtml(payment.payment_status || payment.payment_record_status || "pending")}</td>
          <td>${escapeHtml(formatDate(payment.payment_created_at || payment.registration_created_at))}</td>
          <td style="text-align:right">${escapeHtml(formatCurrency(amountCents, currency))}</td>
        </tr>
      </tbody>
    </table>

    <div class="total">Total: ${escapeHtml(formatCurrency(amountCents, currency))}</div>
    <div class="note">This receipt is generated from HomeBoost payment records for internal/admin use. For live Stripe production payments, Stripe-hosted invoice/receipt URLs can also be stored and linked when webhook events are enabled.</div>
  </main>
</body>
</html>`;
};

const handleCheckoutCompleted = async (session) => {
  await ensureSignupTables();
  const registrationId = Number(session?.metadata?.registration_id || 0);
  if (!registrationId) return null;

  await pool.query(
    `UPDATE hbt_registrations SET payment_status = 'paid', status = 'paid', checkout_session_id = COALESCE(checkout_session_id, ?) WHERE id = ?`,
    [session.id || null, registrationId]
  );
  const [paymentUpdate] = await pool.query(
    `UPDATE payments SET status = 'paid', provider_session_id = COALESCE(provider_session_id, ?), updated_at = CURRENT_TIMESTAMP WHERE registration_id = ? OR provider_session_id = ?`,
    [session.id || null, registrationId, session.id || null]
  );

  if (Number(paymentUpdate.affectedRows || 0) === 0) {
    await pool.query(
      `INSERT INTO payments (registration_id, provider, provider_session_id, amount_cents, currency, status)
       VALUES (?, 'stripe', ?, ?, ?, 'paid')`,
      [registrationId, session.id || null, toCents(session.amount_total), session.currency || process.env.HBT_PROGRAM_CURRENCY || "cad"]
    );
  }

  return provisionHbtFromRegistration(registrationId);
};

const handleStripeWebhook = async (req, res) => {
  try {
    const stripe = getCheckoutClient();
    if (!stripe) return res.status(400).json({ status: "error", message: "Checkout provider is not configured" });

    let event = req.body;
    const signature = req.headers["stripe-signature"];

    if (process.env.STRIPE_WEBHOOK_SECRET && signature) {
      event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } else if (Buffer.isBuffer(req.body)) {
      event = JSON.parse(req.body.toString("utf8"));
    }

    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object);
    }

    return res.json({ received: true });
  } catch (error) {
    return res.status(400).json({ status: "error", message: error.message });
  }
};

router.get("/status/:registrationId", async (req, res) => {
  try {
    await ensureSignupTables();
    const [[registration]] = await pool.query(
      `SELECT id, full_name, email, company_name, status, payment_status, team_id, user_id, checkout_session_id, created_at
       FROM hbt_registrations WHERE id = ? LIMIT 1`,
      [req.params.registrationId]
    );
    if (!registration) return res.status(404).json({ status: "error", message: "Registration not found" });
    return res.json({ status: "success", registration });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load payment status", error: error.message });
  }
});

router.post("/demo-complete/:registrationId", async (req, res) => {
  try {
    if (process.env.ALLOW_DEMO_PAYMENT_COMPLETION === "false") {
      return res.status(403).json({ status: "error", message: "Demo completion is disabled" });
    }
    await ensureSignupTables();
    await pool.query("UPDATE hbt_registrations SET payment_status = 'paid', status = 'paid' WHERE id = ?", [req.params.registrationId]);
    const [paymentUpdate] = await pool.query("UPDATE payments SET status = 'paid', updated_at = CURRENT_TIMESTAMP WHERE registration_id = ?", [req.params.registrationId]);
    if (Number(paymentUpdate.affectedRows || 0) === 0) {
      await pool.query(
        `INSERT INTO payments (registration_id, provider, provider_session_id, amount_cents, currency, status)
         VALUES (?, 'demo', ?, ?, ?, 'paid')`,
        [req.params.registrationId, `demo_registration_${req.params.registrationId}`, Number(process.env.HBT_PROGRAM_PRICE_CENTS || 99000), process.env.HBT_PROGRAM_CURRENCY || "cad"]
      );
    }
    const access = await provisionHbtFromRegistration(Number(req.params.registrationId));
    if (!access) return res.status(404).json({ status: "error", message: "Registration not found" });
    return res.json({ status: "success", message: "Demo payment completed. HBT portal access created.", access });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to complete demo payment", error: error.message });
  }
});

router.use(protect);

router.get("/admin/summary", ensureAdmin, async (req, res) => {
  try {
    await ensureSignupTables();
    const [[summary]] = await pool.query(
      `SELECT
        COUNT(DISTINCT r.id) AS total_registrations,
        SUM(CASE WHEN r.payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
        SUM(CASE WHEN r.payment_status IN ('pending', 'demo_pending') THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN r.payment_status IN ('failed', 'cancelled') THEN 1 ELSE 0 END) AS failed_count,
        SUM(CASE WHEN r.payment_status = 'paid' THEN COALESCE(p.amount_cents, 0) ELSE 0 END) AS revenue_cents,
        SUM(CASE WHEN r.payment_status IN ('pending', 'demo_pending') THEN COALESCE(p.amount_cents, 0) ELSE 0 END) AS pending_cents
       FROM hbt_registrations r
       LEFT JOIN payments p ON p.registration_id = r.id`
    );

    const [statusBreakdown] = await pool.query(
      `SELECT COALESCE(r.payment_status, 'unknown') AS status, COUNT(*) AS total, COALESCE(SUM(p.amount_cents), 0) AS amount_cents
       FROM hbt_registrations r
       LEFT JOIN payments p ON p.registration_id = r.id
       GROUP BY COALESCE(r.payment_status, 'unknown')
       ORDER BY total DESC`
    );

    const [providerBreakdown] = await pool.query(
      `SELECT COALESCE(p.provider, 'registration') AS provider, COUNT(*) AS total, COALESCE(SUM(p.amount_cents), 0) AS amount_cents
       FROM hbt_registrations r
       LEFT JOIN payments p ON p.registration_id = r.id
       GROUP BY COALESCE(p.provider, 'registration')
       ORDER BY total DESC`
    );

    return res.json({
      status: "success",
      summary: {
        total_registrations: Number(summary.total_registrations || 0),
        paid_count: Number(summary.paid_count || 0),
        pending_count: Number(summary.pending_count || 0),
        failed_count: Number(summary.failed_count || 0),
        revenue_cents: Number(summary.revenue_cents || 0),
        pending_cents: Number(summary.pending_cents || 0),
        revenue_display: formatCurrency(summary.revenue_cents || 0),
        pending_display: formatCurrency(summary.pending_cents || 0),
      },
      status_breakdown: statusBreakdown,
      provider_breakdown: providerBreakdown,
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load payment summary", error: error.message });
  }
});

router.get("/admin/list", ensureAdmin, async (req, res) => {
  try {
    await ensureSignupTables();
    const params = [];
    let where = "WHERE 1=1";
    const status = String(req.query.status || "").trim();
    const provider = String(req.query.provider || "").trim();
    const search = String(req.query.search || "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 300);

    if (status && status !== "all") {
      where += " AND (r.payment_status = ? OR p.status = ?)";
      params.push(status, status);
    }
    if (provider && provider !== "all") {
      where += " AND p.provider = ?";
      params.push(provider);
    }
    if (search) {
      where += " AND (r.full_name LIKE ? OR r.email LIKE ? OR r.company_name LIKE ? OR p.provider_session_id LIKE ?)";
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const [payments] = await pool.query(
      `SELECT
        r.id AS registration_id,
        r.full_name,
        r.email,
        r.phone,
        r.company_name,
        r.role_title,
        r.status AS registration_status,
        r.payment_status,
        r.checkout_session_id,
        r.team_id,
        r.user_id,
        r.created_at AS registration_created_at,
        p.id AS payment_id,
        COALESCE(p.provider, CASE WHEN r.checkout_session_id LIKE 'demo_%' THEN 'demo' ELSE 'stripe' END) AS provider,
        p.provider_session_id,
        COALESCE(p.amount_cents, ?) AS amount_cents,
        COALESCE(p.currency, ?) AS currency,
        COALESCE(p.status, r.payment_status) AS payment_record_status,
        p.created_at AS payment_created_at,
        p.updated_at AS payment_updated_at,
        h.name AS hbt_team_name,
        u.full_name AS portal_user_name,
        u.email AS portal_user_email
       FROM hbt_registrations r
       LEFT JOIN payments p ON p.registration_id = r.id
       LEFT JOIN home_buying_teams h ON h.id = r.team_id
       LEFT JOIN users u ON u.id = r.user_id
       ${where}
       ORDER BY r.created_at DESC, p.created_at DESC
       LIMIT ${limit}`,
      [Number(process.env.HBT_PROGRAM_PRICE_CENTS || 99000), process.env.HBT_PROGRAM_CURRENCY || "cad", ...params]
    );

    return res.json({ status: "success", payments });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load payments", error: error.message });
  }
});

router.get("/admin/registrations/:registrationId/receipt", ensureAdmin, async (req, res) => {
  try {
    await ensureSignupTables();
    const [[payment]] = await pool.query(
      `SELECT
        r.id AS registration_id,
        r.full_name,
        r.email,
        r.phone,
        r.company_name,
        r.role_title,
        r.status AS registration_status,
        r.payment_status,
        r.checkout_session_id,
        r.team_id,
        r.user_id,
        r.created_at AS registration_created_at,
        p.id AS payment_id,
        COALESCE(p.provider, CASE WHEN r.checkout_session_id LIKE 'demo_%' THEN 'demo' ELSE 'stripe' END) AS provider,
        p.provider_session_id,
        COALESCE(p.amount_cents, ?) AS amount_cents,
        COALESCE(p.currency, ?) AS currency,
        COALESCE(p.status, r.payment_status) AS payment_record_status,
        p.created_at AS payment_created_at,
        p.updated_at AS payment_updated_at,
        h.name AS hbt_team_name,
        u.full_name AS portal_user_name,
        u.email AS portal_user_email
       FROM hbt_registrations r
       LEFT JOIN payments p ON p.registration_id = r.id
       LEFT JOIN home_buying_teams h ON h.id = r.team_id
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.id = ?
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [Number(process.env.HBT_PROGRAM_PRICE_CENTS || 99000), process.env.HBT_PROGRAM_CURRENCY || "cad", req.params.registrationId]
    );

    if (!payment) return res.status(404).json({ status: "error", message: "Payment registration not found" });

    const filename = `homebuying-payment-receipt-${payment.registration_id}.html`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(receiptHtml(payment));
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to generate payment receipt", error: error.message });
  }
});

router.put("/admin/:paymentId/status", ensureAdmin, async (req, res) => {
  try {
    await ensureSignupTables();
    const status = String(req.body.status || "").trim();
    if (!allowedStatuses.has(status)) return res.status(400).json({ status: "error", message: "Invalid payment status" });

    const [[payment]] = await pool.query("SELECT * FROM payments WHERE id = ? LIMIT 1", [req.params.paymentId]);
    if (!payment) return res.status(404).json({ status: "error", message: "Payment not found" });

    await pool.query("UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [status, req.params.paymentId]);
    if (payment.registration_id) {
      await pool.query("UPDATE hbt_registrations SET payment_status = ?, status = IF(? = 'paid', 'paid', status) WHERE id = ?", [status, status, payment.registration_id]);
    }

    return res.json({ status: "success", message: "Payment status updated" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update payment status", error: error.message });
  }
});

module.exports = router;
module.exports.handleStripeWebhook = handleStripeWebhook;
