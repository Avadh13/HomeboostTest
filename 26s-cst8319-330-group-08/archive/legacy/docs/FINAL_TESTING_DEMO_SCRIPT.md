# Final Testing and Demo Script

Use this script after every Railway and Vercel redeploy. The goal is to prove the role flow, dashboards, messaging, notifications, appointments, mortgage requests, resources, quizzes, profile, and admin features work from end to end.

## 1. Production smoke check

1. Open the Vercel site.
2. Open the Railway health endpoint: `/api/health`.
3. Confirm the login page does not show a failed API/CORS message.
4. Confirm browser console has no red CORS, 404, or 500 errors during login.

## 2. Login and role redirects

Test one account per role:

- Super Admin / Admin should redirect to `/admin`.
- HBT Admin should redirect to `/hbt/dashboard`.
- HBT Member should redirect to `/hbt/member-dashboard`.
- Company Manager should redirect to `/company/dashboard`.
- Employee should redirect to `/employee-portal`.

Expected result: every user lands on their own dashboard and cannot manually open another role dashboard.

## 3. Employee demo flow

1. Login as employee.
2. Confirm employee portal loads employer logo, employer name, employee name, resources, quizzes, advisors, and progress.
3. Open Resources and verify assigned resources show.
4. Open a Quiz and submit answers.
5. Open Messages and send a message to the advisor/HBT contact.
6. Open Appointments and request a valid appointment time.
7. Submit a mortgage service request.
8. Open Profile and update basic profile details.
9. Confirm notifications show new appointment or request updates after HBT action.

## 4. HBT Admin demo flow

1. Login as HBT Admin.
2. Confirm HBT dashboard loads stats, work hours, appointment requests, and module cards.
3. Open Employees and verify assigned employer employees show.
4. Open Messages and confirm the employee message appears.
5. Reply to the employee.
6. Open Appointments and approve/reschedule/cancel a request.
7. Open Availability and update advisor work hours.
8. Open Resources and add/update assigned resources.
9. Open Quiz Submissions and verify the employee quiz appears.
10. Open Events and verify event list/admin flow.

## 5. HBT Member demo flow

1. Login as HBT Member.
2. Confirm assigned leads and lead progress load.
3. Toggle a lead todo item.
4. Open Messages and reply to a client.
5. Open Appointments and verify assigned/upcoming appointment data.
6. Confirm the HBT Member cannot access Super Admin routes.

## 6. Company Manager demo flow

1. Login as Company Manager.
2. Confirm company dashboard loads employer branding, signup conversion, employee list, CSV batches, quiz submissions, and appointment overview.
3. Add one employee invite.
4. Upload a small CSV with `full_name,email`.
5. Verify duplicate/invalid rows are skipped correctly.
6. Revoke an active upload batch and confirm pending invites stop being active.
7. Open company Messages and send a message to HBT team.

## 7. Admin demo flow

1. Login as Admin/Super Admin.
2. Confirm admin dashboard metrics load.
3. Manage HBTs, users, partnerships, pages, sections, cards, pricing, FAQs, footer, mortgage services, service requests, appointments, resources, and quizzes.
4. Open Admin Messages and confirm communication center works inside AdminLayout.
5. Open Notifications and mark notifications read.
6. Confirm admin can see service requests and appointment updates.

## 8. Negative permission checks

Manually try these URLs with the wrong roles:

- Employee opening `/admin` should be blocked.
- Employee opening `/hbt/dashboard` should be blocked.
- Company Manager opening `/hbt/dashboard` should be blocked.
- HBT Member opening `/admin` should be blocked.
- Public user opening `/employee-portal` should be redirected to login.

Expected result: no protected data is displayed.

## 9. UI consistency checks

1. Check desktop width.
2. Check mobile width.
3. Check dark theme and light theme.
4. Confirm duplicate dashboard buttons are gone where navbar already provides navigation.
5. Confirm footer renders on public pages and does not damage dashboard layouts.

## 10. Demo talking points

- One login redirects users based on role.
- Employer-branded employee portal connects resources, quizzes, appointment booking, mortgage requests, and advisor messaging.
- HBT teams manage partnerships, employees, resources, quizzes, events, appointments, availability, and messages.
- Company managers manage approved employee access and monitor activity.
- Admin manages platform-level content and operations.
- Notifications and messages connect the flow across roles.

## Final pass/fail rule

The demo is ready only when these are true:

- All five role dashboards load in production.
- No login CORS/API error appears.
- Employee can message, request appointment, submit quiz, and submit mortgage request.
- HBT can reply and update appointment/request status.
- Admin can see the resulting records.
- Wrong roles cannot open protected dashboards.
