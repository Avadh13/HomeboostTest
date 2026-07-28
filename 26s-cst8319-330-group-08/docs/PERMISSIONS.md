# Role and Permission Matrix

This document describes intended backend permissions. Frontend menu visibility must match these rules but does not replace API authorization.

Legend:

- **Manage**: create/update/archive within authorized scope
- **Read**: view only within authorized scope
- **Own**: only records belonging to the authenticated user
- **Assigned**: only employees explicitly assigned to the HBT Member
- **None**: access denied

| Capability | Super Admin | Admin | HBT Admin | HBT Member | Company Admin / Company | Employee |
|---|---|---|---|---|---|---|
| Platform configuration | Manage | Manage | None | None | None | None |
| Admin users / Super Admin lifecycle | Manage with final-admin safeguards | Limited; cannot create/remove Super Admin without policy | None | None | None | None |
| CMS pages, sections, cards, pricing, FAQ, footer | Manage | Manage | None | None | None | None |
| Contact-message inbox | Manage | Manage | None | None | None | None |
| HBT teams | Manage | Manage | Own team read | Own profile | None | None |
| Employer approval decisions | Manage | Manage | Submit/read own team | None | Submit/read own employer when allowed | None |
| Partnerships | Manage/archive | Manage/archive | Manage own team | Read own team only where needed | Read own partnership | Read own partnership branding only |
| Company points of contact | Manage | Manage | Manage own team partnerships | None | Manage own partnership | None |
| Employee invitations | Manage | Manage | Manage own team partnerships | None | Manage own partnership | Accept own invitation |
| HBT/Company activation invitations | Manage/resend | Manage/resend | None | None | Accept own invitation | None |
| Employees | Read/manage platform scope | Read/manage platform scope | Manage own team | Read assigned employees | Manage own partnership invitations/status | Own account only |
| Team members | Read/manage | Read/manage | Manage own team | Own profile | None | View approved advisor details |
| Resources | Manage global | Manage global | Manage own team/partnership | Read assigned resources | Read reports/availability only | Read authorized published resources |
| Quizzes | Manage global | Manage global | Manage own team when implemented | Read submissions for assigned employees | Read aggregate progress only | Read/submit authorized active quizzes |
| Quiz submissions | Read/manage | Read/manage | Own team | Assigned employees preferred; current team scope pending reduction | Aggregate only | Own submissions |
| Journeys | Manage global | Manage global | Manage own team | Read assigned employee journey status | Aggregate progress only | Own active assigned journey |
| Quiz-to-journey rules | Manage | Manage | Manage own team | None | None | None |
| Readiness / lead pipeline | Read/manage | Read/manage | Own team | Assigned employees preferred | Aggregate only | Own readiness summary |
| Messages | Platform oversight only when explicitly required | Platform oversight only when explicitly required | Own authorized conversations | Assigned employee conversations | None unless product policy adds it | Own advisor conversation |
| Reports | Platform | Platform | Own team | Assigned employees only (target state) | Own partnership | Own data only |
| Documents | Platform | Platform | Own team and approved purpose | Assigned employees and approved purpose | Own partnership and approved purpose | Own documents |
| QA release readiness | Manage | Manage | Tenant UAT only (target state) | None | Tenant acceptance only | None |
| Audit logs | Read/export under security policy | Read/export under security policy | Own-team operational subset only when approved | None | None | None |

## Authorization rules

1. Every protected endpoint must authenticate first.
2. Every mutation must explicitly list allowed roles.
3. Tenant access must be checked in the query or a centralized access service.
4. Client-supplied `team_id`, `partnership_id`, `user_id`, or role is never trusted.
5. HBT Member must not be treated as equivalent to HBT Admin for configuration.
6. Company accounts must never access another partnership.
7. Employees must only access their own account, assignment, progress, submissions, messages, and documents.
8. Inaccessible tenant records should normally return 404.
9. Super Admin changes require safeguards for self-demotion and the final active Super Admin.
10. Authorization changes require negative regression tests.

## Known gaps

- HBT Member quiz/report/readiness access still needs assigned-employee restriction in some routes.
- Super Admin lifecycle safeguards are not yet fully implemented.
- QA release catalog still needs separation from tenant UAT.
- Some legacy routes use role checks embedded directly in route files and must migrate to centralized permissions.
