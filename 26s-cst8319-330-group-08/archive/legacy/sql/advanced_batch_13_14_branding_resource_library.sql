-- HomeBoost Advanced Batch 13 + 14
-- Employer Branded Portal Polish + Resource Search/Filters/Journey Library
-- Safe to run after Batch 9-12.

CREATE TABLE IF NOT EXISTS partnership_portal_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partnership_id INT NOT NULL,
  portal_title VARCHAR(180) NULL,
  welcome_message TEXT NULL,
  prompt_text TEXT NULL,
  logo_url VARCHAR(500) NULL,
  primary_color VARCHAR(30) NULL,
  secondary_color VARCHAR(30) NULL,
  footer_text TEXT NULL,
  is_published TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_partnership_portal_settings (partnership_id),
  INDEX idx_partnership_portal_settings_published (is_published)
);

CREATE TABLE IF NOT EXISTS resource_bookmarks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  resource_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_resource_bookmark (user_id, resource_id),
  INDEX idx_resource_bookmarks_user (user_id),
  INDEX idx_resource_bookmarks_resource (resource_id)
);

CREATE TABLE IF NOT EXISTS resource_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL,
  description TEXT NULL,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_resource_categories_slug (slug),
  INDEX idx_resource_categories_active (is_active)
);

INSERT IGNORE INTO resource_categories (name, slug, description, sort_order) VALUES
('Mortgage Readiness', 'mortgage-readiness', 'Readiness guides, pre-approval steps, and mortgage preparation resources.', 1),
('First-Time Buyer', 'first-time-buyer', 'Resources for employees preparing to buy their first home.', 2),
('Documents', 'documents', 'Document checklists, upload guidance, and advisor preparation.', 3),
('Renewal and Refinance', 'renewal-refinance', 'Resources for mortgage renewals, refinancing, and planning conversations.', 4);
