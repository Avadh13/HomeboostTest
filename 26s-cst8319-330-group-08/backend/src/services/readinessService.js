const pool = require("../config/db");

const DEFAULT_RECOMMENDATIONS = [
  "Review your HomeBoost resources and complete any missing profile details.",
  "Book an advisor appointment when you are ready for a personalized next step.",
];

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const lower = (value = "") => String(value || "").toLowerCase();

const ensureAdvancedLeadTables = async (connection = pool) => {
  await connection.query(`CREATE TABLE IF NOT EXISTS employee_readiness_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    partnership_id INT NULL,
    quiz_id INT NULL,
    latest_submission_id INT NULL,
    score INT NOT NULL DEFAULT 0,
    level VARCHAR(60) NOT NULL DEFAULT 'Needs Preparation',
    priority VARCHAR(20) NOT NULL DEFAULT 'warm',
    summary TEXT NULL,
    risk_factors JSON NULL,
    recommendations JSON NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_employee_readiness_user (user_id),
    INDEX idx_employee_readiness_partnership (partnership_id),
    INDEX idx_employee_readiness_submission (latest_submission_id),
    INDEX idx_employee_readiness_level (level),
    INDEX idx_employee_readiness_priority (priority)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS employee_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    readiness_score_id INT NULL,
    recommendation_text TEXT NOT NULL,
    recommendation_type VARCHAR(60) DEFAULT 'next_step',
    is_completed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee_recommendations_user (user_id),
    INDEX idx_employee_recommendations_score (readiness_score_id)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS lead_pipeline (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_user_id INT NOT NULL,
    partnership_id INT NULL,
    assigned_team_member_user_id INT NULL,
    readiness_score_id INT NULL,
    source_type VARCHAR(50) DEFAULT 'manual',
    source_id INT NULL,
    stage VARCHAR(40) NOT NULL DEFAULT 'new_lead',
    priority VARCHAR(20) NOT NULL DEFAULT 'warm',
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    next_action TEXT NULL,
    follow_up_due_at DATETIME NULL,
    last_contacted_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_lead_pipeline_employee (employee_user_id),
    INDEX idx_lead_pipeline_partnership (partnership_id),
    INDEX idx_lead_pipeline_assigned_member (assigned_team_member_user_id),
    INDEX idx_lead_pipeline_stage (stage),
    INDEX idx_lead_pipeline_priority (priority),
    INDEX idx_lead_pipeline_followup (follow_up_due_at)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS lead_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    author_user_id INT NOT NULL,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_lead_notes_lead (lead_id),
    INDEX idx_lead_notes_author (author_user_id)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS lead_followups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    assigned_to_user_id INT NULL,
    due_at DATETIME NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'Follow up with employee',
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    completed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_lead_followups_lead (lead_id),
    INDEX idx_lead_followups_assigned_to (assigned_to_user_id),
    INDEX idx_lead_followups_due_at (due_at),
    INDEX idx_lead_followups_status (status)
  )`);
};

const classifyReadiness = (score) => {
  if (score >= 80) return { level: "Ready", priority: "hot" };
  if (score >= 60) return { level: "Almost Ready", priority: "hot" };
  if (score >= 40) return { level: "Needs Preparation", priority: "warm" };
  return { level: "High Support Needed", priority: "cold" };
};

const addUnique = (items, value) => {
  if (value && !items.includes(value)) items.push(value);
};

const analyzeAnswers = (answers = []) => {
  let score = 50;
  const riskFactors = [];
  const recommendations = [];

  for (const answer of answers) {
    const question = lower(answer.question_text);
    const text = lower(answer.answer_text);
    const combined = `${question} ${text}`;

    if (!text.trim()) {
      score -= 3;
      addUnique(riskFactors, "Missing quiz answer information");
      continue;
    }

    if (combined.includes("credit")) {
      if (/7[2-9]0|8\d{2}|excellent|very good/.test(combined)) score += 15;
      else if (/6[6-9]0|700|good/.test(combined)) score += 8;
      else if (/5\d{2}|6[0-4]0|poor|fair|low|not sure|unknown/.test(combined)) {
        score -= 15;
        addUnique(riskFactors, "Credit score may need improvement or confirmation");
        addUnique(recommendations, "Review the credit improvement resource and discuss credit readiness with an advisor.");
      }
    }

    if (combined.includes("down payment") || combined.includes("savings") || combined.includes("saved")) {
      if (/20%|twenty|15%|10%|yes|saved|ready/.test(combined)) score += 12;
      else if (/no|none|not yet|little|starting|0%/.test(combined)) {
        score -= 14;
        addUnique(riskFactors, "Down payment savings may not be ready yet");
        addUnique(recommendations, "Create a down-payment savings plan and review closing-cost expectations.");
      }
    }

    if (combined.includes("timeline") || combined.includes("when") || combined.includes("buy")) {
      if (/now|ready|0-3|3 month|soon|immediately/.test(combined)) {
        score += 12;
        addUnique(recommendations, "Book an advisor appointment soon because the buying timeline looks active.");
      } else if (/6 month|this year|within a year/.test(combined)) score += 6;
      else if (/not sure|someday|later|2 year/.test(combined)) score -= 4;
    }

    if (combined.includes("employment") || combined.includes("income") || combined.includes("job")) {
      if (/full.?time|permanent|stable|salary|employed/.test(combined)) score += 8;
      else if (/part.?time|contract|self.?employed|temporary|unemployed|unstable/.test(combined)) {
        score -= 10;
        addUnique(riskFactors, "Employment or income documentation may require review");
        addUnique(recommendations, "Prepare employment and income documents before a mortgage-readiness appointment.");
      }
    }

    if (combined.includes("debt") || combined.includes("loan") || combined.includes("payment")) {
      if (/low|none|manageable|paid/.test(combined)) score += 6;
      else if (/high|many|large|struggling|missed|late/.test(combined)) {
        score -= 12;
        addUnique(riskFactors, "Debt level or payment history may affect qualification");
        addUnique(recommendations, "Review monthly debts with an advisor before starting pre-approval steps.");
      }
    }

    if (combined.includes("pre-approval") || combined.includes("pre approval")) {
      if (/yes|approved|already/.test(combined)) score += 12;
      if (/no|not yet|never/.test(combined)) addUnique(recommendations, "Discuss pre-approval timing with a HomeBoost advisor.");
    }

    if (/not sure|unknown|maybe|do not know|don't know/.test(combined)) {
      score -= 3;
      addUnique(riskFactors, "Some readiness details are unclear");
    }
  }

  score = clamp(Math.round(score));
  const classification = classifyReadiness(score);

  if (recommendations.length === 0) {
    if (score >= 80) {
      addUnique(recommendations, "Book a mortgage-readiness appointment to confirm next steps toward pre-approval.");
      addUnique(recommendations, "Review the home-buying checklist and prepare key documents.");
    } else if (score >= 60) {
      addUnique(recommendations, "Review your readiness gaps and schedule an advisor follow-up.");
      addUnique(recommendations, "Use recommended resources to strengthen your mortgage profile.");
    } else {
      DEFAULT_RECOMMENDATIONS.forEach((item) => addUnique(recommendations, item));
    }
  }

  const summary = `${classification.level}: score ${score}/100. ${riskFactors.length ? "Key gaps: " + riskFactors.join("; ") + "." : "The employee appears ready for a focused advisor conversation."}`;
  return { score, level: classification.level, priority: classification.priority, summary, riskFactors, recommendations };
};

const getFollowUpExpression = (priority) => {
  if (priority === "hot") return "DATE_ADD(NOW(), INTERVAL 1 DAY)";
  if (priority === "warm") return "DATE_ADD(NOW(), INTERVAL 3 DAY)";
  return "DATE_ADD(NOW(), INTERVAL 7 DAY)";
};

const calculateReadinessForSubmission = async (connection, submissionId) => {
  await ensureAdvancedLeadTables(connection);

  const [submissions] = await connection.query(
    `SELECT qs.id, qs.quiz_id, qs.user_id, qs.partnership_id, qs.submitted_at, u.full_name, u.email
     FROM quiz_submissions qs
     LEFT JOIN users u ON qs.user_id = u.id
     WHERE qs.id = ?
     LIMIT 1`,
    [submissionId]
  );

  if (submissions.length === 0 || !submissions[0].user_id) return null;

  const submission = submissions[0];
  const [answers] = await connection.query(
    `SELECT qa.answer_text, qq.question_text, qq.question_type
     FROM quiz_answers qa
     LEFT JOIN quiz_questions qq ON qa.question_id = qq.id
     WHERE qa.submission_id = ?
     ORDER BY qq.display_order ASC, qa.id ASC`,
    [submissionId]
  );

  const result = analyzeAnswers(answers);

  await connection.query(
    `INSERT INTO employee_readiness_scores
     (user_id, partnership_id, quiz_id, latest_submission_id, score, level, priority, summary, risk_factors, recommendations, calculated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       partnership_id = VALUES(partnership_id),
       quiz_id = VALUES(quiz_id),
       latest_submission_id = VALUES(latest_submission_id),
       score = VALUES(score),
       level = VALUES(level),
       priority = VALUES(priority),
       summary = VALUES(summary),
       risk_factors = VALUES(risk_factors),
       recommendations = VALUES(recommendations),
       calculated_at = NOW(),
       updated_at = CURRENT_TIMESTAMP`,
    [
      submission.user_id,
      submission.partnership_id || null,
      submission.quiz_id || null,
      submissionId,
      result.score,
      result.level,
      result.priority,
      result.summary,
      JSON.stringify(result.riskFactors),
      JSON.stringify(result.recommendations),
    ]
  );

  const [[scoreRow]] = await connection.query(`SELECT id FROM employee_readiness_scores WHERE user_id = ? LIMIT 1`, [submission.user_id]);

  await connection.query(`DELETE FROM employee_recommendations WHERE user_id = ?`, [submission.user_id]);
  for (const recommendation of result.recommendations) {
    await connection.query(
      `INSERT INTO employee_recommendations (user_id, readiness_score_id, recommendation_text, recommendation_type)
       VALUES (?, ?, ?, 'next_step')`,
      [submission.user_id, scoreRow?.id || null, recommendation]
    );
  }

  const [[assignment]] = await connection.query(
    `SELECT team_member_user_id
     FROM employee_lead_assignments
     WHERE employee_user_id = ? AND status = 'active'
     ORDER BY updated_at DESC, id DESC
     LIMIT 1`,
    [submission.user_id]
  );

  const followUpExpression = getFollowUpExpression(result.priority);
  const nextAction = result.recommendations[0] || DEFAULT_RECOMMENDATIONS[0];

  await connection.query(
    `INSERT INTO lead_pipeline
     (employee_user_id, partnership_id, assigned_team_member_user_id, readiness_score_id, source_type, source_id, stage, priority, status, next_action, follow_up_due_at)
     VALUES (?, ?, ?, ?, 'quiz_submission', ?, 'new_lead', ?, 'open', ?, ${followUpExpression})
     ON DUPLICATE KEY UPDATE
       partnership_id = VALUES(partnership_id),
       assigned_team_member_user_id = COALESCE(VALUES(assigned_team_member_user_id), assigned_team_member_user_id),
       readiness_score_id = VALUES(readiness_score_id),
       source_type = VALUES(source_type),
       source_id = VALUES(source_id),
       priority = VALUES(priority),
       status = CASE WHEN status IN ('closed', 'not_interested') THEN status ELSE 'open' END,
       next_action = VALUES(next_action),
       follow_up_due_at = CASE WHEN follow_up_due_at IS NULL OR follow_up_due_at < NOW() THEN VALUES(follow_up_due_at) ELSE follow_up_due_at END,
       updated_at = CURRENT_TIMESTAMP`,
    [submission.user_id, submission.partnership_id || null, assignment?.team_member_user_id || null, scoreRow?.id || null, submissionId, result.priority, nextAction]
  );

  return { ...result, readiness_score_id: scoreRow?.id || null };
};

module.exports = { ensureAdvancedLeadTables, analyzeAnswers, calculateReadinessForSubmission };
