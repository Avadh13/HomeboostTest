const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const hbtRoles = ["hbt_admin", "hbt_member"];

const isAdmin = (user) => adminRoles.includes(user?.role);
const isHbt = (user) => hbtRoles.includes(user?.role);
const isCompany = (user) => ["company", "company_admin"].includes(user?.role);

const ensureAnalyticsTables = async (connection = pool) => {
  await connection.query(`CREATE TABLE IF NOT EXISTS employee_activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    partnership_id INT NULL,
    activity_type VARCHAR(80) NOT NULL,
    activity_label VARCHAR(255) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_partnership (partnership_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_activity_created (created_at)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS company_engagement_summary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partnership_id INT NOT NULL,
    total_employees INT DEFAULT 0,
    active_employees INT DEFAULT 0,
    quiz_completion_rate DECIMAL(5,2) DEFAULT 0,
    appointment_count INT DEFAULT 0,
    resource_view_count INT DEFAULT 0,
    average_readiness_score DECIMAL(5,2) DEFAULT 0,
    engagement_score INT DEFAULT 0,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_company_summary_partnership (partnership_id)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS resource_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT NOT NULL,
    user_id INT NOT NULL,
    partnership_id INT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_resource_views_resource (resource_id),
    INDEX idx_resource_views_user (user_id),
    INDEX idx_resource_views_partnership (partnership_id),
    INDEX idx_resource_views_viewed_at (viewed_at)
  )`);
};

const safePercent = (part, total) => (total > 0 ? Math.round((Number(part || 0) / total) * 10000) / 100 : 0);
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const parseRiskFactors = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const canAccessPartnership = async (user, partnershipId) => {
  if (!partnershipId) return false;
  if (isAdmin(user)) return true;
  if (isCompany(user)) return Number(user.partnership_id) === Number(partnershipId);
  if (isHbt(user)) {
    const [[row]] = await pool.query("SELECT id FROM partnerships WHERE id = ? AND team_id = ? LIMIT 1", [partnershipId, user.team_id]);
    return Boolean(row);
  }
  return false;
};

const getPartnershipHeader = async (partnershipId) => {
  const [[partnership]] = await pool.query(
    `SELECT p.id, p.slug, p.status, e.name AS employer_name, e.logo_url, h.name AS team_name
     FROM partnerships p
     LEFT JOIN employers e ON e.id = p.employer_id
     LEFT JOIN home_buying_teams h ON h.id = p.team_id
     WHERE p.id = ?
     LIMIT 1`,
    [partnershipId]
  );
  return partnership || null;
};

const calculateSummary = async (partnershipId) => {
  await ensureAnalyticsTables();

  const [[employeeStats]] = await pool.query(
    `SELECT COUNT(*) AS total_employees, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS enabled_employees
     FROM users
     WHERE role = 'employee' AND partnership_id = ?`,
    [partnershipId]
  );

  const totalEmployees = Number(employeeStats?.total_employees || 0);
  const enabledEmployees = Number(employeeStats?.enabled_employees || 0);

  const [[activityStats]] = await pool.query(
    `SELECT COUNT(DISTINCT user_id) AS active_employees
     FROM employee_activity_logs
     WHERE partnership_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)`,
    [partnershipId]
  );

  const [[quizStats]] = await pool.query(
    `SELECT COUNT(*) AS total_submissions, COUNT(DISTINCT user_id) AS employees_with_quiz
     FROM quiz_submissions
     WHERE partnership_id = ?`,
    [partnershipId]
  );

  const [[appointmentStats]] = await pool.query(
    `SELECT COUNT(*) AS appointment_count, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_appointments
     FROM appointments
     WHERE partnership_id = ?`,
    [partnershipId]
  );

  const [[resourceStats]] = await pool.query(
    `SELECT COUNT(*) AS resource_view_count, COUNT(DISTINCT user_id) AS employees_viewed_resources
     FROM resource_views
     WHERE partnership_id = ?`,
    [partnershipId]
  );

  const [[readinessStats]] = await pool.query(
    `SELECT
       AVG(score) AS average_readiness_score,
       SUM(CASE WHEN priority = 'hot' THEN 1 ELSE 0 END) AS hot_leads,
       SUM(CASE WHEN priority = 'warm' THEN 1 ELSE 0 END) AS warm_leads,
       SUM(CASE WHEN priority = 'cold' THEN 1 ELSE 0 END) AS cold_leads,
       SUM(CASE WHEN level = 'Ready' THEN 1 ELSE 0 END) AS ready_count,
       SUM(CASE WHEN level = 'Almost Ready' THEN 1 ELSE 0 END) AS almost_ready_count,
       SUM(CASE WHEN level = 'Needs Preparation' THEN 1 ELSE 0 END) AS needs_preparation_count,
       SUM(CASE WHEN level = 'High Support Needed' THEN 1 ELSE 0 END) AS high_support_count
     FROM employee_readiness_scores
     WHERE partnership_id = ?`,
    [partnershipId]
  );

  const [riskRows] = await pool.query(
    `SELECT risk_factors
     FROM employee_readiness_scores
     WHERE partnership_id = ?
     ORDER BY calculated_at DESC
     LIMIT 100`,
    [partnershipId]
  );

  const riskCounts = new Map();
  riskRows.forEach((row) => {
    parseRiskFactors(row.risk_factors).forEach((risk) => {
      riskCounts.set(risk, (riskCounts.get(risk) || 0) + 1);
    });
  });

  const topNeeds = Array.from(riskCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, count]) => ({ label, count }));

  const activeEmployees = Math.max(Number(activityStats?.active_employees || 0), Number(quizStats?.employees_with_quiz || 0), Number(resourceStats?.employees_viewed_resources || 0));
  const quizCompletionRate = safePercent(quizStats?.employees_with_quiz, totalEmployees);
  const appointmentRate = safePercent(appointmentStats?.appointment_count, Math.max(totalEmployees, 1));
  const resourceUsageRate = safePercent(resourceStats?.employees_viewed_resources, totalEmployees);
  const activeEmployeeRate = safePercent(activeEmployees, totalEmployees || enabledEmployees || 1);
  const engagementScore = Math.round(clamp((quizCompletionRate * 0.3) + (appointmentRate * 0.25) + (resourceUsageRate * 0.2) + (activeEmployeeRate * 0.25)));
  const averageReadinessScore = Math.round(Number(readinessStats?.average_readiness_score || 0) * 100) / 100;

  const summary = {
    partnership_id: Number(partnershipId),
    total_employees: totalEmployees,
    enabled_employees: enabledEmployees,
    active_employees: activeEmployees,
    active_employee_rate: activeEmployeeRate,
    quiz_completion_rate: quizCompletionRate,
    total_quiz_submissions: Number(quizStats?.total_submissions || 0),
    appointment_count: Number(appointmentStats?.appointment_count || 0),
    pending_appointments: Number(appointmentStats?.pending_appointments || 0),
    appointment_rate: appointmentRate,
    resource_view_count: Number(resourceStats?.resource_view_count || 0),
    employees_viewed_resources: Number(resourceStats?.employees_viewed_resources || 0),
    resource_usage_rate: resourceUsageRate,
    average_readiness_score: averageReadinessScore,
    engagement_score: engagementScore,
    hot_leads: Number(readinessStats?.hot_leads || 0),
    warm_leads: Number(readinessStats?.warm_leads || 0),
    cold_leads: Number(readinessStats?.cold_leads || 0),
    readiness_mix: {
      ready: Number(readinessStats?.ready_count || 0),
      almost_ready: Number(readinessStats?.almost_ready_count || 0),
      needs_preparation: Number(readinessStats?.needs_preparation_count || 0),
      high_support: Number(readinessStats?.high_support_count || 0),
    },
    top_employee_needs: topNeeds,
    calculated_at: new Date().toISOString(),
  };

  await pool.query(
    `INSERT INTO company_engagement_summary
     (partnership_id, total_employees, active_employees, quiz_completion_rate, appointment_count, resource_view_count, average_readiness_score, engagement_score, calculated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       total_employees = VALUES(total_employees),
       active_employees = VALUES(active_employees),
       quiz_completion_rate = VALUES(quiz_completion_rate),
       appointment_count = VALUES(appointment_count),
       resource_view_count = VALUES(resource_view_count),
       average_readiness_score = VALUES(average_readiness_score),
       engagement_score = VALUES(engagement_score),
       calculated_at = NOW()`,
    [
      partnershipId,
      summary.total_employees,
      summary.active_employees,
      summary.quiz_completion_rate,
      summary.appointment_count,
      summary.resource_view_count,
      summary.average_readiness_score,
      summary.engagement_score,
    ]
  );

  return summary;
};

router.get("/summary", protect, async (req, res) => {
  try {
    if (!isCompany(req.user)) return res.status(403).json({ status: "error", message: "Company manager access required" });
    if (!req.user.partnership_id) return res.status(400).json({ status: "error", message: "Company account is not linked to a partnership" });

    const partnership = await getPartnershipHeader(req.user.partnership_id);
    const summary = await calculateSummary(req.user.partnership_id);
    return res.json({ status: "success", partnership, summary });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load company analytics", error: error.message });
  }
});

router.get("/admin/:partnershipId", protect, async (req, res) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ status: "error", message: "Admin access required" });
    const partnership = await getPartnershipHeader(req.params.partnershipId);
    if (!partnership) return res.status(404).json({ status: "error", message: "Partnership not found" });
    const summary = await calculateSummary(req.params.partnershipId);
    return res.json({ status: "success", partnership, summary });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load admin company analytics", error: error.message });
  }
});

router.get("/hbt/:partnershipId", protect, async (req, res) => {
  try {
    if (!isHbt(req.user) && !isAdmin(req.user)) return res.status(403).json({ status: "error", message: "HBT access required" });
    const allowed = await canAccessPartnership(req.user, req.params.partnershipId);
    if (!allowed) return res.status(404).json({ status: "error", message: "Partnership not found or not assigned to your team" });
    const partnership = await getPartnershipHeader(req.params.partnershipId);
    const summary = await calculateSummary(req.params.partnershipId);
    return res.json({ status: "success", partnership, summary });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load HBT company analytics", error: error.message });
  }
});

router.post("/activity", protect, async (req, res) => {
  try {
    if (req.user.role !== "employee") return res.status(403).json({ status: "error", message: "Employee access required" });
    await ensureAnalyticsTables();
    const activityType = String(req.body.activity_type || "portal_activity").slice(0, 80);
    const activityLabel = String(req.body.activity_label || "Employee activity").slice(0, 255);
    await pool.query(
      `INSERT INTO employee_activity_logs (user_id, partnership_id, activity_type, activity_label, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, req.user.partnership_id || null, activityType, activityLabel, JSON.stringify(req.body.metadata || {})]
    );
    return res.json({ status: "success", message: "Activity logged" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to log activity", error: error.message });
  }
});

module.exports = router;
