USE project2;

-- =========================================================
-- Batch 3 + 4 support migration
-- Messaging stability + notification polish
-- Safe to run more than once.
-- =========================================================

SET @db_name = DATABASE();

-- Message one-to-one linkage columns used by current backend.
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='message_threads' AND COLUMN_NAME='recipient_id') = 0, 'ALTER TABLE message_threads ADD COLUMN recipient_id INT NULL AFTER assigned_member_id', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='message_threads' AND COLUMN_NAME='created_by') = 0, 'ALTER TABLE message_threads ADD COLUMN created_by INT NULL AFTER recipient_id', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Presence fields used by message/contact UI.
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='users' AND COLUMN_NAME='last_seen_at') = 0, 'ALTER TABLE users ADD COLUMN last_seen_at DATETIME NULL', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='users' AND COLUMN_NAME='is_online') = 0, 'ALTER TABLE users ADD COLUMN is_online TINYINT(1) DEFAULT 0', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Notification type may already be VARCHAR in some DBs; this only updates ENUM installs.
SET @sql = IF(
  (SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='notifications' AND COLUMN_NAME='type') = 'enum',
  'ALTER TABLE notifications MODIFY COLUMN type ENUM(''info'',''success'',''warning'',''appointment'',''message'',''service_request'',''system'') DEFAULT ''info''',
  'SELECT 1'
); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Indexes for message polling, unread badge counts, and notification center.
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='message_threads' AND INDEX_NAME='idx_message_threads_pair') = 0, 'CREATE INDEX idx_message_threads_pair ON message_threads (created_by, recipient_id, status, updated_at)', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='message_threads' AND INDEX_NAME='idx_message_threads_recipient') = 0, 'CREATE INDEX idx_message_threads_recipient ON message_threads (recipient_id, created_by, status, updated_at)', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='messages' AND INDEX_NAME='idx_messages_thread_read') = 0, 'CREATE INDEX idx_messages_thread_read ON messages (thread_id, sender_id, is_read, created_at)', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='notifications' AND INDEX_NAME='idx_notifications_user_read') = 0, 'CREATE INDEX idx_notifications_user_read ON notifications (user_id, is_read, created_at)', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=@db_name AND TABLE_NAME='notifications' AND INDEX_NAME='idx_notifications_role_scope_read') = 0, 'CREATE INDEX idx_notifications_role_scope_read ON notifications (target_role, target_team_id, target_partnership_id, is_read, created_at)', 'SELECT 1'); PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'batch_3_4_messaging_notifications_done' AS status;
