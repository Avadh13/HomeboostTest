-- HomeBoost Partnership-Based Content Permissions
-- Run once on Railway MySQL before deploying the backend changes.

USE railway;

CREATE TABLE IF NOT EXISTS resource_partnerships (
  resource_id INT NOT NULL,
  partnership_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (resource_id, partnership_id),
  INDEX idx_resource_partnerships_resource (resource_id),
  INDEX idx_resource_partnerships_partnership (partnership_id),
  CONSTRAINT fk_resource_partnerships_resource
    FOREIGN KEY (resource_id) REFERENCES resources(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_resource_partnerships_partnership
    FOREIGN KEY (partnership_id) REFERENCES partnerships(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_partnerships (
  quiz_id INT NOT NULL,
  partnership_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (quiz_id, partnership_id),
  INDEX idx_quiz_partnerships_quiz (quiz_id),
  INDEX idx_quiz_partnerships_partnership (partnership_id),
  CONSTRAINT fk_quiz_partnerships_quiz
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_quiz_partnerships_partnership
    FOREIGN KEY (partnership_id) REFERENCES partnerships(id)
    ON DELETE CASCADE
);

-- Assumption: resources and quizzes already include team_id and is_global columns.
-- Your current employee portal already queries those columns.
-- If your database is missing them, add them manually before deploy:
-- ALTER TABLE resources ADD COLUMN team_id INT NULL;
-- ALTER TABLE resources ADD COLUMN is_global TINYINT(1) DEFAULT 1;
-- ALTER TABLE quizzes ADD COLUMN team_id INT NULL;
-- ALTER TABLE quizzes ADD COLUMN is_global TINYINT(1) DEFAULT 1;
