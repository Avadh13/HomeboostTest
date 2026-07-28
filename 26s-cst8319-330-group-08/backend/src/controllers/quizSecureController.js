const pool = require("../config/db");
const {
  adminRoles,
  getVisibleQuizzes,
  getAccessibleQuiz,
  validateQuizSubmission,
} = require("../services/quizAccessService");
const { recordAuditEvent } = require("../services/auditLogService");

exports.getQuizzes = async (req, res) => {
  try {
    const quizzes = await getVisibleQuizzes(pool, req.user);
    return res.json(quizzes);
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load quizzes" });
  }
};

exports.getQuizQuestions = async (req, res) => {
  try {
    const quiz = await getAccessibleQuiz(pool, req.user, req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ status: "error", message: "Quiz not found" });
    }

    const [questions] = await pool.query(
      `SELECT id, quiz_id, question_text, question_type,
              COALESCE(is_required, 1) AS is_required, display_order, sort_order
       FROM quiz_questions
       WHERE quiz_id = ?
       ORDER BY display_order ASC, id ASC`,
      [quiz.id],
    );

    for (const question of questions) {
      const includeCorrectness = adminRoles.has(req.user?.role);
      const [options] = await pool.query(
        `SELECT id, question_id, option_text, display_order, sort_order${includeCorrectness ? ", is_correct" : ""}
         FROM quiz_options
         WHERE question_id = ?
         ORDER BY display_order ASC, id ASC`,
        [question.id],
      );
      question.options = options;
    }

    return res.json(questions);
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load quiz questions" });
  }
};

exports.submitQuiz = async (req, res) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const { quiz, normalizedAnswers, totalQuestions } = await validateQuizSubmission(
      connection,
      req.user,
      req.body.quiz_id,
      req.body.answers,
    );

    const [submissionResult] = await connection.query(
      `INSERT INTO quiz_submissions
       (quiz_id, user_id, partnership_id, full_name, email, follow_up_status, total_questions)
       VALUES (?, ?, ?, ?, ?, 'new', ?)`,
      [
        quiz.id,
        req.user.id,
        req.user.partnership_id,
        req.user.full_name || "Employee",
        req.user.email || null,
        totalQuestions,
      ],
    );

    for (const answer of normalizedAnswers) {
      await connection.query(
        `INSERT INTO quiz_answers
         (submission_id, question_id, selected_option_id, answer_text)
         VALUES (?, ?, ?, ?)`,
        [
          submissionResult.insertId,
          answer.question_id,
          answer.selected_option_id,
          answer.answer_text,
        ],
      );
    }

    await recordAuditEvent({
      connection,
      req,
      action: "quiz.submitted",
      entityType: "quiz_submission",
      entityId: submissionResult.insertId,
      partnershipId: req.user.partnership_id,
      metadata: {
        quiz_id: quiz.id,
        answered_questions: normalizedAnswers.length,
        total_questions: totalQuestions,
      },
    });

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      status: "success",
      message: "Quiz submitted successfully",
      submission_id: submissionResult.insertId,
    });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    const statusCode = Number(error.statusCode || 500);
    return res.status(statusCode).json({
      status: "error",
      code: error.code || undefined,
      message: statusCode >= 500 ? "Failed to submit quiz" : error.message,
    });
  } finally {
    connection.release();
  }
};
