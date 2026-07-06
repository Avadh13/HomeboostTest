-- HomeBoost Advanced Batch 11 + 12
-- Quiz Outcome to Journey Mapping + Employee Invitation Link System
-- Safe to run after Batch 9 + 10.

CREATE TABLE IF NOT EXISTS quiz_journey_rules (
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
);

CREATE TABLE IF NOT EXISTS journey_assignment_logs (
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
);

CREATE TABLE IF NOT EXISTS invite_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invite_id INT NOT NULL,
  action VARCHAR(80) NOT NULL,
  actor_user_id INT NULL,
  message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_invite_logs_invite (invite_id),
  INDEX idx_invite_logs_action (action)
);

-- Existing projects may already have employee_invites without token columns.
ALTER TABLE employee_invites ADD COLUMN IF NOT EXISTS invite_token VARCHAR(120) NULL;
ALTER TABLE employee_invites ADD COLUMN IF NOT EXISTS invite_code VARCHAR(40) NULL;
ALTER TABLE employee_invites ADD COLUMN IF NOT EXISTS expires_at DATETIME NULL;
ALTER TABLE employee_invites ADD COLUMN IF NOT EXISTS accepted_at DATETIME NULL;
ALTER TABLE employee_invites ADD COLUMN IF NOT EXISTS last_sent_at DATETIME NULL;

CREATE INDEX IF NOT EXISTS idx_employee_invites_token ON employee_invites (invite_token);
CREATE INDEX IF NOT EXISTS idx_employee_invites_code ON employee_invites (invite_code);
CREATE INDEX IF NOT EXISTS idx_employee_invites_expires ON employee_invites (expires_at);
