-- HomeBoost Admin Payment Tracking
-- Safe to run before testing the admin payments dashboard.

CREATE TABLE IF NOT EXISTS hbt_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(180) NOT NULL,
  email VARCHAR(180) NOT NULL,
  phone VARCHAR(60) NULL,
  company_name VARCHAR(180) NOT NULL,
  role_title VARCHAR(120) NULL,
  website_url VARCHAR(255) NULL,
  notes TEXT NULL,
  status VARCHAR(40) DEFAULT 'started',
  payment_status VARCHAR(40) DEFAULT 'pending',
  team_id INT NULL,
  user_id INT NULL,
  checkout_session_id VARCHAR(180) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hbt_registrations_email (email),
  INDEX idx_hbt_registrations_status (status),
  INDEX idx_hbt_registrations_payment (payment_status)
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  registration_id INT NULL,
  user_id INT NULL,
  team_id INT NULL,
  provider VARCHAR(40) DEFAULT 'stripe',
  provider_session_id VARCHAR(180) NULL,
  amount_cents INT DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'cad',
  status VARCHAR(40) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payments_registration (registration_id),
  INDEX idx_payments_status (status),
  INDEX idx_payments_provider_session (provider_session_id)
);
