const version = "20260728_phase0_security";

const up = async (connection) => {
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
  )`);

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
  )`);

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
  )`);

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
  )`);
};

module.exports = { version, up };
