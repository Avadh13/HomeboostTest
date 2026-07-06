const express = require("express");
const pool = require("../config/db");
const { ensureSignupTables, getCheckoutClient } = require("./hbtSignupRoutes");
const { provisionHbtFromRegistration } = require("../services/hbtProvisionService");

const router = express.Router();

const handleCheckoutCompleted = async (session) => {
  await ensureSignupTables();
  const registrationId = Number(session?.metadata?.registration_id || 0);
  if (!registrationId) return null;

  await pool.query(
    `UPDATE hbt_registrations SET payment_status = 'paid', status = 'paid', checkout_session_id = COALESCE(checkout_session_id, ?) WHERE id = ?`,
    [session.id || null, registrationId]
  );
  await pool.query(
    `UPDATE payments SET status = 'paid' WHERE registration_id = ? OR provider_session_id = ?`,
    [registrationId, session.id || null]
  );

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
    const access = await provisionHbtFromRegistration(Number(req.params.registrationId));
    if (!access) return res.status(404).json({ status: "error", message: "Registration not found" });
    return res.json({ status: "success", message: "Demo payment completed. HBT portal access created.", access });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to complete demo payment", error: error.message });
  }
});

module.exports = router;
module.exports.handleStripeWebhook = handleStripeWebhook;
