-- =========================================================
-- HomeBoost production hotfix - 2026-06-27
-- Run this once on the deployed Railway MySQL database.
-- Safe to run multiple times where supported by IF NOT EXISTS.
-- =========================================================

-- 1) public-partnerships route reads employers.contact_email
ALTER TABLE employers
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255) NULL AFTER phone;

-- 2) HBT team-member controller links team_members to users
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS user_id INT NULL AFTER id;

-- 3) Code supports hbt_member login role
ALTER TABLE users
  MODIFY COLUMN role ENUM('super_admin', 'admin', 'hbt_admin', 'hbt_member', 'employee') NOT NULL DEFAULT 'employee';

-- 4) Add index for team_members.user_id if it does not already exist
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

-- 5) Add FK for team_members.user_id if it does not already exist
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
