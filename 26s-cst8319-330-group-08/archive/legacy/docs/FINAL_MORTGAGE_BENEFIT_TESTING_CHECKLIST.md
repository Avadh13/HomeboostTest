# HomeBoost Mortgage Benefit Final Testing Checklist

Run this after pulling the latest code and before final deployment.

## 1. Install and build

```bash
cd 26s-cst8319-330-group-08/frontend
npm install
npm run build

cd ../backend
npm install
npm test
npm run dev
```

## 2. Workbench migration

Run once at the end:

```text
homeboost_final_workbench_migration_2026_07_01.sql
```

## 3. Public pages

Check:

```text
/
/pricing
/contact
/partners
/{partnership-slug}
/mortgage-request
```

Expected:

- HomeBoost Mortgage Benefit wording is visible.
- Mortgage service cards are visible.
- Employer/partnership pages show mortgage services.
- Mobile sticky CTA shows Book a Call and Start Request.
- Theme switcher changes Auto/Light/Dark/Soft.

## 4. Employee flow

Check:

```text
/employee-portal
/mortgage-request
/employee/messages
/employee/appointments
/notifications
```

Expected:

- Employee can start a mortgage request.
- Request appears in employee portal request panel.
- If employee has partnership/HBT advisor, private message thread is created.
- Employee receives notification.
- Status updates appear after admin/advisor changes request status.

## 5. Advisor/HBT member flow

Check:

```text
/hbt/member-dashboard
/hbt/messages
/hbt/appointments
```

Expected:

- Advisor sees assigned mortgage requests.
- Advisor can update request status.
- Advisor can open messages and appointments.

## 6. HBT admin flow

Check:

```text
/hbt/dashboard
/hbt/messages
/hbt/appointments
/hbt/employees
```

Expected:

- HBT admin sees request pipeline summary for their team.
- HBT admin can update status for team requests.
- HBT admin receives new request notifications.

## 7. Company manager flow

Check:

```text
/company/dashboard
```

Expected:

- Company sees privacy-safe engagement summary only.
- Company does not see private messages or detailed mortgage notes.
- Counts show total requests, active requests, completed requests, employees used, status mix, and popular services.

## 8. Admin flow

Check:

```text
/admin
/admin/mortgage-services
/admin/service-requests
/admin/footer
/admin/notifications
```

Expected:

- Admin can add/edit/reorder/disable mortgage services.
- Admin can view all mortgage requests.
- Admin can update request status.
- Admin receives new request notification.
- Footer builder still works.

## 9. Privacy test

- Employee should only see their own request and their own one-to-one chat.
- Advisor should only see assigned/team requests.
- Company manager should only see summary counts.
- Admin can manage requests but should not be used as a private chat reader in demo.

## 10. Final deployment order

1. Push/pull latest code.
2. Run Workbench migration.
3. Restart Railway backend.
4. Redeploy Vercel frontend.
5. Test live URLs.
