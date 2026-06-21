const pool = require("../config/db");

exports.getQuizzes = async (req, res) => {
  try {
    const [quizzes] = await pool.query(
      `SELECT * FROM quizzes ORDER BY id DESC`
    );

    res.json(quizzes);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load quizzes",
      error: error.message,
    });
  }
};

exports.createQuiz = async (req, res) => {
  try {
    const { title, description, is_active, access_type } = req.body;

    if (!title) {
      return res.status(400).json({
        status: "error",
        message: "Quiz title is required",
      });
    }

    await pool.query(
      `INSERT INTO quizzes 
       (title, description, is_active, access_type) 
       VALUES (?, ?, ?, ?)`,
      [title, description || null, is_active ?? 1, access_type || "public"]
    );

    res.status(201).json({
      status: "success",
      message: "Quiz created successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to create quiz",
      error: error.message,
    });
  }
};

exports.updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, is_active, access_type } = req.body;

    await pool.query(
      `UPDATE quizzes 
       SET title = ?, description = ?, is_active = ?, access_type = ? 
       WHERE id = ?`,
      [title, description || null, is_active ?? 1, access_type || "public", id]
    );

    res.json({
      status: "success",
      message: "Quiz updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update quiz",
      error: error.message,
    });
  }
};

exports.deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("UPDATE quizzes SET is_active = 0 WHERE id = ?", [id]);

    res.json({
      status: "success",
      message: "Quiz disabled successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to disable quiz",
      error: error.message,
    });
  }
};

exports.getQuizQuestions = async (req, res) => {
  try {
    const { quizId } = req.params;

    const [questions] = await pool.query(
      `SELECT * 
       FROM quiz_questions 
       WHERE quiz_id = ? 
       ORDER BY display_order ASC, id ASC`,
      [quizId]
    );

    for (const question of questions) {
      const [options] = await pool.query(
        `SELECT * 
         FROM quiz_options 
         WHERE question_id = ? 
         ORDER BY display_order ASC, id ASC`,
        [question.id]
      );

      question.options = options;
    }

    res.json(questions);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load quiz questions",
      error: error.message,
    });
  }
};

exports.createQuizQuestion = async (req, res) => {
  try {
    const {
      quiz_id,
      question_text,
      question_type,
      is_required,
      display_order,
      options,
    } = req.body;

    if (!quiz_id || !question_text) {
      return res.status(400).json({
        status: "error",
        message: "Quiz ID and question text are required",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO quiz_questions 
       (quiz_id, question_text, question_type, is_required, display_order) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        quiz_id,
        question_text,
        question_type || "short_text",
        is_required ?? 1,
        display_order || 0,
      ]
    );

    if (Array.isArray(options)) {
      for (let i = 0; i < options.length; i++) {
        if (options[i] && options[i].trim() !== "") {
          await pool.query(
            `INSERT INTO quiz_options 
             (question_id, option_text, display_order) 
             VALUES (?, ?, ?)`,
            [result.insertId, options[i].trim(), i + 1]
          );
        }
      }
    }

    res.status(201).json({
      status: "success",
      message: "Question created successfully",
      question_id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to create question",
      error: error.message,
    });
  }
};

exports.updateQuizQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      question_text,
      question_type,
      is_required,
      display_order,
      options,
    } = req.body;

    await pool.query(
      `UPDATE quiz_questions 
       SET question_text = ?, question_type = ?, is_required = ?, display_order = ? 
       WHERE id = ?`,
      [question_text, question_type, is_required ?? 1, display_order || 0, id]
    );

    await pool.query("DELETE FROM quiz_options WHERE question_id = ?", [id]);

    if (Array.isArray(options)) {
      for (let i = 0; i < options.length; i++) {
        if (options[i] && options[i].trim() !== "") {
          await pool.query(
            `INSERT INTO quiz_options 
             (question_id, option_text, display_order) 
             VALUES (?, ?, ?)`,
            [id, options[i].trim(), i + 1]
          );
        }
      }
    }

    res.json({
      status: "success",
      message: "Question updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update question",
      error: error.message,
    });
  }
};

exports.deleteQuizQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM quiz_questions WHERE id = ?", [id]);

    res.json({
      status: "success",
      message: "Question deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete question",
      error: error.message,
    });
  }
};

exports.createQuizOption = async (req, res) => {
  try {
    const { question_id, option_text, display_order } = req.body;

    if (!question_id || !option_text) {
      return res.status(400).json({
        status: "error",
        message: "Question ID and option text are required",
      });
    }

    await pool.query(
      `INSERT INTO quiz_options 
       (question_id, option_text, display_order) 
       VALUES (?, ?, ?)`,
      [question_id, option_text.trim(), display_order || 0]
    );

    res.status(201).json({
      status: "success",
      message: "Option created successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to create option",
      error: error.message,
    });
  }
};

exports.updateQuizOption = async (req, res) => {
  try {
    const { id } = req.params;
    const { option_text, display_order } = req.body;

    await pool.query(
      `UPDATE quiz_options 
       SET option_text = ?, display_order = ? 
       WHERE id = ?`,
      [option_text, display_order || 0, id]
    );

    res.json({
      status: "success",
      message: "Option updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update option",
      error: error.message,
    });
  }
};

exports.deleteQuizOption = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM quiz_options WHERE id = ?", [id]);

    res.json({
      status: "success",
      message: "Option deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete option",
      error: error.message,
    });
  }
};

exports.submitQuiz = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { quiz_id, answers } = req.body;
    const user = req.user;

    if (!user || user.role !== "employee") {
      return res.status(403).json({
        status: "error",
        message: "Only employees can submit quizzes",
      });
    }

    if (!quiz_id || !Array.isArray(answers)) {
      return res.status(400).json({
        status: "error",
        message: "Quiz ID and answers are required",
      });
    }

    await connection.beginTransaction();

    const [submissionResult] = await connection.query(
      `INSERT INTO quiz_submissions 
       (quiz_id, user_id, partnership_id, full_name, email, follow_up_status) 
       VALUES (?, ?, ?, ?, ?, 'new')`,
      [
        quiz_id,
        user.id,
        user.partnership_id || null,
        user.full_name || "Employee",
        user.email || null,
      ]
    );

    const submissionId = submissionResult.insertId;

    for (const answer of answers) {
      await connection.query(
        `INSERT INTO quiz_answers 
         (submission_id, question_id, answer_text) 
         VALUES (?, ?, ?)`,
        [
          submissionId,
          answer.question_id,
          Array.isArray(answer.answer_text)
            ? answer.answer_text.join(", ")
            : answer.answer_text || "",
        ]
      );
    }

    await connection.commit();

    res.status(201).json({
      status: "success",
      message: "Quiz submitted successfully",
      submission_id: submissionId,
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      status: "error",
      message: "Failed to submit quiz",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.getQuizSubmissions = async (req, res) => {
  try {
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
        p.slug AS partnership_slug

       FROM quiz_submissions qs
       LEFT JOIN quizzes q ON qs.quiz_id = q.id
       LEFT JOIN users u ON qs.user_id = u.id
       LEFT JOIN partnerships p ON qs.partnership_id = p.id
       LEFT JOIN employers e ON p.employer_id = e.id
       LEFT JOIN home_buying_teams h ON p.team_id = h.id
       ${whereClause}
       ORDER BY qs.id DESC`,
      params
    );

    for (const submission of submissions) {
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

    res.json(submissions);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load quiz submissions",
      error: error.message,
    });
  }
};

exports.getQuizSubmissionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    let whereClause = "WHERE qs.id = ?";
    const params = [id];

    if (user.role === "hbt_admin") {
      whereClause += " AND p.team_id = ?";
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
        p.slug AS partnership_slug

       FROM quiz_submissions qs
       LEFT JOIN quizzes q ON qs.quiz_id = q.id
       LEFT JOIN users u ON qs.user_id = u.id
       LEFT JOIN partnerships p ON qs.partnership_id = p.id
       LEFT JOIN employers e ON p.employer_id = e.id
       LEFT JOIN home_buying_teams h ON p.team_id = h.id
       ${whereClause}`,
      params
    );

    if (submissions.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Submission not found or not assigned to your team",
      });
    }

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
      [id]
    );

    res.json({
      submission: submissions[0],
      answers,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load submission details",
      error: error.message,
    });
  }
};

exports.updateQuizSubmissionFollowUpStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { follow_up_status } = req.body;
    const user = req.user;

    const allowedStatuses = [
      "new",
      "contacted",
      "in_progress",
      "completed",
      "not_interested",
    ];

    if (!allowedStatuses.includes(follow_up_status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid follow-up status",
      });
    }

    let whereClause = "WHERE qs.id = ?";
    const params = [id];

    if (user.role === "hbt_admin") {
      whereClause += " AND p.team_id = ?";
      params.push(user.team_id);
    }

    const [submissions] = await pool.query(
      `SELECT qs.id
       FROM quiz_submissions qs
       LEFT JOIN partnerships p ON qs.partnership_id = p.id
       ${whereClause}
       LIMIT 1`,
      params
    );

    if (submissions.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Submission not found or not assigned to your team",
      });
    }

    await pool.query(
      `UPDATE quiz_submissions 
       SET follow_up_status = ? 
       WHERE id = ?`,
      [follow_up_status, id]
    );

    res.json({
      status: "success",
      message: "Follow-up status updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update follow-up status",
      error: error.message,
    });
  }
};