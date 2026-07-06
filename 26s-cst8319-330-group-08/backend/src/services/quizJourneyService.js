const pool = require("../config/db");
const { ensureJourneyTables } = require("../routes/journeyRoutes");

const ensureQuizJourneyTables = async (connection = pool) => {
  await ensureJourneyTables(connection);

  await connection.query(`CREATE TABLE IF NOT EXISTS quiz_journey_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NULL,
    quiz_id INT NULL,
    journey_id INT NOT NULL,
    rule_name VARCHAR(180) NOT NULL,
    readiness_level VARCHAR(80) NULL,
    readiness_priority VARCHAR(40) NULL,
    answer_keyword VARCHAR(180) NULL,
    min_score INT NULL,
    max_score INT NULL,
    priority INT DEFAULT 100,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_quiz_journey_rules_team (team_id),
    INDEX idx_quiz_journey_rules_quiz (quiz_id),
    INDEX idx_quiz_journey_rules_journey (journey_id),
    INDEX idx_quiz_journey_rules_active (is_active),
    INDEX idx_quiz_journey_rules_priority (priority)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS journey_assignment_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    journey_id INT NOT NULL,
    submission_id INT NULL,
    rule_id INT NULL,
    assigned_by_user_id INT NULL,
    source VARCHAR(60) DEFAULT 'quiz_rule',
    message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_journey_assignment_logs_user (user_id),
    INDEX idx_journey_assignment_logs_journey (journey_id),
    INDEX idx_journey_assignment_logs_submission (submission_id),
    INDEX idx_journey_assignment_logs_rule (rule_id)
  )`);
};

const normalize = (value) => String(value || "").trim().toLowerCase();

const getSubmissionContext = async (connection, submissionId) => {
  const [[submission]] = await connection.query(
    `SELECT qs.id, qs.quiz_id, qs.user_id, qs.partnership_id, p.team_id
     FROM quiz_submissions qs
     LEFT JOIN partnerships p ON p.id = qs.partnership_id
     WHERE qs.id = ?
     LIMIT 1`,
    [submissionId]
  );
  if (!submission?.user_id) return null;

  const [[readiness]] = await connection.query(
    `SELECT score, level, priority, risk_factors
     FROM employee_readiness_scores
     WHERE latest_submission_id = ? OR user_id = ?
     ORDER BY latest_submission_id = ? DESC, id DESC
     LIMIT 1`,
    [submissionId, submission.user_id, submissionId]
  );

  const [answers] = await connection.query(
    `SELECT qa.answer_text, qq.question_text
     FROM quiz_answers qa
     LEFT JOIN quiz_questions qq ON qq.id = qa.question_id
     WHERE qa.submission_id = ?`,
    [submissionId]
  );

  return { submission, readiness: readiness || {}, answers };
};

const ruleMatches = (rule, context) => {
  const readiness = context.readiness || {};
  const answerText = normalize(context.answers.map((answer) => `${answer.question_text || ""} ${answer.answer_text || ""}`).join(" "));

  if (rule.readiness_level && normalize(rule.readiness_level) !== normalize(readiness.level)) return false;
  if (rule.readiness_priority && normalize(rule.readiness_priority) !== normalize(readiness.priority)) return false;
  if (rule.min_score !== null && rule.min_score !== undefined && Number(readiness.score || 0) < Number(rule.min_score)) return false;
  if (rule.max_score !== null && rule.max_score !== undefined && Number(readiness.score || 0) > Number(rule.max_score)) return false;
  if (rule.answer_keyword && !answerText.includes(normalize(rule.answer_keyword))) return false;

  return true;
};

const assignJourney = async (connection, { userId, journeyId, submissionId = null, ruleId = null, assignedBy = null, source = "quiz_rule", message = null }) => {
  await connection.query(
    `INSERT INTO employee_journey_assignments (user_id, journey_id, assigned_by_user_id, source, status)
     VALUES (?, ?, ?, ?, 'active')
     ON DUPLICATE KEY UPDATE status = 'active', source = VALUES(source), assigned_by_user_id = VALUES(assigned_by_user_id), assigned_at = CURRENT_TIMESTAMP`,
    [userId, journeyId, assignedBy, source]
  );

  await connection.query(
    `INSERT INTO journey_assignment_logs (user_id, journey_id, submission_id, rule_id, assigned_by_user_id, source, message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, journeyId, submissionId, ruleId, assignedBy, source, message]
  );
};

const assignJourneyForSubmission = async (connection, submissionId) => {
  await ensureQuizJourneyTables(connection);
  const context = await getSubmissionContext(connection, submissionId);
  if (!context) return null;

  const { submission } = context;
  const [rules] = await connection.query(
    `SELECT * FROM quiz_journey_rules
     WHERE is_active = 1
       AND (quiz_id IS NULL OR quiz_id = ?)
       AND (team_id IS NULL OR team_id = ?)
     ORDER BY priority ASC, id ASC`,
    [submission.quiz_id, submission.team_id]
  );

  const matchedRule = rules.find((rule) => ruleMatches(rule, context));

  if (matchedRule) {
    await assignJourney(connection, {
      userId: submission.user_id,
      journeyId: matchedRule.journey_id,
      submissionId,
      ruleId: matchedRule.id,
      source: "quiz_rule",
      message: `Assigned by rule: ${matchedRule.rule_name}`,
    });
    return { assigned: true, journey_id: matchedRule.journey_id, rule_id: matchedRule.id, source: "quiz_rule" };
  }

  const [[fallback]] = await connection.query(
    `SELECT id FROM journeys
     WHERE is_active = 1 AND (team_id IS NULL OR team_id = ?)
     ORDER BY is_default DESC, sort_order ASC, id ASC
     LIMIT 1`,
    [submission.team_id]
  );

  if (!fallback) return { assigned: false, reason: "No matching rule or fallback journey found" };

  await assignJourney(connection, {
    userId: submission.user_id,
    journeyId: fallback.id,
    submissionId,
    source: "default_after_quiz",
    message: "Assigned fallback journey after quiz submission",
  });

  return { assigned: true, journey_id: fallback.id, rule_id: null, source: "default_after_quiz" };
};

module.exports = {
  ensureQuizJourneyTables,
  assignJourneyForSubmission,
};
