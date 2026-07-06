const express = require("express");
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const hbtRoles = ["hbt_admin"];
const allowedRoles = [...adminRoles, ...hbtRoles];

const tableExists = async (tableName) => {
  const [rows] = await pool.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1",
    [tableName]
  );
  return rows.length > 0;
};

const makeCheck = (key, label, passed, severity = "required", detail = "") => ({
  key,
  label,
  passed: Boolean(passed),
  severity,
  status: passed ? "pass" : severity === "required" ? "fail" : "warn",
  detail,
});

const envPresent = (...names) => names.some((name) => Boolean(process.env[name]));

router.use(protect);

router.get("/deployment-readiness", async (req, res) => {
  try {
    if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ status: "error", message: "QA access required" });

    const checks = [];
    let dbOk = false;
    try {
      await pool.query("SELECT 1 AS ok");
      dbOk = true;
    } catch {
      dbOk = false;
    }

    checks.push(makeCheck("database", "Database connection", dbOk, "required", dbOk ? "Database query succeeded." : "Database query failed."));
    checks.push(makeCheck("jwt", "JWT secret configured", Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 24), "required", "Use a long random JWT_SECRET in Railway."));
    checks.push(makeCheck("frontend_url", "Frontend URL configured", envPresent("FRONTEND_URL", "CLIENT_URL"), "recommended", "Required for payment redirects, invite links, and production emails."));
    checks.push(makeCheck("stripe_secret", "Stripe secret configured", envPresent("STRIPE_SECRET_KEY"), "recommended", "Required before real HBT payment checkout."));
    checks.push(makeCheck("stripe_webhook", "Stripe webhook secret configured", envPresent("STRIPE_WEBHOOK_SECRET"), "recommended", "Required before trusting Stripe production webhook events."));

    const documentDir = path.resolve(process.env.DOCUMENT_STORAGE_DIR || path.join(__dirname, "..", "..", "private-documents"));
    let documentDirReady = false;
    try {
      fs.mkdirSync(documentDir, { recursive: true });
      fs.accessSync(documentDir, fs.constants.W_OK);
      documentDirReady = true;
    } catch {
      documentDirReady = false;
    }
    checks.push(makeCheck("document_storage", "Private document storage writable", documentDirReady, "required", "Use a Railway volume or external storage for production uploads."));

    const requiredTables = [
      "users",
      "partnerships",
      "employers",
      "home_buying_teams",
      "resources",
      "quizzes",
      "quiz_submissions",
      "journeys",
      "employee_journey_assignments",
      "employee_invites",
      "employee_documents",
      "partnership_portal_settings",
      "employer_approval_requests",
      "report_export_logs",
    ];

    for (const table of requiredTables) {
      const exists = dbOk ? await tableExists(table) : false;
      checks.push(makeCheck(`table_${table}`, `Table: ${table}`, exists, table === "report_export_logs" ? "recommended" : "required"));
    }

    const failed = checks.filter((check) => check.status === "fail").length;
    const warnings = checks.filter((check) => check.status === "warn").length;
    const passed = checks.filter((check) => check.status === "pass").length;
    const score = Math.round((passed / checks.length) * 100);

    return res.json({
      status: "success",
      readiness: failed === 0 ? (warnings === 0 ? "ready" : "ready_with_warnings") : "not_ready",
      score,
      passed,
      warnings,
      failed,
      checks,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to run deployment readiness checks", error: error.message });
  }
});

router.get("/security-checklist", async (req, res) => {
  if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ status: "error", message: "QA access required" });
  return res.json({
    status: "success",
    checklist: [
      "Use long random JWT_SECRET and rotate before client demo.",
      "Set FRONTEND_URL/CLIENT_URL to the production Vercel URL.",
      "Enable Stripe webhook secret before real checkout testing.",
      "Attach persistent Railway volume or S3-compatible storage for private documents.",
      "Run backend npm test and frontend npm run build before deployment.",
      "Confirm employee invite links create employee accounts and route to /employee-portal.",
      "Confirm HBT reports/exports do not show data from another HBT team.",
      "Disable diagnostic routes in production unless actively debugging.",
      "Do not commit .env files or real secrets to GitHub.",
    ],
  });
});

module.exports = router;
