USE railway;

-- =========================================================
-- HomeBoost one-to-one messaging migration - 2026-06-29
-- Required after switching communication center from team-visible
-- conversations to strict private one-to-one conversations.
-- =========================================================

SET @has_message_recipient_id := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'message_threads'
    AND column_name = 'recipient_id'
);

SET @sql_message_recipient_id := IF(
  @has_message_recipient_id = 0,
  'ALTER TABLE message_threads ADD COLUMN recipient_id INT NULL AFTER created_by',
  'SELECT ''message_threads.recipient_id already exists'' AS status'
);

PREPARE stmt FROM @sql_message_recipient_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_message_recipient_index := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'message_threads'
    AND index_name = 'idx_message_threads_recipient'
);

SET @sql_message_recipient_index := IF(
  @has_message_recipient_index = 0,
  'CREATE INDEX idx_message_threads_recipient ON message_threads(recipient_id)',
  'SELECT ''idx_message_threads_recipient already exists'' AS status'
);

PREPARE stmt FROM @sql_message_recipient_index;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_message_recipient_fk := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE constraint_schema = DATABASE()
    AND table_name = 'message_threads'
    AND constraint_name = 'fk_message_threads_recipient'
    AND constraint_type = 'FOREIGN KEY'
);

SET @sql_message_recipient_fk := IF(
  @has_message_recipient_fk = 0,
  'ALTER TABLE message_threads ADD CONSTRAINT fk_message_threads_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT ''fk_message_threads_recipient already exists'' AS status'
);

PREPARE stmt FROM @sql_message_recipient_fk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Preserve old direct employee-advisor threads as one-to-one.
UPDATE message_threads
SET recipient_id = assigned_member_id
WHERE recipient_id IS NULL
  AND employee_id IS NOT NULL
  AND assigned_member_id IS NOT NULL
  AND created_by = employee_id;

UPDATE message_threads
SET recipient_id = employee_id
WHERE recipient_id IS NULL
  AND employee_id IS NOT NULL
  AND assigned_member_id IS NOT NULL
  AND created_by = assigned_member_id;

SELECT
  id,
  subject,
  created_by,
  recipient_id,
  employee_id,
  assigned_member_id,
  partnership_id,
  hbt_team_id,
  status
FROM message_threads
ORDER BY id DESC;
