# Client Handoff Checklist

## Setup
1. Import `db.sql` into the MySQL database.
2. Confirm backend `.env` has the correct database name.
3. Run backend seed scripts for internal QA accounts.
4. Start backend with `npm run dev` or `npm start`.
5. Start frontend with `npm run dev`.

## Client-Ready Validation
- Public homepage loads.
- Employer portal slug loads.
- One login form redirects users by role.
- Employee portal is protected.
- Resources and quizzes are protected for employees.
- HBT Admin sees only assigned partnerships.
- CSV upload creates employees under the selected partnership.
- CSV revoke deletes only employees from the selected upload batch.
- Admin users list matches the database after CSV revoke.

## CSV Enrollment Notes
Required CSV columns:

```csv
full_name,email
```

Rules:
- Upload is restricted to HBT Admin users.
- Upload must be done on the correct employer partnership card.
- The system asks for confirmation before upload.
- Duplicate emails are skipped.
- Invalid email rows are skipped.
- Every upload creates a batch ID.
- Revoke deletes the uploaded employees and removes the batch row.

## Known Future Enhancements
- Production email invitation delivery.
- Forced password reset on first login.
- Audit table for revoked/deleted batch history.
- CSV preview before final import.
- Advanced reporting dashboards.
