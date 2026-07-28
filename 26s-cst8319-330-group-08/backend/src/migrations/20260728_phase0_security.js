const version = "20260728_phase0_security";

const up = async (connection) => {
  await connection.query(`CREATE TABLE IF NOT EXISTS hbt_registrations (
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
    INDEX idx_hbt_registrations_payment (payment_status),
    INDEX idx_hbt_registrations_checkout (checkout_session_id)
  ) ENGINE=InnoDB`);

  await connection.query(`CREATE TABLE IF NOT EXISTS payments (
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
  ) ENGINE=InnoDB`);

  await connection.query(`CREATE TABLE IF NOT EXISTS hbt_registration_status_tokens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    registration_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hbt_status_registration (registration_id),
    UNIQUE KEY uq_hbt_status_token_hash (token_hash),
    INDEX idx_hbt_status_expires (expires_at),
    CONSTRAINT fk_hbt_status_registration
      FOREIGN KEY (registration_id) REFERENCES hbt_registrations(id)
      ON DELETE CASCADE
  ) ENGINE=InnoDB`);

  await connection.query(`CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(120) NOT NULL,
    provider_session_id VARCHAR(255) NULL,
    registration_id INT NULL,
    processing_status VARCHAR(40) NOT NULL DEFAULT 'processing',
    failure_code VARCHAR(120) NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,
    UNIQUE KEY uq_stripe_webhook_event_id (event_id),
    INDEX idx_stripe_webhook_session (provider_session_id),
    INDEX idx_stripe_webhook_registration (registration_id),
    INDEX idx_stripe_webhook_status (processing_status)
  ) ENGINE=InnoDB`);

  await connection.query(`CREATE TABLE IF NOT EXISTS account_activation_invitations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    email VARCHAR(180) NOT NULL,
    target_role VARCHAR(40) NOT NULL,
    team_id INT NULL,
    partnership_id INT NULL,
    token_hash CHAR(64) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'pending',
    expires_at DATETIME NOT NULL,
    accepted_at DATETIME NULL,
    revoked_at DATETIME NULL,
    created_by_user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_activation_token_hash (token_hash),
    INDEX idx_activation_user (user_id),
    INDEX idx_activation_email (email),
    INDEX idx_activation_status (status),
    INDEX idx_activation_expires (expires_at)
  ) ENGINE=InnoDB`);

  await connection.query(`CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    actor_user_id INT NULL,
    actor_role VARCHAR(40) NULL,
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(120) NULL,
    team_id INT NULL,
    partnership_id INT NULL,
    request_id VARCHAR(120) NULL,
    ip_hash CHAR(64) NULL,
    result VARCHAR(30) NOT NULL DEFAULT 'success',
    metadata_json JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_actor (actor_user_id),
    INDEX idx_audit_action (action),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_team (team_id),
    INDEX idx_audit_partnership (partnership_id),
    INDEX idx_audit_created (created_at)
  ) ENGINE=InnoDB`);
};

module.exports = { version, up };
