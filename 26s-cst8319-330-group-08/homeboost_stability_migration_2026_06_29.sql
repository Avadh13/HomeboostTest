USE railway;

-- =========================================================
-- HomeBoost stability migration - 2026-06-29
-- Safe consolidated checklist for current frontend/backend flows.
-- Run this before QA testing. Do not run deployments from this file.
-- =========================================================

-- 1) User roles used by current routing and backend access checks.
ALTER TABLE users
  MODIFY COLUMN role ENUM(
    'super_admin',
    'admin',
    'hbt_admin',
    'hbt_member',
    'company_admin',
    'company',
    'employee'
  ) NOT NULL DEFAULT 'employee';

-- 2) Employer branding/contact columns used by public landing and company dashboard.
SET @has_employer_contact_email := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'employers' AND column_name = 'contact_email'
);
SET @sql_employer_contact_email := IF(
  @has_employer_contact_email = 0,
  'ALTER TABLE employers ADD COLUMN contact_email VARCHAR(255) NULL AFTER phone',
  'SELECT ''employers.contact_email already exists'' AS status'
);
PREPARE stmt FROM @sql_employer_contact_email;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_brand_primary := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'employers' AND column_name = 'brand_primary_color'
);
SET @sql_brand_primary := IF(
  @has_brand_primary = 0,
  'ALTER TABLE employers ADD COLUMN brand_primary_color VARCHAR(20) DEFAULT ''#2563eb''',
  'SELECT ''employers.brand_primary_color already exists'' AS status'
);
PREPARE stmt FROM @sql_brand_primary;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_brand_secondary := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'employers' AND column_name = 'brand_secondary_color'
);
SET @sql_brand_secondary := IF(
  @has_brand_secondary = 0,
  'ALTER TABLE employers ADD COLUMN brand_secondary_color VARCHAR(20) DEFAULT ''#eff6ff''',
  'SELECT ''employers.brand_secondary_color already exists'' AS status'
);
PREPARE stmt FROM @sql_brand_secondary;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE employers
SET
  brand_primary_color = COALESCE(NULLIF(brand_primary_color, ''), '#2563eb'),
  brand_secondary_color = COALESCE(NULLIF(brand_secondary_color, ''), '#eff6ff')
WHERE id > 0;

-- 3) CSV enrollment batches used by HBT/company manager employee uploads.
CREATE TABLE IF NOT EXISTS enrollment_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partnership_id INT NOT NULL,
  uploaded_by_user_id INT NOT NULL,
  original_filename VARCHAR(255),
  created_count INT DEFAULT 0,
  skipped_count INT DEFAULT 0,
  status ENUM('active', 'revoked') DEFAULT 'active',
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_enrollment_batches_partnership (partnership_id),
  INDEX idx_enrollment_batches_uploaded_by (uploaded_by_user_id),
  CONSTRAINT fk_enrollment_batches_partnership
    FOREIGN KEY (partnership_id) REFERENCES partnerships(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_enrollment_batches_uploaded_by
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

SET @has_user_batch := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'enrollment_batch_id'
);
SET @sql_user_batch := IF(
  @has_user_batch = 0,
  'ALTER TABLE users ADD COLUMN enrollment_batch_id INT NULL',
  'SELECT ''users.enrollment_batch_id already exists'' AS status'
);
PREPARE stmt FROM @sql_user_batch;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_user_batch_fk := (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'users'
    AND constraint_name = 'fk_users_enrollment_batch'
    AND constraint_type = 'FOREIGN KEY'
);
SET @sql_user_batch_fk := IF(
  @has_user_batch_fk = 0,
  'ALTER TABLE users ADD CONSTRAINT fk_users_enrollment_batch FOREIGN KEY (enrollment_batch_id) REFERENCES enrollment_batches(id) ON DELETE SET NULL',
  'SELECT ''fk_users_enrollment_batch already exists'' AS status'
);
PREPARE stmt FROM @sql_user_batch_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4) Approved employee invite list used to protect employee signup.
CREATE TABLE IF NOT EXISTS employee_invites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partnership_id INT NOT NULL,
  enrollment_batch_id INT NULL,
  invited_by_user_id INT NULL,
  registered_user_id INT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  status ENUM('invited', 'registered', 'revoked') NOT NULL DEFAULT 'invited',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  registered_at DATETIME NULL,
  revoked_at DATETIME NULL,
  UNIQUE KEY uq_employee_invite_partnership_email (partnership_id, email),
  INDEX idx_employee_invites_email (email),
  INDEX idx_employee_invites_status (status),
  INDEX idx_employee_invites_batch (enrollment_batch_id),
  CONSTRAINT fk_employee_invites_partnership
    FOREIGN KEY (partnership_id) REFERENCES partnerships(id)
    ON DELETE CASCADE
);

INSERT INTO employee_invites (
  partnership_id,
  full_name,
  email,
  status,
  registered_user_id,
  registered_at
)
SELECT
  u.partnership_id,
  u.full_name,
  LOWER(u.email),
  'registered',
  u.id,
  NOW()
FROM users u
WHERE u.role = 'employee'
  AND u.partnership_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  status = 'registered',
  registered_user_id = VALUES(registered_user_id),
  registered_at = COALESCE(employee_invites.registered_at, NOW());

-- 5) Lead assignment/progress tables used by HBT admin, HBT member, and employee portal.
CREATE TABLE IF NOT EXISTS employee_lead_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_user_id INT NOT NULL,
  team_member_user_id INT NOT NULL,
  partnership_id INT NOT NULL,
  assigned_by_user_id INT NULL,
  status ENUM('active', 'paused', 'completed') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_employee_lead_assignment_employee (employee_user_id),
  INDEX idx_employee_lead_assignments_member (team_member_user_id),
  INDEX idx_employee_lead_assignments_partnership (partnership_id),
  CONSTRAINT fk_lead_assignment_employee FOREIGN KEY (employee_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_lead_assignment_member FOREIGN KEY (team_member_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_lead_assignment_partnership FOREIGN KEY (partnership_id) REFERENCES partnerships(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employee_lead_todos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  todo_key VARCHAR(80) NOT NULL,
  label VARCHAR(255) NOT NULL,
  sort_order INT DEFAULT 0,
  is_completed TINYINT(1) DEFAULT 0,
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lead_todo_assignment_key (assignment_id, todo_key),
  INDEX idx_lead_todo_assignment (assignment_id),
  CONSTRAINT fk_lead_todo_assignment FOREIGN KEY (assignment_id) REFERENCES employee_lead_assignments(id) ON DELETE CASCADE
);

-- 6) Team member user link used by advisor login/availability work.
SET @has_team_member_user_id := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'team_members' AND column_name = 'user_id'
);
SET @sql_team_member_user_id := IF(
  @has_team_member_user_id = 0,
  'ALTER TABLE team_members ADD COLUMN user_id INT NULL AFTER id',
  'SELECT ''team_members.user_id already exists'' AS status'
);
PREPARE stmt FROM @sql_team_member_user_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_team_member_user_index := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = DATABASE() AND table_name = 'team_members' AND index_name = 'idx_team_members_user_id'
);
SET @sql_team_member_user_index := IF(
  @has_team_member_user_index = 0,
  'CREATE INDEX idx_team_members_user_id ON team_members(user_id)',
  'SELECT ''idx_team_members_user_id already exists'' AS status'
);
PREPARE stmt FROM @sql_team_member_user_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_team_member_user_fk := (
  SELECT COUNT(*) FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'team_members'
    AND constraint_name = 'fk_team_members_user'
    AND constraint_type = 'FOREIGN KEY'
);
SET @sql_team_member_user_fk := IF(
  @has_team_member_user_fk = 0,
  'ALTER TABLE team_members ADD CONSTRAINT fk_team_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT ''fk_team_members_user already exists'' AS status'
);
PREPARE stmt FROM @sql_team_member_user_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7) Verification output.
SELECT 'HomeBoost stability migration complete' AS status;
SHOW TABLES LIKE 'employee_invites';
SHOW TABLES LIKE 'enrollment_batches';
SHOW TABLES LIKE 'employee_lead_assignments';
SHOW TABLES LIKE 'employee_lead_todos';
