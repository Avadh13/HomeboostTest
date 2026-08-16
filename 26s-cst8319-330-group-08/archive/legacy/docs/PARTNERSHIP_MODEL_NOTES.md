# Partnership Model Notes

Current flow:
- One public portal domain.
- One login route: `/login`.
- Roles: `super_admin`, `admin`, `hbt_admin`, `employee`.
- Employer does not log in.
- Employer public page is `/:slug`, for example `/joessmokeshop`.
- Employee signs up from `/signup?partnership=joessmokeshop` or from the employer portal page.

Database relationship:
- `home_buying_teams` owns HBT content and team members.
- `employers` owns employer branding.
- `partnerships` joins one HBT with one employer and gives the public slug.
- `users.partnership_id` connects employees to the correct employer branding and HBT content.
- `users.team_id` connects HBT admins to their team.
- `enrollment_batches` tracks employee CSV uploads by partnership and uploader.
- `users.enrollment_batch_id` connects CSV-created employees to the exact upload batch.

CSV enrollment:
- HBT Admin uploads employees to a specific partnership.
- Required columns: `full_name,email`.
- Duplicate or invalid rows are skipped.
- Revoke Upload deletes only employees from the selected batch and removes the batch row.

Internal QA seed scripts after importing `db.sql`:
```bash
cd backend
node src/seed/createAdminUser.js
node src/seed/createHBTUser.js
node src/seed/createEmployeeUser.js
```

Internal QA logins:
- admin@test.com / admin123
- hbt@test.com / hbt123
- employee@test.com / employee123

Local employer URL:
- http://localhost:5173/joessmokeshop
