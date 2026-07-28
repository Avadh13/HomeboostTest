const version = "20260728_employer_approval";

const up = async (connection) => {
  await connection.query(`CREATE TABLE IF NOT EXISTS employer_approval_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partnership_id INT NULL,
    employer_id INT NULL,
    team_id INT NULL,
    requested_by_user_id INT NULL,
    requested_company_name VARCHAR(180) NOT NULL,
    contact_name VARCHAR(180) NULL,
    contact_email VARCHAR(255) NULL,
    contact_phone VARCHAR(80) NULL,
    contact_title VARCHAR(120) NULL,
    approval_status VARCHAR(40) DEFAULT 'pending',
    review_note TEXT NULL,
    reviewed_by_user_id INT NULL,
    reviewed_at DATETIME NULL,
    approved_at DATETIME NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employer_approval_partnership (partnership_id),
    INDEX idx_employer_approval_team (team_id),
    INDEX idx_employer_approval_status (approval_status),
    INDEX idx_employer_approval_requested_by (requested_by_user_id)
  ) ENGINE=InnoDB`);

  await connection.query(`CREATE TABLE IF NOT EXISTS company_points_of_contact (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partnership_id INT NOT NULL,
    user_id INT NULL,
    full_name VARCHAR(180) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(80) NULL,
    title VARCHAR(120) NULL,
    is_primary TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_by_user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_company_poc_partnership_email (partnership_id, email),
    INDEX idx_company_poc_partnership (partnership_id),
    INDEX idx_company_poc_active (is_active)
  ) ENGINE=InnoDB`);
};

module.exports = { version, up };
