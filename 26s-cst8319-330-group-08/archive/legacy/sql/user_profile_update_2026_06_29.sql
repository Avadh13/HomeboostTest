USE railway;

-- =========================================================
-- HomeBoost user profile migration - 2026-06-29
-- Adds personal details and profile photo fields for all roles.
-- Run once before testing /profile or /admin/profile.
-- =========================================================

SET @has_users_phone := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'phone'
);
SET @sql_users_phone := IF(@has_users_phone = 0, 'ALTER TABLE users ADD COLUMN phone VARCHAR(40) NULL AFTER email', 'SELECT ''users.phone already exists'' AS status');
PREPARE stmt FROM @sql_users_phone;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_users_job_title := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'job_title'
);
SET @sql_users_job_title := IF(@has_users_job_title = 0, 'ALTER TABLE users ADD COLUMN job_title VARCHAR(120) NULL AFTER phone', 'SELECT ''users.job_title already exists'' AS status');
PREPARE stmt FROM @sql_users_job_title;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_users_address := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'address'
);
SET @sql_users_address := IF(@has_users_address = 0, 'ALTER TABLE users ADD COLUMN address VARCHAR(255) NULL AFTER job_title', 'SELECT ''users.address already exists'' AS status');
PREPARE stmt FROM @sql_users_address;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_users_city := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'city'
);
SET @sql_users_city := IF(@has_users_city = 0, 'ALTER TABLE users ADD COLUMN city VARCHAR(120) NULL AFTER address', 'SELECT ''users.city already exists'' AS status');
PREPARE stmt FROM @sql_users_city;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_users_province := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'province'
);
SET @sql_users_province := IF(@has_users_province = 0, 'ALTER TABLE users ADD COLUMN province VARCHAR(120) NULL AFTER city', 'SELECT ''users.province already exists'' AS status');
PREPARE stmt FROM @sql_users_province;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_users_postal_code := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'postal_code'
);
SET @sql_users_postal_code := IF(@has_users_postal_code = 0, 'ALTER TABLE users ADD COLUMN postal_code VARCHAR(40) NULL AFTER province', 'SELECT ''users.postal_code already exists'' AS status');
PREPARE stmt FROM @sql_users_postal_code;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_users_bio := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'bio'
);
SET @sql_users_bio := IF(@has_users_bio = 0, 'ALTER TABLE users ADD COLUMN bio TEXT NULL AFTER postal_code', 'SELECT ''users.bio already exists'' AS status');
PREPARE stmt FROM @sql_users_bio;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_users_photo_url := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'photo_url'
);
SET @sql_users_photo_url := IF(@has_users_photo_url = 0, 'ALTER TABLE users ADD COLUMN photo_url VARCHAR(1000) NULL AFTER bio', 'SELECT ''users.photo_url already exists'' AS status');
PREPARE stmt FROM @sql_users_photo_url;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Team members already use photo_url in many screens. Add it if an older DB is missing it.
SET @has_team_members_photo_url := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'team_members' AND column_name = 'photo_url'
);
SET @sql_team_members_photo_url := IF(@has_team_members_photo_url = 0, 'ALTER TABLE team_members ADD COLUMN photo_url VARCHAR(1000) NULL', 'SELECT ''team_members.photo_url already exists'' AS status');
PREPARE stmt FROM @sql_team_members_photo_url;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT id, full_name, email, role, phone, job_title, photo_url
FROM users
ORDER BY id DESC
LIMIT 20;
