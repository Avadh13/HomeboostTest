const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");
const { ensureQuizJourneyTables, assignJourneyForSubmission } = require("../services/quizJourneyService");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const canManage = (user) => adminRoles.includes(user?.role) || user?.role === "hbt_admin";
const clean = (value, max = 255) => String(value || "").trim().slice(0, max);

router.use(protect);

router.get("/rules", async (req, res) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ status: "error", message: "Admin or HBT admin access required" });
    await ensureQuizJourneyTables();
    const params = [];
    let clause = "WHERE 1=1";
    if (req.user.role === "hbt_admin") {
      clause += " AND (qjr.team_id IS NULL OR qjr.team_id = ?)";
      params.push(req.user.team_id);
    }
    const [rules] = await pool.query(
      `SELECT qjr.*, q.title AS quiz_title, j.title AS journey_title
       FROM quiz_journey_rules qjr
       LEFT JOIN quizzes q ON q.id = qjr.quiz_id
       LEFT JOIN journeys j ON j.id = qjr.journey_id
       ${clause}
       ORDER BY qjr.priority ASC, qjr.id DESC`,
      params
    );
    return res.json({ status: "success", rules });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load quiz journey rules", error: error.message });
  }
});

router.post("/rules", async (req, res) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ status: "error", message: "Admin or HBT admin access required" });
    await ensureQuizJourneyTables();
    const ruleName = clean(req.body.rule_name, 180);
    const journeyId = Number(req.body.journey_id);
    if (!ruleName || !journeyId) return res.status(400).json({ status: "error", message: "rule_name and journey_id are required" });
    const teamId = req.user.role === "hbt_admin" ? req.user.team_id : req.body.team_id || null;
    const [result] = await pool.query(
      `INSERT INTO quiz_journey_rules
       (team_id, quiz_id, journey_id, rule_name, readiness_level, readiness_priority, answer_keyword, min_score, max_score, priority, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        teamId,
        req.body.quiz_id || null,
        journeyId,
        ruleName,
        clean(req.body.readiness_level, 80) || null,
        clean(req.body.readiness_priority, 40) || null,
        clean(req.body.answer_keyword, 180) || null,
        req.body.min_score ?? null,
        req.body.max_score ?? null,
        Number(req.body.priority || 100),
        req.body.is_active ?? 1,
      ]
    );
    return res.status(201).json({ status: "success", rule_id: result.insertId });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to create quiz journey rule", error: error.message });
  }
});

router.put("/rules/:id", async (req, res) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ status: "error", message: "Admin or HBT admin access required" });
    await ensureQuizJourneyTables();
    const ruleName = clean(req.body.rule_name, 180);
    const journeyId = Number(req.body.journey_id);
    if (!ruleName || !journeyId) return res.status(400).json({ status: "error", message: "rule_name and journey_id are required" });
    const teamId = req.user.role === "hbt_admin" ? req.user.team_id : req.body.team_id || null;
    await pool.query(
      `UPDATE quiz_journey_rules
       SET team_id = ?, quiz_id = ?, journey_id = ?, rule_name = ?, readiness_level = ?, readiness_priority = ?, answer_keyword = ?, min_score = ?, max_score = ?, priority = ?, is_active = ?
       WHERE id = ?`,
      [
        teamId,
        req.body.quiz_id || null,
        journeyId,
        ruleName,
        clean(req.body.readiness_level, 80) || null,
        clean(req.body.readiness_priority, 40) || null,
        clean(req.body.answer_keyword, 180) || null,
        req.body.min_score ?? null,
        req.body.max_score ?? null,
        Number(req.body.priority || 100),
        req.body.is_active ?? 1,
        req.params.id,
      ]
    );
    return res.json({ status: "success", message: "Quiz journey rule updated" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update quiz journey rule", error: error.message });
  }
});

router.delete("/rules/:id", async (req, res) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ status: "error", message: "Admin or HBT admin access required" });
    await ensureQuizJourneyTables();
    await pool.query("UPDATE quiz_journey_rules SET is_active = 0 WHERE id = ?", [req.params.id]);
    return res.json({ status: "success", message: "Quiz journey rule disabled" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to disable quiz journey rule", error: error.message });
  }
});

router.post("/apply/:submissionId", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (!canManage(req.user)) return res.status(403).json({ status: "error", message: "Admin or HBT admin access required" });
    await connection.beginTransaction();
    const assignment = await assignJourneyForSubmission(connection, Number(req.params.submissionId));
    await connection.commit();
    return res.json({ status: "success", assignment });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to apply quiz journey mapping", error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
