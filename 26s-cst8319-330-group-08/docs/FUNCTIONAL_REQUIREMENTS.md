# Functional Requirements

## Product Scope
The system is a client-ready Employee Benefit Program portal for employer home-buying benefits. It connects Super Admins, Home Buying Team administrators, and employees through employer partnerships. Employers receive a public branded portal page but do not log in.

## User Roles
- **Super Admin / Admin:** manages platform data, HBTs, users, pages, resources, pricing, FAQs, quizzes, and submissions.
- **HBT Admin:** manages assigned employer partnerships, employees, team members, resources, events, quiz submissions, and CSV enrollment.
- **Employee:** accesses the branded employee portal, resources, quizzes, events, and Home Buying Team support.
- **Employer:** has a public branded portal page only; employer login is intentionally out of scope.

## Functional Requirements

| ID | Requirement | Priority | Acceptance Criteria |
|---|---|---:|---|
| FR-001 | The system shall allow users to sign in through one login form. | High | User enters valid credentials and is redirected based on role. |
| FR-002 | The system shall redirect each authenticated user to the correct dashboard based on role. | High | Admin -> `/admin`, HBT Admin -> `/hbt/dashboard`, Employee -> `/employee-portal`. |
| FR-003 | The system shall prevent unauthenticated users from accessing protected employee, HBT, and admin pages. | High | Protected pages redirect to `/login`. |
| FR-004 | The system shall allow public users to view the homepage, pricing, contact page, and employer branded pages. | High | These routes load without login. |
| FR-005 | The system shall allow employees to sign up using a partnership slug. | High | Employee account is connected to the correct partnership. |
| FR-006 | The system shall allow employees to view their employee portal content after login. | High | Employee sees partnership-specific portal information. |
| FR-007 | The system shall allow employees to view resources assigned globally or to their assigned Home Buying Team. | High | Employee cannot view resources without login. |
| FR-008 | The system shall allow employees to submit quizzes. | High | Quiz submission stores answers under the logged-in employee. |
| FR-009 | The system shall allow HBT Admins to view assigned employer partnerships. | High | HBT Admin sees only partnerships belonging to their team. |
| FR-010 | The system shall allow HBT Admins to upload a CSV file to enroll employees under a selected partnership. | High | CSV creates employee accounts linked to the selected partnership and batch. |
| FR-011 | The system shall validate CSV upload file type and required fields. | High | Non-CSV files and rows missing name/email are rejected or skipped safely. |
| FR-012 | The system shall prevent duplicate employee emails during CSV enrollment. | High | Existing or duplicated emails are skipped and reported. |
| FR-013 | The system shall record each CSV upload as an enrollment batch. | High | Batch stores partnership, uploader, file name, created count, and skipped count. |
| FR-014 | The system shall allow HBT Admins to revoke an enrollment batch. | High | Revoke deletes only employees created by that exact batch and removes the batch row. |
| FR-015 | The system shall prevent an HBT Admin from uploading employees to a partnership outside their team. | High | API returns 403 when partnership does not belong to the HBT Admin's team. |
| FR-016 | The system shall allow HBT Admins to manage team members. | Medium | HBT Admin can create/view/update team member information. |
| FR-017 | The system shall allow HBT Admins to manage events. | Medium | HBT Admin can manage benefit sessions and workshops. |
| FR-018 | The system shall allow Admins to manage users and user status. | High | Admin can change roles and activate/disable accounts. |
| FR-019 | The system shall allow Admins to manage CMS content. | Medium | Pages, sections, cards, resources, FAQs, pricing, and contact messages are manageable. |
| FR-020 | The system shall show clear success/error messages for major user actions. | Medium | Upload, revoke, login, and submit actions display understandable messages. |

## Out of Scope
- Employer login dashboard.
- Payment processing.
- Production email delivery and password reset emails.
- External CRM integration.
