-- HomeBoost Advisor Availability + 1-hour appointment support
-- Run once on Railway MySQL before enabling availability UI.

USE railway;

ALTER TABLE appointments
  ADD COLUMN duration_minutes INT NOT NULL DEFAULT 60 AFTER preferred_date;

CREATE TABLE advisor_availability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_member_id INT NOT NULL,
  day_of_week TINYINT NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:00:00',
  end_time TIME NOT NULL DEFAULT '17:00:00',
  is_available TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_advisor_day (team_member_id, day_of_week),
  INDEX idx_advisor_availability_member (team_member_id),
  CONSTRAINT fk_advisor_availability_member
    FOREIGN KEY (team_member_id) REFERENCES team_members(id)
    ON DELETE CASCADE
);

CREATE TABLE advisor_time_off (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_member_id INT NOT NULL,
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_advisor_time_off_member (team_member_id),
  INDEX idx_advisor_time_off_range (start_datetime, end_datetime),
  CONSTRAINT fk_advisor_time_off_member
    FOREIGN KEY (team_member_id) REFERENCES team_members(id)
    ON DELETE CASCADE
);

INSERT IGNORE INTO advisor_availability (team_member_id, day_of_week, start_time, end_time, is_available)
SELECT tm.id, days.day_of_week, '09:00:00', '17:00:00', 1
FROM team_members tm
JOIN (
  SELECT 1 AS day_of_week UNION ALL
  SELECT 2 UNION ALL
  SELECT 3 UNION ALL
  SELECT 4 UNION ALL
  SELECT 5
) days;
