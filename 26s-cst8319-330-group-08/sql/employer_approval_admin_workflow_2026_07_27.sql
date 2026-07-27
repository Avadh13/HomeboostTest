-- =========================================================
-- Employer Approval Admin Workflow
-- Date: 2026-07-27
-- Purpose:
--   1. Support role-aware activation invitations.
--   2. Keep existing employee invitations backward compatible.
--   3. Ensure employer approval requests can provision Company Managers.
-- =========================================================

SET @invite_role_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'employee_invites'
    AND COLUMN_NAME = 'invite_role'
);

SET @invite_role_sql = IF(
  @invite_role_exists = 0,
  "ALTER TABLE employee_invites ADD COLUMN invite_role VARCHAR(40) NOT NULL DEFAULT 'employee' AFTER status",
  "SELECT 'employee_invites.invite_role already exists'"
);

PREPARE invite_role_statement FROM @invite_role_sql;
EXECUTE invite_role_statement;
DEALLOCATE PREPARE invite_role_statement;

UPDATE employee_invites
SET invite_role = 'employee'
WHERE invite_role IS NULL OR invite_role = '';

-- The application validates invite_role before creating a user.
-- Supported values are: employee, company, company_admin.
