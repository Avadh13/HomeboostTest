USE railway;

CREATE TABLE IF NOT EXISTS employee_invites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partnership_id INT NOT NULL,
  enrollment_batch_id INT NULL,
  invited_by_user_id INT NULL,
  registered_user_id INT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  status ENUM('invited', 'registered', 'revoked') NOT NULL DEFAULT 'invited',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  registered_at DATETIME NULL,
  revoked_at DATETIME NULL,
  UNIQUE KEY uq_employee_invite_partnership_email (partnership_id, email),
  INDEX idx_employee_invites_email (email),
  INDEX idx_employee_invites_status (status),
  INDEX idx_employee_invites_batch (enrollment_batch_id),
  CONSTRAINT fk_employee_invites_partnership
    FOREIGN KEY (partnership_id) REFERENCES partnerships(id)
    ON DELETE CASCADE
);

INSERT INTO employee_invites (
  partnership_id,
  full_name,
  email,
  status,
  registered_user_id,
  registered_at
)
SELECT
  u.partnership_id,
  u.full_name,
  LOWER(u.email),
  'registered',
  u.id,
  NOW()
FROM users u
WHERE u.role = 'employee'
  AND u.partnership_id IS NOT NULL
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  status = 'registered',
  registered_user_id = VALUES(registered_user_id),
  registered_at = COALESCE(employee_invites.registered_at, NOW());

SELECT
  partnership_id,
  status,
  COUNT(*) AS total
FROM employee_invites
GROUP BY partnership_id, status
ORDER BY partnership_id, status;
