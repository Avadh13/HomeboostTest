# Role Permission Audit

This is the production permission matrix for the HomeBoost Employee Benefit Portal. Use it during final QA and client demo prep.

## Roles

- `super_admin` / `admin`: platform operator.
- `hbt_admin`: Home Buying Team admin for assigned team/partnerships.
- `hbt_member`: advisor/team member assigned to leads and appointments.
- `company_admin` / `company`: employer manager for one partnership.
- `employee`: employer employee using the benefit portal.

## Frontend route permission matrix

| Route area | Allowed roles | Expected behavior |
|---|---|---|
| `/admin/*` | `admin`, `super_admin` | Full platform admin only. |
| `/hbt/dashboard` | `hbt_admin` | HBT admin control center. |
| `/hbt/member-dashboard` | `hbt_member` | Assigned advisor workspace. |
| `/hbt/appointments` | `hbt_admin`, `hbt_member` | HBT appointment queue. |
| `/hbt/availability` | `hbt_admin`, `hbt_member` | Advisor work hours and availability. |
| `/hbt/messages` | `hbt_admin`, `hbt_member` | HBT communication center. |
| `/hbt/resources`, `/hbt/events`, `/hbt/team-members`, `/hbt/employees`, `/hbt/companies` | `hbt_admin` | HBT admin management only. |
| `/company/dashboard` | `company_admin`, `company` | Employer manager workspace. |
| `/company/messages` | `company_admin`, `company` | Company communication center. |
| `/employee-portal` | `employee` | Employee benefit portal. |
| `/employee/messages` | `employee` | Employee communication center. |
| `/employee/appointments` | `employee` | Employee appointment requests. |
| `/resources`, `/quiz` | `employee` | Employee content and readiness flow. |
| `/notifications`, `/profile` | all authenticated roles | User-owned notification/profile access. |

## Backend permission rules

### Messaging

- Users can only create one-to-one conversations with valid connected users.
- Employees can message their partnership HBT team, company manager, and platform admins.
- Company managers can message their employees, assigned HBT team, and admins.
- HBT users can message same-team HBT users, assigned company managers, employees under team partnerships, and admins.
- Admins can message active users.
- Threads are readable only by creator or recipient.

### Appointments

- Employees can create and view only their own appointments.
- HBT admins and members can view/update appointments for their team.
- Admins can view all appointments.
- Appointment approval checks advisor time conflicts.
- Employee cancellation/reschedule should remain scoped to the employee's own appointments.

### Notifications

- Users can view and mark only their own notifications.
- Admin/HBT/company/employee notifications should route to role-appropriate links.

### Mortgage/service requests

- Public users can submit intake requests with consent.
- Logged-in employees can submit requests and automatically create advisor conversations when an advisor is available.
- HBT users can view/update requests belonging to their team or assigned to them.
- Admins can view/update all requests.

### Company dashboard

- Company managers can manage only their own partnership invite list and CSV batches.
- Company managers cannot see other employer data.
- Revoking batches should only affect pending invites from that batch.

### Admin

- Admin APIs must remain admin-only for users, partnerships, HBTs, CMS, footer, mortgage services, service requests, and global appointments.

## QA checks

1. Login as each role and verify correct redirect.
2. Paste protected URLs manually with the wrong role.
3. Confirm the UI redirects/blocks access.
4. Confirm the backend returns `401` for missing tokens and `403` for wrong roles.
5. Confirm no disabled user can access protected data.
6. Confirm users cannot access records from another partnership/team.

## Current hardening added

- Production diagnostic database routes are hidden unless `ENABLE_DIAGNOSTIC_ROUTES=true`.
- Security headers are applied globally.
- CORS is restricted to configured Vercel/local origins.
- Role protected frontend routes are centralized in `App.tsx`.
