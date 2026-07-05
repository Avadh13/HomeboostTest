-- HomeBoost Advanced Batch 3 + 4
-- Employer ROI Dashboard + Personalized Resource Recommendations
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS employee_activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  partnership_id INT NULL,
  activity_type VARCHAR(80) NOT NULL,
  activity_label VARCHAR(255) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_user (user_id),
  INDEX idx_activity_partnership (partnership_id),
  INDEX idx_activity_type (activity_type),
  INDEX idx_activity_created (created_at)
);

CREATE TABLE IF NOT EXISTS company_engagement_summary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partnership_id INT NOT NULL,
  total_employees INT DEFAULT 0,
  active_employees INT DEFAULT 0,
  quiz_completion_rate DECIMAL(5,2) DEFAULT 0,
  appointment_count INT DEFAULT 0,
  resource_view_count INT DEFAULT 0,
  average_readiness_score DECIMAL(5,2) DEFAULT 0,
  engagement_score INT DEFAULT 0,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_company_summary_partnership (partnership_id)
);

CREATE TABLE IF NOT EXISTS resource_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resource_recommendation_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL,
  readiness_level VARCHAR(60) NULL,
  priority VARCHAR(20) NULL,
  keyword VARCHAR(120) NULL,
  rule_label VARCHAR(255) NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_resource_rule_resource (resource_id),
  INDEX idx_resource_rule_level (readiness_level),
  INDEX idx_resource_rule_priority (priority),
  INDEX idx_resource_rule_keyword (keyword)
);

CREATE TABLE IF NOT EXISTS resource_views (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT NOT NULL,
  user_id INT NOT NULL,
  partnership_id INT NULL,
  viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_resource_views_resource (resource_id),
  INDEX idx_resource_views_user (user_id),
  INDEX idx_resource_views_partnership (partnership_id),
  INDEX idx_resource_views_viewed_at (viewed_at)
);
