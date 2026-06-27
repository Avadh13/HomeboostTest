-- =========================================================
-- HomeBoost production hotfix - 2026-06-27
-- Run this once on the deployed Railway MySQL database.
-- =========================================================

ALTER TABLE employers
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255) NULL AFTER phone;

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS user_id INT NULL AFTER id;

ALTER TABLE users
  MODIFY COLUMN role ENUM('super_admin', 'admin', 'hbt_admin', 'hbt_member', 'employee') NOT NULL DEFAULT 'employee';

SET @index_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'team_members'
    AND index_name = 'idx_team_members_user_id'
);

SET @create_index_sql := IF(
  @index_exists = 0,
  'CREATE INDEX idx_team_members_user_id ON team_members(user_id)',
  'SELECT "idx_team_members_user_id already exists"'
);

PREPARE stmt FROM @create_index_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists := (
  SELECT COUNT(1)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'team_members'
    AND constraint_name = 'fk_team_members_user'
    AND constraint_type = 'FOREIGN KEY'
);

SET @create_fk_sql := IF(
  @fk_exists = 0,
  'ALTER TABLE team_members ADD CONSTRAINT fk_team_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT "fk_team_members_user already exists"'
);

PREPARE stmt FROM @create_fk_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
