# The Employee Benefit Program - HomeBoost Portal

Client-ready full-stack React + Node + MySQL portal for employer home-buying benefits.

## Core Flow

- Public site: `/`
- Employer branded page: `/:slug` such as `/joessmokeshop`
- Single login: `/login`
- Super Admin dashboard: `/admin`
- HBT Admin dashboard: `/hbt/dashboard`
- Employee portal: `/employee-portal`

## Roles

- `super_admin` / `admin`: manages platform configuration, users, HBTs, CMS content, resources, quizzes, pricing, FAQs, and contact messages.
- `hbt_admin`: manages assigned employer partnerships, employees, team members, resources, events, quiz submissions, and CSV employee enrollment.
- `employee`: signs up from an employer page and uses the branded employee portal.

Employers do not log in. Employers receive branded public pages through partnerships.

## CSV Employee Enrollment

HBT Admins can upload employee CSV files under a specific employer partnership.

Required CSV format:

```csv
full_name,email
Jane Employee,jane.employee@example.com
```

Enrollment rules:

- Upload is available only to HBT Admin users.
- Upload is restricted to partnerships owned by the logged-in HBT Admin's team.
- Duplicate emails are skipped.
- Invalid rows are skipped with a reason.
- Every upload creates an enrollment batch.
- Revoke Upload deletes only employees created by that exact batch and removes the batch row.

A sample file is included:

```text
samples/employee_enrollment_template.csv
```

## Documentation

Client handoff documents are included in the `docs` folder:

- `docs/FUNCTIONAL_REQUIREMENTS.md`
- `docs/NON_FUNCTIONAL_REQUIREMENTS.md`
- `docs/TEST_CASES.md`
- `docs/CLIENT_HANDOFF_CHECKLIST.md`
- `docs/CLIENT_REQUIREMENTS_AND_TEST_CASES.md`

## Database Setup

All SQL files are organized in the `sql` folder.

Import `sql/db.sql` into MySQL for a fresh database setup.

Example:

```bash
mysql -u root -p project2 < sql/db.sql
```

Confirm backend `.env` uses the same database name:

```env
DB_NAME=project2
```

## Backend Setup

Create or update `backend/.env`, then run:

```bash
cd backend
npm install
npm run dev
```
