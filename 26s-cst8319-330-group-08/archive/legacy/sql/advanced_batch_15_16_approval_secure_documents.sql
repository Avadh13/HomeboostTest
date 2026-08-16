-- HomeBoost Advanced Batch 15 + 16
-- Employer Approval + Company Point of Contact Flow
-- Production-style Secure Document Upload
-- Safe to run after earlier batches.

CREATE TABLE IF NOT EXISTS employer_approval_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partnership_id INT NULL,
  employer_id INT NULL,
  team_id INT NULL,
  requested_by_user_id INT NULL,
  requested_company_name VARCHAR(180) NOT NULL,
  contact_name VARCHAR(180) NULL,
  contact_email VARCHAR(255) NULL,
  contact_phone VARCHAR(80) NULL,
  contact_title VARCHAR(120) NULL,
  approval_status VARCHAR(40) DEFAULT 'pending',
  review_note TEXT NULL,
  reviewed_by_user_id INT NULL,
  reviewed_at DATETIME NULL,
  approved_at DATETIME NULL,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employer_approval_partnership (partnership_id),
  INDEX idx_employer_approval_team (team_id),
  INDEX idx_employer_approval_status (approval_status),
  INDEX idx_employer_approval_requested_by (requested_by_user_id)
);

CREATE TABLE IF NOT EXISTS company_points_of_contact (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partnership_id INT NOT NULL,
  user_id INT NULL,
  full_name VARCHAR(180) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(80) NULL,
  title VARCHAR(120) NULL,
  is_primary TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_by_user_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_company_poc_partnership_email (partnership_id, email),
  INDEX idx_company_poc_partnership (partnership_id),
  INDEX idx_company_poc_active (is_active)
);

CREATE TABLE IF NOT EXISTS document_access_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  actor_user_id INT NULL,
  action VARCHAR(80) NOT NULL,
  ip_address VARCHAR(80) NULL,
  user_agent VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_document_access_document (document_id),
  INDEX idx_document_access_actor (actor_user_id),
  INDEX idx_document_access_action (action)
);

DROP PROCEDURE IF EXISTS add_employee_document_column;
DELIMITER $$
CREATE PROCEDURE add_employee_document_column(IN column_name_value VARCHAR(64), IN column_definition_value VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'employee_documents'
      AND COLUMN_NAME = column_name_value
  ) THEN
    SET @statement = CONCAT('ALTER TABLE employee_documents ADD COLUMN ', column_name_value, ' ', column_definition_value);
    PREPARE stmt FROM @statement;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL add_employee_document_column('stored_filename', 'VARCHAR(255) NULL');
CALL add_employee_document_column('stored_path', 'VARCHAR(700) NULL');
CALL add_employee_document_column('mime_type', 'VARCHAR(120) NULL');
CALL add_employee_document_column('file_size_bytes', 'INT NULL');
CALL add_employee_document_column('storage_provider', "VARCHAR(60) DEFAULT 'private_disk'");
CALL add_employee_document_column('file_sha256', 'VARCHAR(128) NULL');
CALL add_employee_document_column('uploaded_by_ip', 'VARCHAR(80) NULL');

DROP PROCEDURE IF EXISTS add_employee_document_column;
