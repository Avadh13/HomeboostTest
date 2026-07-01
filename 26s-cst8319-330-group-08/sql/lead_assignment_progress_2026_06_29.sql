USE railway;

CREATE TABLE IF NOT EXISTS employee_lead_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_user_id INT NOT NULL,
  team_member_user_id INT NOT NULL,
  partnership_id INT NOT NULL,
  assigned_by_user_id INT NULL,
  status ENUM('active', 'paused', 'completed') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_employee_lead_assignment_employee (employee_user_id),
  INDEX idx_employee_lead_assignments_member (team_member_user_id),
  INDEX idx_employee_lead_assignments_partnership (partnership_id),
  CONSTRAINT fk_lead_assignment_employee FOREIGN KEY (employee_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_lead_assignment_member FOREIGN KEY (team_member_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_lead_assignment_partnership FOREIGN KEY (partnership_id) REFERENCES partnerships(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employee_lead_todos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT NOT NULL,
  todo_key VARCHAR(80) NOT NULL,
  label VARCHAR(255) NOT NULL,
  sort_order INT DEFAULT 0,
  is_completed TINYINT(1) DEFAULT 0,
  completed_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lead_todo_assignment_key (assignment_id, todo_key),
  INDEX idx_lead_todo_assignment (assignment_id),
  CONSTRAINT fk_lead_todo_assignment FOREIGN KEY (assignment_id) REFERENCES employee_lead_assignments(id) ON DELETE CASCADE
);

SELECT 'lead assignment progress tables ready' AS status;
