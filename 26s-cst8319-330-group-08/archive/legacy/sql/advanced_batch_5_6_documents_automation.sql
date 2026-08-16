-- HomeBoost Advanced Batch 5 + 6
-- Document Checklist + Secure Upload, Appointment Automation + Reminders
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS document_checklist_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NULL,
  document_key VARCHAR(120) NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  is_required TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_document_templates_team (team_id),
  INDEX idx_document_templates_active (is_active),
  INDEX idx_document_templates_key (document_key)
);

CREATE TABLE IF NOT EXISTS employee_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  partnership_id INT NULL,
  template_id INT NULL,
  document_title VARCHAR(180) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  stored_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(120) NULL,
  file_size INT NULL,
  status VARCHAR(40) DEFAULT 'uploaded',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_by_user_id INT NULL,
  reviewed_at DATETIME NULL,
  review_note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employee_documents_user (user_id),
  INDEX idx_employee_documents_partnership (partnership_id),
  INDEX idx_employee_documents_template (template_id),
  INDEX idx_employee_documents_status (status)
);

CREATE TABLE IF NOT EXISTS document_review_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  document_id INT NOT NULL,
  author_user_id INT NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_document_notes_document (document_id),
  INDEX idx_document_notes_author (author_user_id)
);

CREATE TABLE IF NOT EXISTS document_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  partnership_id INT NULL,
  requested_by_user_id INT NOT NULL,
  template_id INT NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NULL,
  status VARCHAR(40) DEFAULT 'requested',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_document_requests_user (user_id),
  INDEX idx_document_requests_partnership (partnership_id),
  INDEX idx_document_requests_status (status)
);

CREATE TABLE IF NOT EXISTS appointment_reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL,
  reminder_type VARCHAR(50) NOT NULL,
  due_at DATETIME NOT NULL,
  status VARCHAR(30) DEFAULT 'pending',
  sent_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_appointment_reminder (appointment_id, reminder_type),
  INDEX idx_appointment_reminders_due (due_at),
  INDEX idx_appointment_reminders_status (status)
);

CREATE TABLE IF NOT EXISTS automation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  automation_type VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NULL,
  entity_id INT NULL,
  status VARCHAR(40) NOT NULL,
  message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_automation_logs_type (automation_type),
  INDEX idx_automation_logs_status (status),
  INDEX idx_automation_logs_created (created_at)
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  appointment_confirmations TINYINT(1) DEFAULT 1,
  appointment_reminders TINYINT(1) DEFAULT 1,
  document_notifications TINYINT(1) DEFAULT 1,
  task_notifications TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_notification_preferences_user (user_id)
);
