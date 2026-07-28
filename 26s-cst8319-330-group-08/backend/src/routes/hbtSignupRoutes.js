const express = require("express");
const pool = require("../config/db");
const {
  createRegistrationStatusToken,
  getRegistrationByStatusToken,
  toPublicRegistrationStatus,
} = require("../services/paymentSecurityService");

const router = express.Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getCheckoutClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) return null;

  try {
    const Stripe = require("stripe");
    return new Stripe(process.env.STRIPE_SECRET_KEY);
  } catch {
    return null;
  }
};

const clean = (value, max = 255) => String(value || "").trim().slice(0, max);
const demoCheckoutEnabled = () => process.env.ALLOW_DEMO_PAYMENT_COMPLETION === "true";
const appUrl = () => (process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");
const amountCents = () => {
  const value = Number(process.env.HBT_PROGRAM_PRICE_CENTS || 99000);
  return Number.isInteger(value) && value > 0 ? value : 99000;
};
const currency = () => {
  const value = clean(process.env.HBT_PROGRAM_CURRENCY || "cad", 10).toLowerCase();
  return /^[a-z]{3}$/.test(value) ? value : "cad";
};

const ensureSignupTables = async (connection = pool) => {
  await connection.query(`CREATE TABLE IF NOT EXISTS hbt_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(180) NOT NULL,
    email VARCHAR(180) NOT NULL,
    phone VARCHAR(60) NULL,
    company_name VARCHAR(180) NOT NULL,
    role_title VARCHAR(120) NULL,
    website_url VARCHAR(255) NULL,
    notes TEXT NULL,
    status VARCHAR(40) DEFAULT 'started',
    payment_status VARCHAR(40) DEFAULT 'pending',
    team_id INT NULL,
    user_id INT NULL,
    checkout_session_id VARCHAR(180) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hbt_registrations_email (email),
    INDEX idx_hbt_registrations_status (status),
    INDEX idx_hbt_registrations_payment (payment_status)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    registration_id INT NULL,
    user_id INT NULL,
    team_id INT NULL,
    provider VARCHAR(40) DEFAULT 'stripe',
    provider_session_id VARCHAR(180) NULL,
    amount_cents INT DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'cad',
    status VARCHAR(40) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_payments_registration (registration_id),
    INDEX idx_payments_status (status),
    INDEX idx_payments_provider_session (provider_session_id)
  )`);
};

router.post("/start", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const fullName = clean(req.body.full_name, 180);
    const email = clean(req.body.email, 180).toLowerCase();
    const companyName = clean(req.body.company_name, 180);

    if (!fullName || !email || !companyName) {
      return res.status(400).json({ status: "error", message: "Full name, email, and company name are required" });
    }

    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ status: "error", message: "Enter a valid email address" });
    }

    await ensureSignupTables(connection);
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO hbt_registrations
       (full_name, email, phone, company_name, role_title, website_url, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        fullName,
        email,
        clean(req.body.phone, 60) || null,
        companyName,
        clean(req.body.role_title, 120) || null,
        clean(req.body.website_url, 255) || null,
        clean(req.body.notes, 1500) || null,
      ],
    );

    const registrationId = result.insertId;
    const statusToken = await createRegistrationStatusToken(connection, registrationId, 48);
    const stripe = getCheckoutClient();

    if (!stripe) {
      if (!demoCheckoutEnabled()) {
        await connection.query(
          "UPDATE hbt_registrations SET status = 'checkout_unavailable', payment_status = 'pending' WHERE id = ?",
          [registrationId],
        );
        await connection.commit();
        return res.status(503).json({
          status: "error",
          message: "Online checkout is temporarily unavailable. Please contact Employee Benefit Program support.",
        });
      }

      const demoSessionId = `demo_registration_${registrationId}`;
      await connection.query(
        "UPDATE hbt_registrations SET payment_status = 'demo_pending', checkout_session_id = ? WHERE id = ?",
        [demoSessionId, registrationId],
      );
      await connection.query(
        `INSERT INTO payments
         (registration_id, provider, provider_session_id, amount_cents, currency, status)
         VALUES (?, 'demo', ?, ?, ?, 'demo_pending')`,
        [registrationId, demoSessionId, amountCents(), currency()],
      );
      await connection.commit();

      return res.status(201).json({
        status: "success",
        mode: "demo",
        checkout_url: `${appUrl()}/payment-success?status=${encodeURIComponent(statusToken)}&demo=1`,
        message: "Demo checkout link created.",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      success_url: `${appUrl()}/payment-success?status=${encodeURIComponent(statusToken)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/hbt-signup?cancelled=1`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency(),
            unit_amount: amountCents(),
            product_data: { name: "Employee Benefit Program - HBT Enrollment" },
          },
        },
      ],
      metadata: { registration_id: String(registrationId) },
    });

    if (!session?.id || !session?.url) {
      throw new Error("Checkout provider did not return a valid session");
    }

    await connection.query(
      "UPDATE hbt_registrations SET checkout_session_id = ? WHERE id = ?",
      [session.id, registrationId],
    );
    await connection.query(
      `INSERT INTO payments
       (registration_id, provider, provider_session_id, amount_cents, currency, status)
       VALUES (?, 'stripe', ?, ?, ?, 'pending')`,
      [registrationId, session.id, amountCents(), currency()],
    );
    await connection.commit();

    return res.status(201).json({
      status: "success",
      mode: "stripe",
      checkout_url: session.url,
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({
      status: "error",
      message: "Failed to start HBT signup",
    });
  } finally {
    connection.release();
  }
});

router.get("/status/:statusToken", async (req, res) => {
  try {
    await ensureSignupTables();
    const registration = await getRegistrationByStatusToken(pool, req.params.statusToken);
    if (!registration) {
      return res.status(404).json({ status: "error", message: "Registration status is unavailable" });
    }

    return res.json({
      status: "success",
      registration: toPublicRegistrationStatus(registration),
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Failed to load registration status",
    });
  }
});

module.exports = router;
module.exports.ensureSignupTables = ensureSignupTables;
module.exports.getCheckoutClient = getCheckoutClient;
module.exports.amountCents = amountCents;
module.exports.currency = currency;
