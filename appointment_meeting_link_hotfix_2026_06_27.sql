-- =========================================================
-- HomeBoost Appointment Advisor Note + Meeting Link Hotfix
-- Run this once on Railway MySQL before deploying this feature.
-- Compatible with MySQL versions that do not support ADD COLUMN IF NOT EXISTS.
-- =========================================================

USE railway;

-- 1) Add advisor_note column if missing
SET @column_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'appointments'
    AND column_name = 'advisor_note'
);

SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE appointments ADD COLUMN advisor_note TEXT NULL AFTER message',
  'SELECT "appointments.advisor_note already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Add meeting_link column if missing
SET @column_exists := (
  SELECT COUNT(1)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'appointments'
    AND column_name = 'meeting_link'
);

SET @sql := IF(
  @column_exists = 0,
  'ALTER TABLE appointments ADD COLUMN meeting_link VARCHAR(500) NULL AFTER advisor_note',
  'SELECT "appointments.meeting_link already exists"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
