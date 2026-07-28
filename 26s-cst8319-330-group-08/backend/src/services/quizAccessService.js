const adminRoles = new Set(["admin", "super_admin"]);
const hbtRoles = new Set(["hbt_admin", "hbt_member"]);
const optionQuestionTypes = new Set(["multiple_choice", "true_false", "dropdown"]);
const multiOptionQuestionTypes = new Set(["checkbox"]);

const quizAccessError = (code, message, statusCode = 400) => {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  return error;
};

const normalizeAccessType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["public", "private", "employee"].includes(normalized)) return normalized;
  return "private";
};

const normalizeQuestionType = (value) => String(value || "short_text").trim().toLowerCase();

const buildVisibility = (user, quizId = null) => {
  const params = [];
  const conditions = [];

  if (quizId !== null) {
    conditions.push("q.id = ?");
    params.push(Number(quizId));
  }

  if (adminRoles.has(user?.role)) {
    return { where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", params };
  }

  conditions.push("q.is_active = 1");

  if (hbtRoles.has(user?.role)) {
    if (!user.team_id) return null;
    conditions.push("(q.is_global = 1 OR q.team_id = ?)");
    params.push(Number(user.team_id));
    return { where: `WHERE ${conditions.join(" AND ")}`, params };
  }

  if (user?.role !== "employee" || !user.partnership_id) return null;

  conditions.push(`EXISTS (
    SELECT 1
    FROM partnerships p
    WHERE p.id = ?
      AND p.status = 'active'
      AND (q.team_id IS NULL OR q.team_id = p.team_id)
      AND (
        (q.is_global = 1 AND COALESCE(q.access_type, 'public') IN ('public', 'employee'))
        OR EXISTS (
          SELECT 1
          FROM quiz_partnerships qp
          WHERE qp.quiz_id = q.id
            AND qp.partnership_id = p.id
        )
        OR (
          q.team_id = p.team_id
          AND COALESCE(q.access_type, 'public') IN ('public', 'employee')
          AND NOT EXISTS (
            SELECT 1
            FROM quiz_partnerships qp_any
            WHERE qp_any.quiz_id = q.id
          )
        )
      )
  )`);
  params.push(Number(user.partnership_id));

  return { where: `WHERE ${conditions.join(" AND ")}`, params };
};

const getVisibleQuizzes = async (connection, user) => {
  const visibility = buildVisibility(user);
  if (!visibility) return [];

  const [rows] = await connection.query(
    `SELECT q.id, q.team_id, q.title, q.description, q.is_global, q.is_active,
            COALESCE(q.access_type, 'private') AS access_type, q.created_at
     FROM quizzes q
     ${visibility.where}
     ORDER BY q.id DESC`,
    visibility.params,
  );
  return rows;
};

const getAccessibleQuiz = async (connection, user, quizId) => {
  const id = Number(quizId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const visibility = buildVisibility(user, id);
  if (!visibility) return null;

  const [[quiz]] = await connection.query(
    `SELECT q.id, q.team_id, q.title, q.description, q.is_global, q.is_active,
            COALESCE(q.access_type, 'private') AS access_type, q.created_at
     FROM quizzes q
     ${visibility.where}
     LIMIT 1`,
    visibility.params,
  );
  return quiz || null;
};

const normalizeTextAnswer = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean).join(", ");
  return String(value ?? "").trim();
};

const validateTextFormat = (questionType, value) => {
  if (!value) return;
  if (value.length > 5000) {
    throw quizAccessError("QUIZ_ANSWER_TOO_LONG", "Quiz answers cannot exceed 5,000 characters");
  }

  if (questionType === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw quizAccessError("QUIZ_EMAIL_INVALID", "Enter a valid email answer");
  }

  if (questionType === "phone" && !/^[+()\-\.\s0-9]{7,30}$/.test(value)) {
    throw quizAccessError("QUIZ_PHONE_INVALID", "Enter a valid phone answer");
  }

  if (["number", "rating", "linear_scale"].includes(questionType) && !Number.isFinite(Number(value))) {
    throw quizAccessError("QUIZ_NUMBER_INVALID", "Enter a valid numeric answer");
  }

  if (questionType === "date") {
    const match = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const parsed = match ? new Date(`${value}T00:00:00Z`) : null;
    if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
      throw quizAccessError("QUIZ_DATE_INVALID", "Enter a valid date answer");
    }
  }
};

const getLegacyCheckboxIds = (rawAnswer, questionOptions) => {
  const legacyText = normalizeTextAnswer(rawAnswer?.answer_text);
  if (!legacyText) return [];

  return legacyText.split(",").map((label) => label.trim()).filter(Boolean).map((label) => {
    const matches = questionOptions.filter((option) => String(option.option_text || "").trim() === label);
    if (matches.length !== 1) {
      throw quizAccessError("QUIZ_OPTION_INVALID", "A selected option does not belong to its quiz question");
    }
    return Number(matches[0].id);
  });
};

const validateQuizSubmission = async (connection, user, quizId, answers) => {
  if (user?.role !== "employee") {
    throw quizAccessError("QUIZ_EMPLOYEE_REQUIRED", "Only employees can submit quizzes", 403);
  }
  if (!Array.isArray(answers) || answers.length > 200) {
    throw quizAccessError("QUIZ_ANSWERS_INVALID", "Answers must be an array containing no more than 200 items");
  }

  const quiz = await getAccessibleQuiz(connection, user, quizId);
  if (!quiz) {
    throw quizAccessError("QUIZ_NOT_AVAILABLE", "Quiz is not available for this employee", 404);
  }

  const [questions] = await connection.query(
    `SELECT id, quiz_id, question_text, question_type, COALESCE(is_required, 1) AS is_required,
            display_order
     FROM quiz_questions
     WHERE quiz_id = ?
     ORDER BY display_order ASC, id ASC`,
    [quiz.id],
  );
  if (!questions.length) {
    throw quizAccessError("QUIZ_HAS_NO_QUESTIONS", "Quiz has no available questions", 409);
  }

  const questionIds = questions.map((question) => Number(question.id));
  const placeholders = questionIds.map(() => "?").join(",");
  const [options] = await connection.query(
    `SELECT id, question_id, option_text
     FROM quiz_options
     WHERE question_id IN (${placeholders})
     ORDER BY display_order ASC, id ASC`,
    questionIds,
  );

  const questionMap = new Map(questions.map((question) => [Number(question.id), question]));
  const optionsByQuestion = new Map();
  for (const option of options) {
    const questionId = Number(option.question_id);
    if (!optionsByQuestion.has(questionId)) optionsByQuestion.set(questionId, []);
    optionsByQuestion.get(questionId).push(option);
  }

  const submitted = new Map();
  for (const rawAnswer of answers) {
    const questionId = Number(rawAnswer?.question_id);
    if (!Number.isInteger(questionId) || !questionMap.has(questionId)) {
      throw quizAccessError("QUIZ_QUESTION_INVALID", "An answer references a question outside this quiz");
    }
    if (submitted.has(questionId)) {
      throw quizAccessError("QUIZ_QUESTION_DUPLICATE", "Each quiz question can be answered only once");
    }
    submitted.set(questionId, rawAnswer || {});
  }

  const normalizedAnswers = [];
  for (const question of questions) {
    const questionId = Number(question.id);
    const required = Number(question.is_required) === 1;
    const questionType = normalizeQuestionType(question.question_type);
    const rawAnswer = submitted.get(questionId);
    const questionOptions = optionsByQuestion.get(questionId) || [];
    const optionMap = new Map(questionOptions.map((option) => [Number(option.id), option]));

    if (optionQuestionTypes.has(questionType)) {
      const selectedOptionId = Number(rawAnswer?.selected_option_id || 0);
      if (!selectedOptionId) {
        if (required) throw quizAccessError("QUIZ_REQUIRED_MISSING", "Complete every required quiz question");
        continue;
      }
      const selectedOption = optionMap.get(selectedOptionId);
      if (!selectedOption) {
        throw quizAccessError("QUIZ_OPTION_INVALID", "A selected option does not belong to its quiz question");
      }
      normalizedAnswers.push({
        question_id: questionId,
        selected_option_id: selectedOptionId,
        answer_text: String(selectedOption.option_text || "").trim(),
      });
      continue;
    }

    if (multiOptionQuestionTypes.has(questionType)) {
      const suppliedIds = Array.isArray(rawAnswer?.selected_option_ids)
        ? rawAnswer.selected_option_ids.map(Number)
        : getLegacyCheckboxIds(rawAnswer, questionOptions);
      const uniqueIds = [...new Set(suppliedIds.filter((id) => Number.isInteger(id) && id > 0))];
      if (uniqueIds.length > 50) {
        throw quizAccessError("QUIZ_OPTIONS_TOO_MANY", "Too many options were selected");
      }
      if (!uniqueIds.length) {
        if (required) throw quizAccessError("QUIZ_REQUIRED_MISSING", "Complete every required quiz question");
        continue;
      }
      const selectedOptions = uniqueIds.map((id) => optionMap.get(id));
      if (selectedOptions.some((option) => !option)) {
        throw quizAccessError("QUIZ_OPTION_INVALID", "A selected option does not belong to its quiz question");
      }
      normalizedAnswers.push({
        question_id: questionId,
        selected_option_id: null,
        answer_text: selectedOptions.map((option) => String(option.option_text || "").trim()).join(", "),
      });
      continue;
    }

    const answerText = normalizeTextAnswer(rawAnswer?.answer_text);
    if (!answerText) {
      if (required) throw quizAccessError("QUIZ_REQUIRED_MISSING", "Complete every required quiz question");
      continue;
    }
    validateTextFormat(questionType, answerText);
    normalizedAnswers.push({ question_id: questionId, selected_option_id: null, answer_text: answerText });
  }

  return { quiz, normalizedAnswers, totalQuestions: questions.length };
};

module.exports = {
  adminRoles,
  hbtRoles,
  normalizeAccessType,
  getVisibleQuizzes,
  getAccessibleQuiz,
  validateQuizSubmission,
  quizAccessError,
};
