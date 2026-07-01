-- =========================================================
-- HomeBoost Priority 1 Feature: Appointment Booking System
-- Run this once on Railway MySQL before testing appointment pages.
-- =========================================================

USE railway;

CREATE TABLE IF NOT EXISTS appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_user_id INT NOT NULL,
  team_member_id INT NULL,
  partnership_id INT NULL,
  topic VARCHAR(255) NOT NULL,
  preferred_date DATETIME NULL,
  message TEXT,
  status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_appointments_employee (employee_user_id),
  INDEX idx_appointments_team_member (team_member_id),
  INDEX idx_appointments_partnership (partnership_id),
  INDEX idx_appointments_status (status),

  CONSTRAINT fk_appointments_employee
    FOREIGN KEY (employee_user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_appointments_team_member
    FOREIGN KEY (team_member_id) REFERENCES team_members(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_appointments_partnership
    FOREIGN KEY (partnership_id) REFERENCES partnerships(id)
    ON DELETE SET NULL
);
