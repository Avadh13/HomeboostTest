# Admin Auth, Lint, Dependencies, And Upload Fixes

Date: 2026-08-07

## Changed

- Added shared frontend auth helpers for bearer headers and central 401 handling.
- Sent admin Authorization headers on protected CMS mutations for pricing, FAQs, sections, and cards.
- Sent admin Authorization headers for Admin Dashboard resource and quiz reads, and normalized raw-array or wrapped API response shapes.
- Fixed document upload success messaging so saved files return `Document uploaded`.
- Added backend route protection tests for admin-protected content routes and document upload messaging.
- Remediated backend npm audit findings with non-forced dependency updates.
- Updated frontend dependencies with non-forced fixes and `react-router-dom@7.18.2`.
- Adjusted frontend lint configuration so React compiler set-state-in-effect and Fast Refresh export-only checks report warnings instead of blocking CI.

## Dependency Risk Note

Backend `npm audit` reports zero vulnerabilities after updates.

Frontend `npm audit` still reports a high React Router advisory for RSC/action request processing in `react-router >=7.12.0 <8.3.0`. This application is a Vite single-page app using browser routing; it does not use React Router RSC, SSR, framework data routers, server actions, or action request handling. The residual advisory is therefore documented as not reachable in the current architecture. Continue monitoring React Router releases and upgrade to the first patched compatible version when available.

## DB Migration Note

Runtime `ensure*` table creation remains in place for this patch. Moving all runtime schema creation into explicit migrations spans journeys, courses, documents, reports, recommendations, analytics, and portal branding, and should be handled as a dedicated migration PR with a production DB snapshot rehearsal.

