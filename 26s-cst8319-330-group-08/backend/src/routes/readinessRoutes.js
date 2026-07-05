const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");
const { ensureAdvancedLeadTables, calculateReadinessForSubmission } = require("../services/readinessService");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const hbtRoles = ["hbt_admin", "hbt_member"];

const isAdmin = (user) => adminRoles.includes(user?.role);
const isHbt = (user) => hbtRoles.includes(user?.role);
const parseJson = (value, fallback = []) => {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
};
const normalize = (row) => ({
  ...row,
  score: Number(row.score || 0),
  risk_factors: parseJson(row.risk_factors, []),
  recommendations: parseJson(row.recommendations, []),
});
const teamAccess = (user) => {
  if (isAdmin(user)) return { where: "", params: [] };
  if (isHbt(user)) return { where: "WHERE p.team_id = ?", params: [user.team_id] };
  return { where: "WHERE p.team_id = -1", params: [] };
};

router.get("/me", protect, async (req, res) => {
  try {
    if (req.user.role !== "employee") return res.status(403).json({ status: "error", message: "Employee access required" });
    await ensureAdvancedLeadTables();
    const [rows] = await pool.query(
      `SELECT ers.*, lp.stage AS lead_stage, lp.priority AS lead_priority, lp.next_action AS lead_next_action, lp.follow_up_due_at
       FROM employee_readiness_scores ers
       LEFT JOIN lead_pipeline lp ON lp.employee_user_id = ers.user_id
       WHERE ers.user_id = ?
       LIMIT 1`,
      [req.user.id]
    );
    if (!rows.length) return res.json({ status: "success", readiness: null, recommendations: [] });
    const [recommendations] = await pool.query(
      `SELECT id, recommendation_text, recommendation_type, is_completed, created_at
       FROM employee_recommendations
       WHERE user_id = ?
       ORDER BY id ASC`,
      [req.user.id]
    );
    return res.json({ status: "success", readiness: normalize(rows[0]), recommendations });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load readiness score", error: error.message });
  }
});

router.get("/hbt", protect, async (req, res) => {
  try {
    if (!isAdmin(req.user) && !isHbt(req.user)) return res.status(403).json({ status: "error", message: "HBT or Admin access required" });
    await ensureAdvancedLeadTables();
    const access = teamAccess(req.user);
    const [rows] = await pool.query(
      `SELECT ers.id, ers.user_id, ers.partnership_id, ers.latest_submission_id, ers.score, ers.level, ers.priority,
        ers.summary, ers.risk_factors, ers.recommendations, ers.calculated_at,
        u.full_name AS employee_name, u.email AS employee_email,
        e.name AS company_name, h.name AS team_name, p.slug AS partnership_slug,
        lp.id AS lead_id, lp.stage AS lead_stage, lp.status AS lead_status, lp.next_action, lp.follow_up_due_at,
        advisor.full_name AS assigned_advisor_name
       FROM employee_readiness_scores ers
       JOIN users u ON u.id = ers.user_id
       LEFT JOIN partnerships p ON p.id = ers.partnership_id
       LEFT JOIN employers e ON e.id = p.employer_id
       LEFT JOIN home_buying_teams h ON h.id = p.team_id
       LEFT JOIN lead_pipeline lp ON lp.employee_user_id = ers.user_id
       LEFT JOIN users advisor ON advisor.id = lp.assigned_team_member_user_id
       ${access.where}
       ORDER BY CASE ers.priority WHEN 'hot' THEN 1 WHEN 'warm' THEN 2 ELSE 3 END, ers.score DESC, ers.calculated_at DESC`,
      access.params
    );
    return res.json({ status: "success", readiness_scores: rows.map(normalize) });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load HBT readiness scores", error: error.message });
  }
});

router.get("/employee/:employeeId", protect, async (req, res) => {
  try {
    if (!isAdmin(req.user) && !isHbt(req.user)) return res.status(403).json({ status: "error", message: "HBT or Admin access required" });
    await ensureAdvancedLeadTables();
    const access = teamAccess(req.user);
    const [rows] = await pool.query(
      `SELECT ers.*, u.full_name AS employee_name, u.email AS employee_email, e.name AS company_name, p.slug AS partnership_slug,
        lp.id AS lead_id, lp.stage AS lead_stage, lp.priority AS lead_priority, lp.next_action, lp.follow_up_due_at
       FROM employee_readiness_scores ers
       JOIN users u ON u.id = ers.user_id
       LEFT JOIN partnerships p ON p.id = ers.partnership_id
       LEFT JOIN employers e ON e.id = p.employer_id
       LEFT JOIN lead_pipeline lp ON lp.employee_user_id = ers.user_id
       WHERE ers.user_id = ? ${access.where ? "AND p.team_id = ?" : ""}
       LIMIT 1`,
      [req.params.employeeId, ...access.params]
    );
    if (!rows.length) return res.status(404).json({ status: "error", message: "Readiness score not found" });
    return res.json({ status: "success", readiness: normalize(rows[0]) });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load employee readiness", error: error.message });
  }
});

router.post("/calculate", protect, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { submission_id } = req.body;
    if (!submission_id) return res.status(400).json({ status: "error", message: "submission_id is required" });
    await connection.beginTransaction();
    if (req.user.role === "employee") {
      const [owned] = await connection.query(`SELECT id FROM quiz_submissions WHERE id = ? AND user_id = ? LIMIT 1`, [submission_id, req.user.id]);
      if (!owned.length) {
        await connection.rollback();
        return res.status(403).json({ status: "error", message: "Submission is not owned by this employee" });
      }
    } else if (!isAdmin(req.user) && !isHbt(req.user)) {
      await connection.rollback();
      return res.status(403).json({ status: "error", message: "Access required" });
    }
    const readiness = await calculateReadinessForSubmission(connection, submission_id);
    await connection.commit();
    return res.json({ status: "success", message: "Readiness calculated", readiness });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to calculate readiness", error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
