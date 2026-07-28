const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");
const { ensureQuizJourneyTables, assignJourneyForSubmission } = require("../services/quizJourneyService");
const {
  isAdmin,
  isHbtAdmin,
  hasTeam,
  getRuleForManage,
  validateRuleReferences,
  getSubmissionForApply,
} = require("../services/quizJourneyAccessService");

const router = express.Router();
const clean = (value, max = 255) => String(value || "").trim().slice(0, max);
const canManage = (user) => isAdmin(user) || isHbtAdmin(user);

router.use(protect);

router.get("/rules", async (req, res) => {
  try {
    if (!canManage(req.user)) {
      return res.status(403).json({ status: "error", message: "Admin or HBT Admin access required" });
    }
    if (isHbtAdmin(req.user) && !hasTeam(req.user)) {
      return res.status(403).json({ status: "error", message: "HBT account is not linked to a team" });
    }

    await ensureQuizJourneyTables();
    const params = [];
    let clause = "WHERE 1=1";
    if (isHbtAdmin(req.user)) {
      clause += " AND qjr.team_id = ?";
      params.push(req.user.team_id);
    }

    const [rules] = await pool.query(
      `SELECT qjr.*, q.title AS quiz_title, j.title AS journey_title
       FROM quiz_journey_rules qjr
       LEFT JOIN quizzes q ON q.id = qjr.quiz_id
       JOIN journeys j ON j.id = qjr.journey_id
       ${clause}
       ORDER BY qjr.priority ASC, qjr.id DESC`,
      params,
    );
    return res.json({ status: "success", rules });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load quiz journey rules" });
  }
});

router.post("/rules", async (req, res) => {
  try {
    if (!canManage(req.user)) {
      return res.status(403).json({ status: "error", message: "Admin or HBT Admin access required" });
    }

    await ensureQuizJourneyTables();
    const ruleName = clean(req.body.rule_name, 180);
    if (!ruleName) {
      return res.status(400).json({ status: "error", message: "rule_name is required" });
    }

    const references = await validateRuleReferences(req.user, req.body);
    if (!references) {
      return res.status(404).json({ status: "error", message: "Quiz or journey is not available in this team" });
    }

    const [result] = await pool.query(
      `INSERT INTO quiz_journey_rules
       (team_id, quiz_id, journey_id, rule_name, readiness_level, readiness_priority, answer_keyword, min_score, max_score, priority, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        references.teamId,
        references.quizId,
        references.journeyId,
        ruleName,
        clean(req.body.readiness_level, 80) || null,
        clean(req.body.readiness_priority, 40) || null,
        clean(req.body.answer_keyword, 180) || null,
        req.body.min_score ?? null,
        req.body.max_score ?? null,
        Number(req.body.priority || 100),
        req.body.is_active ?? 1,
      ],
    );
    return res.status(201).json({ status: "success", rule_id: result.insertId });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to create quiz journey rule" });
  }
});

router.put("/rules/:id", async (req, res) => {
  try {
    if (!canManage(req.user)) {
      return res.status(403).json({ status: "error", message: "Admin or HBT Admin access required" });
    }

    await ensureQuizJourneyTables();
    const existingRule = await getRuleForManage(req.user, req.params.id);
    if (!existingRule) {
      return res.status(404).json({ status: "error", message: "Quiz journey rule not found" });
    }

    const ruleName = clean(req.body.rule_name, 180);
    if (!ruleName) {
      return res.status(400).json({ status: "error", message: "rule_name is required" });
    }

    const references = await validateRuleReferences(req.user, {
      ...req.body,
      team_id: isHbtAdmin(req.user) ? req.user.team_id : req.body.team_id,
    });
    if (!references) {
      return res.status(404).json({ status: "error", message: "Quiz or journey is not available in this team" });
    }

    const [result] = await pool.query(
      `UPDATE quiz_journey_rules
       SET team_id = ?, quiz_id = ?, journey_id = ?, rule_name = ?, readiness_level = ?, readiness_priority = ?, answer_keyword = ?, min_score = ?, max_score = ?, priority = ?, is_active = ?
       WHERE id = ?`,
      [
        references.teamId,
        references.quizId,
        references.journeyId,
        ruleName,
        clean(req.body.readiness_level, 80) || null,
        clean(req.body.readiness_priority, 40) || null,
        clean(req.body.answer_keyword, 180) || null,
        req.body.min_score ?? null,
        req.body.max_score ?? null,
        Number(req.body.priority || 100),
        req.body.is_active ?? 1,
        existingRule.id,
      ],
    );

    if (Number(result.affectedRows || 0) !== 1) {
      return res.status(404).json({ status: "error", message: "Quiz journey rule not found" });
    }
    return res.json({ status: "success", message: "Quiz journey rule updated" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update quiz journey rule" });
  }
});

router.delete("/rules/:id", async (req, res) => {
  try {
    if (!canManage(req.user)) {
      return res.status(403).json({ status: "error", message: "Admin or HBT Admin access required" });
    }

    await ensureQuizJourneyTables();
    const existingRule = await getRuleForManage(req.user, req.params.id);
    if (!existingRule) {
      return res.status(404).json({ status: "error", message: "Quiz journey rule not found" });
    }

    const [result] = await pool.query(
      "UPDATE quiz_journey_rules SET is_active = 0 WHERE id = ?",
      [existingRule.id],
    );
    if (Number(result.affectedRows || 0) !== 1) {
      return res.status(404).json({ status: "error", message: "Quiz journey rule not found" });
    }
    return res.json({ status: "success", message: "Quiz journey rule disabled" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to disable quiz journey rule" });
  }
});

router.post("/apply/:submissionId", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (!canManage(req.user)) {
      return res.status(403).json({ status: "error", message: "Admin or HBT Admin access required" });
    }

    await ensureQuizJourneyTables(connection);
    const submission = await getSubmissionForApply(req.user, req.params.submissionId, connection);
    if (!submission) {
      return res.status(404).json({ status: "error", message: "Quiz submission not found" });
    }

    await connection.beginTransaction();
    const assignment = await assignJourneyForSubmission(connection, submission.id, {
      assignedBy: req.user.id,
      restrictedTeamId: isHbtAdmin(req.user) ? req.user.team_id : null,
    });
    await connection.commit();
    return res.json({ status: "success", assignment });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to apply quiz journey mapping" });
  } finally {
    connection.release();
  }
});

module.exports = router;
