USE railway;

-- If your users.role column is an ENUM, run this so employer manager roles are accepted.
-- If your users.role column is already VARCHAR, this is still okay as long as all current role values are listed here.
ALTER TABLE users
  MODIFY COLUMN role ENUM(
    'super_admin',
    'admin',
    'hbt_admin',
    'hbt_member',
    'company_admin',
    'company',
    'employee'
  ) NOT NULL DEFAULT 'employee';

-- To turn an existing user into an employer manager, set role + partnership_id.
-- Replace the email and partnership slug before running.
--
-- UPDATE users u
-- JOIN partnerships p ON p.slug = 'your-company-slug'
-- SET u.role = 'company_admin',
--     u.partnership_id = p.id,
--     u.team_id = NULL,
--     u.is_active = 1
-- WHERE u.email = 'manager@company.com';

SELECT
  u.id,
  u.full_name,
  u.email,
  u.role,
  u.partnership_id,
  p.slug AS partnership_slug
FROM users u
LEFT JOIN partnerships p ON u.partnership_id = p.id
WHERE u.role IN ('company_admin', 'company')
ORDER BY u.id DESC;
