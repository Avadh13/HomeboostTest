USE railway;

-- =========================================================
-- HomeBoost footer builder migration - 2026-06-30
-- Dynamic public footer controlled from Admin Panel.
-- Safe to run more than once.
-- =========================================================

CREATE TABLE IF NOT EXISTS footer_settings (
  id TINYINT PRIMARY KEY DEFAULT 1,
  is_enabled TINYINT(1) DEFAULT 1,
  brand_name VARCHAR(255) DEFAULT 'HomeBoost Employee Benefit',
  logo_text VARCHAR(40) DEFAULT 'HB',
  tagline VARCHAR(255) DEFAULT 'Employer home-buying benefit platform.',
  description TEXT NULL,
  cta_text VARCHAR(120) DEFAULT 'Request Setup',
  cta_link VARCHAR(500) DEFAULT '/contact',
  newsletter_title VARCHAR(255) DEFAULT 'Stay connected',
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

INSERT INTO footer_settings
(id, brand_name, logo_text, tagline, description, cta_text, cta_link, newsletter_title, newsletter_text, background_mode, layout_style, copyright_text)
SELECT
  1,
  'HomeBoost Employee Benefit',
  'HB',
  'Employer home-buying benefit platform.',
  'Modern employer portals, advisor communication, resources, quizzes, appointments, and guided home-buying support in one place.',
  'Request Setup',
  '/contact',
  'Need a custom employer portal?',
  'Create branded footer content, links, and calls-to-action directly from the admin panel.',
  'dark',
  'three_column',
  '© 2026 HomeBoost. All rights reserved.'
WHERE NOT EXISTS (SELECT 1 FROM footer_settings WHERE id = 1);

INSERT INTO footer_links (label, href, column_key, display_order)
SELECT * FROM (
  SELECT 'Employer Portals' AS label, '/partners' AS href, 'left' AS column_key, 1 AS display_order
  UNION ALL SELECT 'Pricing', '/pricing', 'left', 2
  UNION ALL SELECT 'Contact', '/contact', 'left', 3
  UNION ALL SELECT 'Employee Login', '/login', 'center', 1
  UNION ALL SELECT 'Create Account', '/signup', 'center', 2
  UNION ALL SELECT 'Resources', '/resources', 'center', 3
  UNION ALL SELECT 'Admin Portal', '/admin/login', 'right', 1
  UNION ALL SELECT 'Messages', '/login', 'right', 2
  UNION ALL SELECT 'Alerts', '/login', 'right', 3
  UNION ALL SELECT 'HomeBoost', '/', 'bottom', 1
) seed
WHERE NOT EXISTS (SELECT 1 FROM footer_links);

SELECT * FROM footer_settings;
SELECT * FROM footer_links ORDER BY column_key, display_order;
