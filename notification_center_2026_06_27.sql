-- =========================================================
-- HomeBoost Notification Center Feature
-- Run this once on Railway MySQL before deploying notification center.
-- =========================================================

USE railway;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  target_role ENUM('all', 'super_admin', 'admin', 'hbt_admin', 'hbt_member', 'employee') NULL,
  target_team_id INT NULL,
  target_partnership_id INT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  link VARCHAR(500),
  type ENUM('info', 'success', 'warning', 'appointment', 'system') DEFAULT 'info',
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_role (target_role),
  INDEX idx_notifications_team (target_team_id),
  INDEX idx_notifications_partnership (target_partnership_id),
  INDEX idx_notifications_read (is_read),

  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_notifications_team
    FOREIGN KEY (target_team_id) REFERENCES home_buying_teams(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_notifications_partnership
    FOREIGN KEY (target_partnership_id) REFERENCES partnerships(id)
    ON DELETE CASCADE
);
