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

const ensureAdmin = (req, res, next) => {
  if (!isAdmin(req.user)) return res.status(403).json({ status: "error", message: "Admin payment access required" });
  next();
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
