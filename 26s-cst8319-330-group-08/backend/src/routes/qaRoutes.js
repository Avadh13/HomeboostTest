const express = require("express");
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");
const qaService = require("../services/qaService");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const hbtRoles = ["hbt_admin"];
const allowedRoles = [...adminRoles, ...hbtRoles];

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

const requireQaAccess = (req, res, next) => {
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ status: "error", message: "QA access required" });
  }
  return next();
};

const requireAdmin = (req, res, next) => {
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({ status: "error", message: "Admin QA access required" });
  }
  return next();
};

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

const parseEvidence = (body) => {
  if (Array.isArray(body.evidence_urls)) return body.evidence_urls;
  if (typeof body.evidence_url === "string" && body.evidence_url.trim()) {
    return [{
      file_url: body.evidence_url.trim(),
      file_name: body.evidence_name || null,
      evidence_type: body.evidence_type || "link",
    }];
  }
  return [];
};

const runSystemChecks = async () => {
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
  checks.push(makeCheck("email_provider", "Transactional email provider configured", envPresent("RESEND_API_KEY", "SENDGRID_API_KEY", "SMTP_HOST"), "recommended", "Required for production invitation and activation delivery."));

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
    "qa_test_cases",
    "qa_test_runs",
    "qa_test_evidence",
  ];

  for (const table of requiredTables) {
    const exists = dbOk ? await tableExists(table) : false;
    checks.push(makeCheck(`table_${table}`, `Table: ${table}`, exists, table === "report_export_logs" ? "recommended" : "required"));
  }

  const failed = checks.filter((check) => check.status === "fail").length;
  const warnings = checks.filter((check) => check.status === "warn").length;
  const passed = checks.filter((check) => check.status === "pass").length;
  const score = checks.length ? Math.round((passed / checks.length) * 100) : 0;

  return {
    status: "success",
    readiness: failed === 0 ? (warnings === 0 ? "ready" : "ready_with_warnings") : "not_ready",
    score,
    passed,
    warnings,
    failed,
    checks,
    generated_at: new Date().toISOString(),
  };
};

router.use(protect);
router.use(requireQaAccess);

router.get("/summary", asyncRoute(async (req, res) => {
  const summary = await qaService.getSummary();
  return res.json({ status: "success", ...summary, generated_at: new Date().toISOString() });
}));

router.get("/test-cases", asyncRoute(async (req, res) => {
  const testCases = await qaService.listTestCases(req.query);
  return res.json({ status: "success", count: testCases.length, test_cases: testCases });
}));

router.get("/test-cases/:id", asyncRoute(async (req, res) => {
  const testCase = await qaService.getTestCase(req.params.id);
  if (!testCase) return res.status(404).json({ status: "error", message: "QA test case not found" });
  return res.json({ status: "success", test_case: testCase });
}));

router.get("/test-cases/:id/runs", asyncRoute(async (req, res) => {
  const runs = await qaService.listTestRuns(req.params.id);
  return res.json({ status: "success", runs });
}));

router.post("/test-cases/:id/runs", asyncRoute(async (req, res) => {
  const status = typeof req.body.status === "string" ? req.body.status : "";
  const environment = typeof req.body.environment === "string" ? req.body.environment : "preview";
  if (!qaService.VALID_STATUSES.has(status)) {
    return res.status(400).json({ status: "error", message: "Invalid QA status" });
  }
  if (!qaService.VALID_ENVIRONMENTS.has(environment)) {
    return res.status(400).json({ status: "error", message: "Invalid QA environment" });
  }

  const run = await qaService.recordTestRun({
    testCaseId: req.params.id,
    status,
    releaseVersion: typeof req.body.release_version === "string" ? req.body.release_version.trim().slice(0, 80) || "current" : "current",
    environment,
    actualResult: typeof req.body.actual_result === "string" ? req.body.actual_result.trim().slice(0, 10000) : "",
    notes: typeof req.body.notes === "string" ? req.body.notes.trim().slice(0, 10000) : "",
    evidenceUrls: parseEvidence(req.body),
    userId: req.user.id,
  });

  const [testCase, summary] = await Promise.all([
    qaService.getTestCase(req.params.id),
    qaService.getSummary(),
  ]);
  return res.status(201).json({ status: "success", message: "QA result recorded", run, test_case: testCase, summary });
}));

router.post("/test-cases", requireAdmin, asyncRoute(async (req, res) => {
  const testCase = await qaService.createTestCase(req.body, req.user.id);
  return res.status(201).json({ status: "success", test_case: testCase });
}));

router.put("/test-cases/:id", requireAdmin, asyncRoute(async (req, res) => {
  const testCase = await qaService.updateTestCase(req.params.id, req.body);
  if (!testCase) return res.status(404).json({ status: "error", message: "QA test case not found" });
  return res.json({ status: "success", test_case: testCase });
}));

router.delete("/test-cases/:id", requireAdmin, asyncRoute(async (req, res) => {
  const removed = await qaService.deactivateTestCase(req.params.id);
  if (!removed) return res.status(404).json({ status: "error", message: "QA test case not found" });
  return res.json({ status: "success", message: "QA test case archived" });
}));

router.get("/system-checks", asyncRoute(async (req, res) => {
  await qaService.ensureQaSchema();
  return res.json(await runSystemChecks());
}));

router.get("/deployment-readiness", asyncRoute(async (req, res) => {
  await qaService.ensureQaSchema();
  return res.json(await runSystemChecks());
}));

router.get("/security-checklist", (req, res) => res.json({
  status: "success",
  checklist: [
    "Run and record every critical client acceptance test before launch.",
    "Use a long random JWT_SECRET and rotate it before production launch.",
    "Set FRONTEND_URL or CLIENT_URL to the approved production portal domain.",
    "Complete a real Stripe Checkout test and verify a signed webhook event.",
    "Configure production invitation and activation email delivery.",
    "Attach persistent private storage for protected documents and QA evidence.",
    "Confirm onboarding blocks personalized access until the employee quiz is complete.",
    "Confirm quiz results assign the correct journey and progress persists after logout.",
    "Confirm HBT, employer, employee, message, journey, and branding data are tenant isolated.",
    "Run backend npm test and frontend npm run build before deployment.",
    "Disable diagnostic routes in production unless actively debugging.",
    "Verify a current database backup can be restored successfully.",
  ],
}));

module.exports = router;
