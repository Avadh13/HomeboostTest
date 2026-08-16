# The Employee Benefit Program - HomeBoost Portal

Client-facing React + Node + MySQL portal for employer home-buying benefits.

## Core routes

- Public program site: `/`
- Employer branded page: `/:slug`
- Login: `/login`
- Admin / Super Admin: `/admin`
- HBT Admin: `/hbt/dashboard`
- HBT Member / Advisor: `/hbt/member-dashboard`
- Company / Partnership Manager: `/company/dashboard`
- Employee: `/employee-portal`

## Roles

- `super_admin` / `admin`: platform administration, HBTs, partnerships, employer approvals, users, CMS, resources, quizzes, payments, reports, and operational configuration.
- `hbt_admin`: manages its own HBT team, employer workflow, employees, team members, resources, events, journeys, invitations, quiz submissions, and reports.
- `hbt_member`: advisor/member role with restricted HBT access.
- `company_admin` / `company`: employer/partnership manager role for the linked partnership.
- `employee`: invitation-based employee portal access for the linked employer partnership.

## Employee enrollment

Employee accounts are invitation-based. HBT Admins and Company/Partnership Managers can create approved employee invitations using their scoped workflows.

CSV employee enrollment uses:

```csv
full_name,email
Jane Employee,jane.employee@example.com
```

Rules include tenant scoping, duplicate/invalid-row handling, enrollment batch tracking, and non-destructive revocation of pending invitations. Registered Employee accounts and their history are not deleted by batch revocation.

Sample:

```text
samples/employee_enrollment_template.csv
```

## Documentation

Current project and operational documentation remains under `docs/`, including:

- `docs/FUNCTIONAL_REQUIREMENTS.md`
- `docs/NON_FUNCTIONAL_REQUIREMENTS.md`
- `docs/CLIENT_HANDOFF_CHECKLIST.md`
- `docs/CLIENT_REQUIREMENTS_AND_TEST_CASES.md`
- `docs/TEST_CASES.md`
- `docs/SECURITY.md`
- `docs/PERMISSIONS.md`
- `docs/MIGRATIONS.md`
- `docs/PRODUCTION_DEPLOYMENT.md`
- `docs/BACKUP_AND_RESTORE.md`
- `docs/AUDIT_REMEDIATION_STATUS.md`

Historical implementation notes, old status reports, superseded SQL scripts, and unused frontend files are retained under `archive/`. See `archive/README.md` before restoring or executing anything from there.

## Database setup

`sql/db.sql` remains the bootstrap baseline for a fresh database. After loading the baseline, run the ordered backend migrations:

```bash
cd backend
npm run migrate
```

Production and development startup also run the migration runner automatically.

Example baseline import:

```bash
mysql -u root -p < sql/db.sql
```

Set the actual database name through backend environment variables rather than relying on a hard-coded development database name.

## Environment setup

Copy the example environment files before running locally.

Frontend:

```bash
cd frontend
copy .env.example .env
```

Backend:

```bash
cd backend
copy .env.example .env
```

For production, configure environment variables in the hosting platform rather than committing real `.env` files. Key values include:

```env
VITE_API_BASE_URL=https://your-backend-url/api
CORS_ORIGINS=https://your-frontend-url
JWT_SECRET=replace_with_a_long_random_secret
DB_HOST=your-db-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
```

## Backend

```bash
cd backend
npm install
npm run migrate
npm run dev
```

Checks:

```bash
npm test
npm run test:integration
npm run check
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Deployment

Vercel frontend:

```text
Root Directory: 26s-cst8319-330-group-08/frontend
Build Command: npm run build
Output Directory: dist
Environment: VITE_API_BASE_URL=https://your-backend-url/api
```

Railway backend:

```text
Root Directory: 26s-cst8319-330-group-08/backend
Start Command: npm start
Environment: configure values from backend/.env.example
```
