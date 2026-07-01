-- =========================================================
-- HomeBoost production hotfix - MySQL Workbench compatible
-- Run this once on the deployed Railway MySQL database.
-- =========================================================

USE railway;

-- 1) Add employers.contact_email only if missing
SET @column_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'employers'
    AND column_name = 'contact_email'
);

SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE employers ADD COLUMN contact_email VARCHAR(255) NULL AFTER phone',
  'SELECT "employers.contact_email already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Add team_members.user_id only if missing
SET @column_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'team_members'
    AND column_name = 'user_id'
);

SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE team_members ADD COLUMN user_id INT NULL AFTER id',
  'SELECT "team_members.user_id already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) Allow hbt_member role
ALTER TABLE users
  MODIFY COLUMN role ENUM('super_admin', 'admin', 'hbt_admin', 'hbt_member', 'employee') NOT NULL DEFAULT 'employee';

-- 4) Add index for team_members.user_id only if missing
SET @index_exists := (
  SELECT COUNT(1)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'team_members'
    AND index_name = 'idx_team_members_user_id'
);

SET @sql := IF(
  @index_exists = 0,
  'CREATE INDEX idx_team_members_user_id ON team_members(user_id)',
  'SELECT "idx_team_members_user_id already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5) Add FK for team_members.user_id only if missing
SET @fk_exists := (
  SELECT COUNT(1)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'team_members'
    AND constraint_name = 'fk_team_members_user'
    AND constraint_type = 'FOREIGN KEY'
);

SET @sql := IF(
  @fk_exists = 0,
  'ALTER TABLE team_members ADD CONSTRAINT fk_team_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT "fk_team_members_user already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
