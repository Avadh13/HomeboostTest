-- Employee Benefit Program
-- Client requirement QA readiness reimplementation
-- Safe to run more than once on the active database.

CREATE TABLE IF NOT EXISTS qa_test_cases (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  test_key VARCHAR(100) NOT NULL,
  category VARCHAR(80) NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  requirement_reference VARCHAR(160) NULL,
  user_role VARCHAR(50) NOT NULL DEFAULT 'all',
  priority ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium',
  test_type ENUM('manual','automated','hybrid') NOT NULL DEFAULT 'manual',
  route_path VARCHAR(255) NULL,
  is_launch_blocker TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_qa_test_cases_key (test_key),
  KEY idx_qa_test_cases_filters (is_active, category, user_role, priority),
  KEY idx_qa_test_cases_launch (is_active, is_launch_blocker, priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qa_test_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  test_case_id BIGINT UNSIGNED NOT NULL,
  release_version VARCHAR(80) NOT NULL DEFAULT 'current',
  environment ENUM('local','preview','staging','production') NOT NULL DEFAULT 'preview',
  status ENUM('not_tested','in_progress','passed','failed','blocked','not_applicable') NOT NULL DEFAULT 'not_tested',
  actual_result TEXT NULL,
  notes TEXT NULL,
  tested_by INT NULL,
  tested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_qa_test_runs_latest (test_case_id, tested_at, id),
  KEY idx_qa_test_runs_release (release_version, environment, status),
  CONSTRAINT fk_qa_test_runs_case FOREIGN KEY (test_case_id) REFERENCES qa_test_cases(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qa_test_evidence (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  test_run_id BIGINT UNSIGNED NOT NULL,
  file_url VARCHAR(1000) NOT NULL,
  file_name VARCHAR(255) NULL,
  evidence_type ENUM('screenshot','video','document','link','log') NOT NULL DEFAULT 'link',
  uploaded_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_qa_test_evidence_run (test_run_id, created_at),
  CONSTRAINT fk_qa_test_evidence_run FOREIGN KEY (test_run_id) REFERENCES qa_test_runs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS qa_release_cycles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  version VARCHAR(80) NOT NULL,
  environment ENUM('local','preview','staging','production') NOT NULL DEFAULT 'preview',
  status ENUM('planned','active','completed','cancelled') NOT NULL DEFAULT 'planned',
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  created_by INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_qa_release_cycles_version_env (version, environment)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'qa_readiness_reimplementation_ready' AS status;
