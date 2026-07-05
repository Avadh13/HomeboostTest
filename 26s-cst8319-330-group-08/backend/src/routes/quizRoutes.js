const express = require("express");
const router = express.Router();

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const quizController = require("../controllers/quizController");
const { ensureAdvancedLeadTables, calculateReadinessForSubmission } = require("../services/readinessService");

const adminOrHbtOnly = (req, res, next) => {
  if (
    !req.user ||
    !["admin", "super_admin", "hbt_admin", "hbt_member"].includes(req.user.role)
  ) {
    return res.status(403).json({
      message: "Admin or HBT access required",
    });
  }

  next();
};

const adminOnly = (req, res, next) => {
  if (
    !req.user ||
    !["admin", "super_admin"].includes(req.user.role)
  ) {
    return res.status(403).json({
      message: "Admin access required",
    });
  }

  next();
};

const submitQuizWithReadiness = async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = async (body) => {
    if (res.statusCode === 201 && body?.submission_id) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const readiness = await calculateReadinessForSubmission(connection, body.submission_id);
        await connection.commit();
        return originalJson({ ...body, readiness });
      } catch (error) {
        await connection.rollback();
        return originalJson({
          ...body,
          readiness_warning: "Quiz saved, but readiness score could not be calculated automatically.",
          readiness_error: error.message,
        });
      } finally {
        connection.release();
      }
    }

    return originalJson(body);
  };

  return quizController.submitQuiz(req, res, next);
};

const latestQuizSubmissionsOnly = async (req, res) => {
  try {
    await ensureAdvancedLeadTables();

    const user = req.user;
    let whereClause = "";
    const params = [];

    if (user.role === "hbt_admin" || user.role === "hbt_member") {
      whereClause = "WHERE p.team_id = ?";
      params.push(user.team_id);
    }

    const [submissions] = await pool.query(
      `SELECT 
        qs.id,
        qs.quiz_id,
        qs.user_id,
        qs.partnership_id,
        qs.submitted_at,
        COALESCE(qs.follow_up_status, 'new') AS follow_up_status,
        q.title AS quiz_title,
        COALESCE(qs.full_name, u.full_name, 'Employee') AS employee_name,
        COALESCE(qs.email, u.email, '') AS employee_email,
        e.name AS company_name,
        h.name AS team_name,
        p.slug AS partnership_slug,
        ers.score AS readiness_score,
        ers.level AS readiness_level,
        ers.priority AS readiness_priority,
        ers.summary AS readiness_summary,
        lp.id AS lead_id,
        lp.stage AS lead_stage,
        lp.priority AS lead_priority,
        lp.next_action AS lead_next_action,
        lp.follow_up_due_at AS lead_follow_up_due_at
       FROM quiz_submissions qs
       LEFT JOIN quizzes q ON qs.quiz_id = q.id
       LEFT JOIN users u ON qs.user_id = u.id
       LEFT JOIN partnerships p ON qs.partnership_id = p.id
       LEFT JOIN employers e ON p.employer_id = e.id
       LEFT JOIN home_buying_teams h ON p.team_id = h.id
       LEFT JOIN employee_readiness_scores ers ON ers.latest_submission_id = qs.id
       LEFT JOIN lead_pipeline lp ON lp.employee_user_id = qs.user_id
       ${whereClause}
       ORDER BY qs.submitted_at DESC, qs.id DESC`,
      params
    );

    const latestMap = new Map();

    submissions.forEach((submission) => {
      const employeeKey = submission.user_id || String(submission.employee_email || "").toLowerCase() || submission.id;
      const quizKey = `${submission.quiz_id || submission.quiz_title || "quiz"}:${employeeKey}`;
      const existing = latestMap.get(quizKey);

      if (!existing) {
        latestMap.set(quizKey, {
          ...submission,
          is_latest_submission: true,
          older_submission_count: 0,
        });
      } else {
        existing.older_submission_count = Number(existing.older_submission_count || 0) + 1;
      }
    });

    const latestSubmissions = Array.from(latestMap.values());

    for (const submission of latestSubmissions) {
      const [answers] = await pool.query(
        `SELECT 
          qa.id,
          qa.answer_text,
          qq.question_text,
          qq.question_type,
          qq.display_order
         FROM quiz_answers qa
         LEFT JOIN quiz_questions qq ON qa.question_id = qq.id
         WHERE qa.submission_id = ?
         ORDER BY qq.display_order ASC, qa.id ASC`,
        [submission.id]
      );

      submission.answers = answers;
    }

    return res.json(latestSubmissions);
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Failed to load latest quiz submissions",
      error: error.message,
    });
  }
};

/*
  Quiz submissions:
  - Admin/Super Admin can see latest submissions for all employees
  - HBT Admin/HBT Member can see latest submissions from partnerships assigned to their team
  - Older attempts are hidden from the follow-up queue so advisors focus on the newest quiz only
*/
router.get(
  "/submissions",
  authMiddleware,
  adminOrHbtOnly,
  latestQuizSubmissionsOnly
);

router.get(
  "/submissions/:id",
  authMiddleware,
  adminOrHbtOnly,
  quizController.getQuizSubmissionDetails
);

router.put(
  "/submissions/:id/follow-up-status",
  authMiddleware,
  adminOrHbtOnly,
  quizController.updateQuizSubmissionFollowUpStatus
);

/*
  Public/employee quiz reading
*/
router.get("/", quizController.getQuizzes);

router.get("/:quizId/questions", quizController.getQuizQuestions);

/*
  Admin quiz management
*/
router.post("/", authMiddleware, adminOnly, quizController.createQuiz);
router.put("/:id", authMiddleware, adminOnly, quizController.updateQuiz);
router.delete("/:id", authMiddleware, adminOnly, quizController.deleteQuiz);

router.post(
  "/questions",
  authMiddleware,
  adminOnly,
  quizController.createQuizQuestion
);

router.put(
  "/questions/:id",
  authMiddleware,
  adminOnly,
  quizController.updateQuizQuestion
);

router.delete(
  "/questions/:id",
  authMiddleware,
  adminOnly,
  quizController.deleteQuizQuestion
);

router.post(
  "/options",
  authMiddleware,
  adminOnly,
  quizController.createQuizOption
);

router.put(
  "/options/:id",
  authMiddleware,
  adminOnly,
  quizController.updateQuizOption
);

router.delete(
  "/options/:id",
  authMiddleware,
  adminOnly,
  quizController.deleteQuizOption
);

/*
  Employee quiz submit
*/
router.post("/submit", authMiddleware, submitQuizWithReadiness);

module.exports = router;
