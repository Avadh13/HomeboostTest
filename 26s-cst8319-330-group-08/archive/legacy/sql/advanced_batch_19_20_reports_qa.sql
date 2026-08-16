-- HomeBoost Advanced Batch 19 + 20
-- Reporting / CSV Export Center + Deployment Readiness QA
-- Safe to run after previous batches.

CREATE TABLE IF NOT EXISTS report_export_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  export_type VARCHAR(80) NOT NULL,
  scope_role VARCHAR(80) NULL,
  row_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_report_export_user (user_id),
  INDEX idx_report_export_type (export_type),
  INDEX idx_report_export_created (created_at)
);

CREATE TABLE IF NOT EXISTS deployment_check_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  run_by_user_id INT NULL,
  readiness_status VARCHAR(60) NULL,
  score INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  warning_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_deployment_runs_user (run_by_user_id),
  INDEX idx_deployment_runs_created (created_at)
);
