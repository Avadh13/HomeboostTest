# Test Cases

## Test Data
Use the CSV template in `samples/employee_enrollment_template.csv`.

## Functional Test Cases

| TC ID | Feature | Preconditions | Steps | Expected Result | Status |
|---|---|---|---|---|---|
| TC-001 | Public Homepage | Backend and frontend running | Open `/` | Homepage loads without login | Ready |
| TC-002 | Employer Portal Page | Seed data imported | Open `/joessmokeshop` | Employer branded portal loads | Ready |
| TC-003 | Login - Admin | Admin seed user exists | Login with admin account | Redirects to `/admin` | Ready |
| TC-004 | Login - HBT Admin | HBT seed user exists | Login with HBT account | Redirects to `/hbt/dashboard` | Ready |
| TC-005 | Login - Employee | Employee seed user exists | Login with employee account | Redirects to `/employee-portal` | Ready |
| TC-006 | Protected Employee Portal | User logged out | Open `/employee-portal` | Redirects to `/login` | Ready |
| TC-007 | Protected Resources | User logged out | Open `/resources` | Redirects to `/login` | Ready |
| TC-008 | Employee Resource Access | Employee logged in | Open `/resources` | Employee resources load | Ready |
| TC-009 | Employee Quiz Submit | Employee logged in | Open `/quiz/1`, answer questions, submit | Quiz submission succeeds | Ready |
| TC-010 | HBT Partnerships | HBT Admin logged in | Open `/hbt/companies` | Assigned partnerships load | Ready |
| TC-011 | CSV Enrollment Success | HBT Admin logged in; CSV valid | Upload `employee_enrollment_template.csv` to correct partnership | Created count equals valid new employees; batch appears | Ready |
| TC-012 | CSV Duplicate Email Handling | Employees already uploaded | Upload same CSV again | Duplicate emails skipped and reported | Ready |
| TC-013 | CSV Missing Fields | CSV row missing full_name or email | Upload CSV | Invalid rows skipped; valid rows still created | Ready |
| TC-014 | CSV Invalid File Type | HBT Admin logged in | Upload `.txt` or `.pdf` file | Upload rejected | Ready |
| TC-015 | CSV Wrong Partnership Protection | HBT Admin attempts upload to non-owned partnership ID via API | POST upload request | API returns 403 | Ready |
| TC-016 | Revoke Batch | CSV batch exists | Click Revoke Upload | Employees from that batch are deleted; batch disappears | Ready |
| TC-017 | Revoke Isolation | Two CSV batches exist | Revoke one batch | Only employees from selected batch are deleted | Ready |
| TC-018 | Admin Manage Users | Admin logged in | Open `/admin/users` | Users table loads with roles/status | Ready |
| TC-019 | Disable User | Admin logged in | Change user status to Disabled | User cannot use protected routes | Ready |
| TC-020 | Contact Message | Public user on contact page | Submit contact form | Contact message saved for admin review | Ready |

## Non-Functional Test Cases

| TC ID | Requirement | Steps | Expected Result | Status |
|---|---|---|---|---|
| NFT-001 | JWT security | Call protected API without Authorization header | API returns 401 | Ready |
| NFT-002 | RBAC | Login as employee and open `/hbt/dashboard` | Redirects away from HBT area | Ready |
| NFT-003 | Disabled account security | Disable user, then login/access protected route | Login/access is blocked | Ready |
| NFT-004 | CSV size limit | Upload CSV larger than configured limit | Upload rejected | Ready |
| NFT-005 | CSV temp file cleanup | Upload CSV and inspect `uploads/csv` | Temp file removed after processing | Ready |
| NFT-006 | Transaction safety | Simulate DB error during upload | Partial upload does not remain | Ready |
| NFT-007 | Responsive layout | Open main pages at mobile width | Navigation and cards remain usable | Ready |
| NFT-008 | Build validation | Run `npm run build` in frontend | Production build completes | Ready |
| NFT-009 | Backend syntax validation | Run `node --check` on edited backend files | No syntax errors | Ready |
| NFT-010 | Database schema validation | Import `db.sql` into clean DB | All tables and constraints create successfully | Ready |

## Manual Client Acceptance Checklist

- [ ] Super Admin can log in and access Admin panel.
- [ ] HBT Admin can access HBT dashboard.
- [ ] Employee can access Employee Portal.
- [ ] Public employer portal page loads by slug.
- [ ] HBT Admin can upload a valid employee CSV to the correct employer.
- [ ] Upload creates employee users under the selected partnership.
- [ ] Upload batch is visible after upload.
- [ ] Revoke deletes only users from that upload batch.
- [ ] Admin Manage Users matches the database after revoke.
- [ ] No client-facing page uses the word “demo” for production flow.
