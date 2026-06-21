# Non-Functional Requirements

| ID | Category | Requirement | Acceptance Criteria |
|---|---|---|---|
| NFR-001 | Security | Authentication shall use JWT tokens for protected API routes. | Protected APIs reject requests without a valid Bearer token. |
| NFR-002 | Security | Passwords shall be stored using bcrypt hashing. | No plain-text passwords are stored in the database. |
| NFR-003 | Security | Role-based access control shall restrict dashboards by user role. | Employees cannot access HBT/Admin pages; HBT Admins cannot access Admin pages. |
| NFR-004 | Security | CSV enrollment shall be limited to HBT Admins and their assigned partnerships. | Unauthorized upload attempts return 403. |
| NFR-005 | Data Integrity | CSV enrollment shall be batch-tracked. | Every created CSV employee has `enrollment_batch_id`. |
| NFR-006 | Data Integrity | Revoke shall affect only employees from the selected batch. | Employees from other partnerships/batches remain untouched. |
| NFR-007 | Reliability | CSV upload shall clean temporary uploaded files after processing. | Uploaded server temp files are removed after success or failure. |
| NFR-008 | Reliability | CSV upload shall use a transaction. | If processing fails, partial batch/user inserts are rolled back. |
| NFR-009 | Usability | The interface shall clearly identify the employer before CSV upload. | HBT Companies page shows employer name and confirmation before upload. |
| NFR-010 | Usability | The application shall support responsive layout. | Public, employee, HBT, and admin pages are usable on desktop and mobile widths. |
| NFR-011 | Performance | Typical API requests should respond quickly on local/client deployment. | Basic list/detail operations return without noticeable delay for normal datasets. |
| NFR-012 | Maintainability | Code shall separate routes, controllers, middleware, and frontend pages. | Backend and frontend files follow existing folder structure. |
| NFR-013 | Maintainability | Environment-specific values shall stay in `.env` files. | Database credentials and API URLs are not hard-coded in source logic. |
| NFR-014 | Compatibility | The app shall run with Node, React/Vite, Express, and MySQL. | `npm install` and documented startup commands work on a clean machine. |
| NFR-015 | Auditability | The system shall keep upload batch details until revoke/delete. | HBT Admin can see file name, created count, skipped count, and batch ID. |
