-- HomeBoost Advanced Batch 9 + 10
-- HBT Course Portal + Employee Journey Management
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  audience_role VARCHAR(60) DEFAULT 'hbt',
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_courses_active (is_active),
  INDEX idx_courses_audience (audience_role)
);

CREATE TABLE IF NOT EXISTS course_modules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_course_modules_course (course_id),
  INDEX idx_course_modules_active (is_active)
);

CREATE TABLE IF NOT EXISTS course_lessons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  module_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  lesson_type VARCHAR(40) DEFAULT 'article',
  content TEXT NULL,
  video_url VARCHAR(500) NULL,
  resource_url VARCHAR(500) NULL,
  estimated_minutes INT DEFAULT 5,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_course_lessons_module (module_id),
  INDEX idx_course_lessons_active (is_active)
);

CREATE TABLE IF NOT EXISTS course_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  lesson_id INT NOT NULL,
  status VARCHAR(40) DEFAULT 'completed',
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_course_progress_lesson (user_id, lesson_id),
  INDEX idx_course_progress_user_course (user_id, course_id),
  INDEX idx_course_progress_status (status)
);

CREATE TABLE IF NOT EXISTS journeys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  journey_type VARCHAR(80) DEFAULT 'home_buying',
  is_default TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_journeys_team (team_id),
  INDEX idx_journeys_active (is_active),
  INDEX idx_journeys_default (is_default)
);

CREATE TABLE IF NOT EXISTS journey_steps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journey_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  step_type VARCHAR(60) DEFAULT 'task',
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_journey_steps_journey (journey_id),
  INDEX idx_journey_steps_active (is_active)
);

CREATE TABLE IF NOT EXISTS journey_step_resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journey_step_id INT NOT NULL,
  resource_id INT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_journey_step_resource (journey_step_id, resource_id),
  INDEX idx_journey_step_resources_step (journey_step_id),
  INDEX idx_journey_step_resources_resource (resource_id)
);

CREATE TABLE IF NOT EXISTS journey_checklist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  journey_step_id INT NOT NULL,
  title VARCHAR(180) NOT NULL,
  description TEXT NULL,
  is_required TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_journey_checklist_step (journey_step_id),
  INDEX idx_journey_checklist_active (is_active)
);

CREATE TABLE IF NOT EXISTS employee_journey_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  journey_id INT NOT NULL,
  assigned_by_user_id INT NULL,
  source VARCHAR(60) DEFAULT 'manual',
  status VARCHAR(40) DEFAULT 'active',
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  UNIQUE KEY uq_employee_active_journey (user_id, journey_id),
  INDEX idx_employee_journey_user (user_id),
  INDEX idx_employee_journey_journey (journey_id),
  INDEX idx_employee_journey_status (status)
);

CREATE TABLE IF NOT EXISTS employee_journey_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  journey_id INT NOT NULL,
  journey_step_id INT NOT NULL,
  status VARCHAR(40) DEFAULT 'completed',
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_employee_step_progress (user_id, journey_step_id),
  INDEX idx_employee_progress_user_journey (user_id, journey_id),
  INDEX idx_employee_progress_status (status)
);
