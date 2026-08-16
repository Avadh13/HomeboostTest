-- CSV employee enrollment migration for an existing database.
-- Run this once on the same database used by backend/.env DB_NAME.

CREATE TABLE IF NOT EXISTS enrollment_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  partnership_id INT NOT NULL,
  uploaded_by_user_id INT NOT NULL,
  original_filename VARCHAR(255),
  created_count INT DEFAULT 0,
  skipped_count INT DEFAULT 0,
  status ENUM('active', 'revoked') DEFAULT 'active',
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_enrollment_batches_partnership
    FOREIGN KEY (partnership_id) REFERENCES partnerships(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_enrollment_batches_uploaded_by
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- Run this only if the column does not already exist.
-- MySQL Workbench check:
-- SHOW COLUMNS FROM users LIKE 'enrollment_batch_id';
ALTER TABLE users
ADD COLUMN enrollment_batch_id INT NULL;

ALTER TABLE users
ADD CONSTRAINT fk_users_enrollment_batch
FOREIGN KEY (enrollment_batch_id) REFERENCES enrollment_batches(id)
ON DELETE SET NULL;
