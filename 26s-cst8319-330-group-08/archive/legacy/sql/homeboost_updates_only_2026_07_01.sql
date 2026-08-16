USE railway;

-- =========================================================
-- HomeBoost Updates-Only Migration - 2026-07-01
-- This is NOT a full database rebuild.
-- It only adds/patches the tables, columns, seed data, and copy
-- required by the recent mortgage-benefit batches.
-- No DROP TABLE statements.
-- =========================================================

SET @db_name = DATABASE();

-- =========================================================
-- 1) Profile fields used by profile/theme/message UI
-- =========================================================
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='users' AND COLUMN_NAME='phone') = 0, 'ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL AFTER email', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='users' AND COLUMN_NAME='job_title') = 0, 'ALTER TABLE users ADD COLUMN job_title VARCHAR(120) NULL AFTER phone', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='users' AND COLUMN_NAME='address') = 0, 'ALTER TABLE users ADD COLUMN address VARCHAR(255) NULL AFTER job_title', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='users' AND COLUMN_NAME='city') = 0, 'ALTER TABLE users ADD COLUMN city VARCHAR(120) NULL AFTER address', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='users' AND COLUMN_NAME='province') = 0, 'ALTER TABLE users ADD COLUMN province VARCHAR(80) NULL AFTER city', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='users' AND COLUMN_NAME='postal_code') = 0, 'ALTER TABLE users ADD COLUMN postal_code VARCHAR(30) NULL AFTER province', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='users' AND COLUMN_NAME='bio') = 0, 'ALTER TABLE users ADD COLUMN bio TEXT NULL AFTER postal_code', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='users' AND COLUMN_NAME='photo_url') = 0, 'ALTER TABLE users ADD COLUMN photo_url VARCHAR(1000) NULL AFTER bio', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='users' AND COLUMN_NAME='last_seen_at') = 0, 'ALTER TABLE users ADD COLUMN last_seen_at DATETIME NULL AFTER photo_url', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =========================================================
-- 2) Message thread privacy/linkage updates
-- =========================================================
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='message_threads' AND COLUMN_NAME='recipient_id') = 0, 'ALTER TABLE message_threads ADD COLUMN recipient_id INT NULL AFTER assigned_member_id', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='message_threads' AND COLUMN_NAME='created_by') = 0, 'ALTER TABLE message_threads ADD COLUMN created_by INT NULL AFTER recipient_id', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =========================================================
-- 3) Footer builder update tables + mortgage wording
-- =========================================================
CREATE TABLE IF NOT EXISTS footer_settings (
  id TINYINT PRIMARY KEY DEFAULT 1,
  is_enabled TINYINT(1) DEFAULT 1,
  brand_name VARCHAR(255) DEFAULT 'HomeBoost Mortgage Benefit',
  logo_text VARCHAR(40) DEFAULT 'HB',
  tagline VARCHAR(255) DEFAULT 'Mortgage & home buying benefit platform.',
  description TEXT NULL,
  cta_text VARCHAR(120) DEFAULT 'Start Mortgage Request',
  cta_link VARCHAR(500) DEFAULT '/mortgage-request',
  newsletter_title VARCHAR(255) DEFAULT 'Need mortgage guidance?',
  newsletter_text TEXT NULL,
  background_mode ENUM('dark','light','soft') DEFAULT 'dark',
  layout_style ENUM('three_column','compact','newsletter') DEFAULT 'three_column',
  copyright_text VARCHAR(255) DEFAULT '© 2026 HomeBoost. All rights reserved.',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS footer_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(120) NOT NULL,
  href VARCHAR(500) NOT NULL,
  column_key ENUM('left','center','right','bottom') DEFAULT 'left',
  display_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  opens_new_tab TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO footer_settings (id, brand_name, logo_text, tagline, description, cta_text, cta_link, newsletter_title, newsletter_text, background_mode, layout_style, copyright_text)
SELECT 1,
  'HomeBoost Mortgage Benefit',
  'HB',
  'Mortgage & home buying benefit platform.',
  'Modern employer portals, advisor communication, mortgage service intake, resources, appointments, and guided home-buying support in one place.',
  'Start Mortgage Request',
  '/mortgage-request',
  'Need mortgage guidance?',
  'Choose a service, share your details, and connect with the right advisor through HomeBoost.',
  'dark',
  'three_column',
  '© 2026 HomeBoost. All rights reserved.'
WHERE NOT EXISTS (SELECT 1 FROM footer_settings WHERE id = 1);

UPDATE footer_settings
SET
  brand_name = 'HomeBoost Mortgage Benefit',
  tagline = 'Mortgage & home buying benefit platform.',
  description = 'Modern employer portals, advisor communication, mortgage service intake, resources, appointments, and guided home-buying support in one place.',
  cta_text = 'Start Mortgage Request',
  cta_link = '/mortgage-request',
  newsletter_title = 'Need mortgage guidance?',
  newsletter_text = 'Choose a service, share your details, and connect with the right advisor through HomeBoost.'
WHERE id = 1;

INSERT INTO footer_links (label, href, column_key, display_order, is_active, opens_new_tab)
SELECT 'Mortgage Services', '/mortgage-request', 'left', 2, 1, 0
WHERE NOT EXISTS (SELECT 1 FROM footer_links WHERE label = 'Mortgage Services');

-- =========================================================
-- 4) Mortgage services admin builder table + seed services
-- =========================================================
CREATE TABLE IF NOT EXISTS mortgage_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_key VARCHAR(160) NOT NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  short_title VARCHAR(80) NULL,
  description TEXT NULL,
  icon VARCHAR(20) DEFAULT '🏡',
  color_class VARCHAR(120) DEFAULT 'from-blue-500 to-violet-500',
  display_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO mortgage_services (service_key, title, short_title, description, icon, color_class, display_order, is_active)
SELECT * FROM (
  SELECT 'purchase-home', 'Purchasing a Home', 'Purchase', 'Guidance for first-time buyers, next-home buyers, pre-approval, affordability, and next steps.', '🏡', 'from-blue-500 to-sky-500', 1, 1
  UNION ALL SELECT 'renewal-refinance', 'Renewal / Refinance', 'Renewal', 'Review renewal options, refinance strategy, payment goals, and lender alternatives before signing.', '🔁', 'from-violet-500 to-purple-500', 2, 1
  UNION ALL SELECT 'debt-consolidation', 'Debt Consolidation', 'Debt Help', 'Explore mortgage-based strategies to simplify debt, improve cash flow, and plan responsibly.', '💳', 'from-emerald-500 to-teal-500', 3, 1
  UNION ALL SELECT 'self-employed', 'Self-Employed Mortgage', 'Self-Employed', 'Support for business owners, contractors, and non-traditional income documentation.', '💼', 'from-amber-500 to-orange-500', 4, 1
  UNION ALL SELECT 'separation-divorce', 'Separation / Divorce Mortgage', 'Separation', 'Sensitive guidance for buyouts, refinancing, affordability, and next-home planning after separation.', '🤝', 'from-pink-500 to-rose-500', 5, 1
  UNION ALL SELECT 'not-sure-yet', 'Not sure yet', 'Not Sure', 'Start with a simple conversation and let an advisor help identify the right mortgage path.', '✨', 'from-indigo-500 to-violet-500', 6, 1
) seed
WHERE NOT EXISTS (SELECT 1 FROM mortgage_services);

-- =========================================================
-- 5) Mortgage intake requests table
-- =========================================================
CREATE TABLE IF NOT EXISTS mortgage_service_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service_id INT NULL,
  service_key VARCHAR(160) NULL,
  service_title VARCHAR(180) NULL,
  requester_user_id INT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  preferred_contact_method ENUM('email','phone','text','no_preference') DEFAULT 'no_preference',
  preferred_time VARCHAR(120) NULL,
  message TEXT NULL,
  consent TINYINT(1) DEFAULT 0,
  status ENUM('new','contacted','in_review','appointment_booked','documents_requested','completed','closed') DEFAULT 'new',
  partnership_id INT NULL,
  hbt_team_id INT NULL,
  assigned_member_id INT NULL,
  message_thread_id INT NULL,
  source VARCHAR(80) DEFAULT 'website',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_msr_status (status),
  INDEX idx_msr_requester (requester_user_id),
  INDEX idx_msr_partnership (partnership_id),
  INDEX idx_msr_hbt_team (hbt_team_id),
  INDEX idx_msr_assigned_member (assigned_member_id),
  INDEX idx_msr_message_thread (message_thread_id),
  CONSTRAINT fk_msr_service FOREIGN KEY (service_id) REFERENCES mortgage_services(id) ON DELETE SET NULL
);

SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='mortgage_service_requests' AND COLUMN_NAME='message_thread_id') = 0, 'ALTER TABLE mortgage_service_requests ADD COLUMN message_thread_id INT NULL AFTER assigned_member_id', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =========================================================
-- 6) Mortgage copy updates for existing CMS homepage
-- =========================================================
UPDATE page_sections ps
JOIN pages p ON ps.page_id = p.id
SET
  ps.title = 'Mortgage guidance built into the employee benefit experience.',
  ps.subtitle = 'Mortgage guidance for employees, homeowners, and families.',
  ps.content = 'HomeBoost connects employer partnerships to trusted mortgage advisors while giving employees and clients a clear path for buying, renewing, refinancing, debt consolidation, and complex mortgage situations.',
  ps.button_text = 'Start Mortgage Request',
  ps.button_link = '/mortgage-request'
WHERE p.slug = 'home'
AND ps.section_key = 'hero';

UPDATE page_sections ps
JOIN pages p ON ps.page_id = p.id
SET
  ps.title = 'Mortgage resources',
  ps.subtitle = 'Education, service requests, messages, appointments, and progress in one guided portal.',
  ps.content = 'Give every employee and client a clear path to learn, ask questions, connect with advisors, and book the next conversation.'
WHERE p.slug = 'home'
AND ps.section_key = 'resources';

-- =========================================================
-- 7) Quick verification output
-- =========================================================
SELECT 'footer_settings' AS updated_area, COUNT(*) AS total FROM footer_settings
UNION ALL SELECT 'footer_links', COUNT(*) FROM footer_links
UNION ALL SELECT 'mortgage_services', COUNT(*) FROM mortgage_services
UNION ALL SELECT 'mortgage_service_requests', COUNT(*) FROM mortgage_service_requests;
