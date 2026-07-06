-- HomeBoost Advanced Batch 17 + 18
-- HBT Journey Builder + Quiz Journey Rules Manager
-- Most tables already exist from Batch 9-12; this file keeps setup repeatable.

CREATE TABLE IF NOT EXISTS journeys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  journey_type VARCHAR(80) DEFAULT 'home_buying',
  is_default TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_journeys_team (team_id),
  INDEX idx_journeys_active (is_active),
  INDEX idx_journeys_default (is_default)
);

CREATE TABLE IF NOT EXISTS journey_steps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journey_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  step_type VARCHAR(60) DEFAULT 'task',
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_journey_steps_journey (journey_id),
  INDEX idx_journey_steps_active (is_active)
);

CREATE TABLE IF NOT EXISTS journey_step_resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journey_step_id INT NOT NULL,
  resource_id INT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_journey_step_resource (journey_step_id, resource_id),
  INDEX idx_journey_step_resources_step (journey_step_id),
  INDEX idx_journey_step_resources_resource (resource_id)
);

CREATE TABLE IF NOT EXISTS journey_checklist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journey_step_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  is_required TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_journey_checklist_step (journey_step_id),
  INDEX idx_journey_checklist_active (is_active)
);

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
