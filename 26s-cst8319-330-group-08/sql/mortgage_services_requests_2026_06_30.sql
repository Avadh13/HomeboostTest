USE railway;

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

INSERT INTO mortgage_services (service_key, title, short_title, description, icon, color_class, display_order)
SELECT * FROM (
  SELECT 'purchase-home', 'Purchasing a Home', 'Purchase', 'Home buying guidance and next steps.', '🏡', 'from-blue-500 to-sky-500', 1
  UNION ALL SELECT 'renewal-refinance', 'Renewal / Refinance', 'Renewal', 'Review renewal or refinance options.', '🔁', 'from-violet-500 to-purple-500', 2
  UNION ALL SELECT 'debt-consolidation', 'Debt Consolidation', 'Debt Help', 'Review consolidation support options.', '💳', 'from-emerald-500 to-teal-500', 3
  UNION ALL SELECT 'self-employed', 'Self-Employed Mortgage', 'Self-Employed', 'Support for business owners and contractors.', '💼', 'from-amber-500 to-orange-500', 4
  UNION ALL SELECT 'separation-divorce', 'Separation / Divorce Mortgage', 'Separation', 'Guidance for separation-related home planning.', '🤝', 'from-pink-500 to-rose-500', 5
  UNION ALL SELECT 'not-sure-yet', 'Not sure yet', 'Not Sure', 'Start with a simple conversation.', '✨', 'from-indigo-500 to-violet-500', 6
) seed
WHERE NOT EXISTS (SELECT 1 FROM mortgage_services);

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

-- If the table already existed from an earlier batch, add the message thread link manually if needed:
-- ALTER TABLE mortgage_service_requests ADD COLUMN message_thread_id INT NULL AFTER assigned_member_id;

SELECT * FROM mortgage_services ORDER BY display_order;
