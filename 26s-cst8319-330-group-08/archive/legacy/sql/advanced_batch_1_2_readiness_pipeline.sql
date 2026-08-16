-- HomeBoost Advanced Batch 1 + 2
-- Mortgage Readiness Engine + Smart Advisor Lead Pipeline
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS employee_readiness_scores (
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
);

CREATE TABLE IF NOT EXISTS employee_recommendations (
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
);

CREATE TABLE IF NOT EXISTS lead_pipeline (
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
);

CREATE TABLE IF NOT EXISTS lead_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NOT NULL,
  author_user_id INT NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lead_notes_lead (lead_id),
  INDEX idx_lead_notes_author (author_user_id)
);

CREATE TABLE IF NOT EXISTS lead_followups (
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
);
