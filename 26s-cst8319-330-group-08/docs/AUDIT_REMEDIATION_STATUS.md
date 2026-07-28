# Audit Remediation Status

Last updated: 2026-07-28

Branch: `security/audit-critical-fixes-2026-07-28`

Pull request: #13

This file tracks the repository audit findings. `Implemented` means code and regression coverage exist in the remediation branch. It does not mean the change has been merged or production-verified. `Partial` means risk was reduced but additional work remains. `Open` means the finding still requires implementation.

## Critical findings

| ID | Status | Implementation and evidence | Remaining limitation |
|---|---|---|---|
| C-01 | Implemented | Contact GET/PUT/DELETE require Admin/Super Admin. Input validation, pagination, affected-row checks, transactional deletion, and `contact_message.deleted` audit event added. | Live API authorization test against deployed backend still required. |
| C-02 | Implemented for access control | Page, Section, Card, Pricing, and FAQ mutations require Admin/Super Admin through centralized role middleware. | Complete field validation and before/after audit events remain for each CMS controller. |
| C-03 | Implemented for authentication and signature validation | Upload requires Admin/Super Admin/HBT Admin. Memory-first handling validates JPEG/PNG/WebP signatures, selects extension server-side, uses UUID filenames, hashes content, limits size, and audits the write. | Image decode/re-encode, malware scanning, per-tenant quota, object storage, and replacement of broad static serving remain. |
| C-04 | Implemented | Production webhook requires configured secret and signature. Stripe event construction is strict. Session metadata, stored session ID, provider, paid state, amount, currency, and customer email are validated. Event IDs are unique and replay-safe. Provisioning is in the same transaction. Negative unit tests added. | Signed Stripe CLI/test-mode integration test and live Railway secret verification remain. |
| C-05 | Implemented | Public registration/payment status uses 256-bit opaque tokens, stores only SHA-256 hashes, applies expiry/revocation checks, and returns minimum non-PII state. Frontend updated. | Endpoint-specific distributed rate limiting remains. |
| C-06 | Implemented | HBT provisioning refuses role/team conflicts. New accounts are inactive and receive single-use hashed activation invitations. Public payment pages never receive credentials. Activation has expiry, one-time use, strong password creation, and audit logging. | Transactional email delivery remains; Admin currently must deliver generated activation links through an approved channel. |
| C-07 | Implemented | Submission access middleware scopes both HBT Admin and HBT Member by team for detail/status paths; readiness path also checks team. Negative tests added. | Assigned-advisor-only restriction for HBT Members remains. |
| C-08 | Implemented | Central journey access service validates role, team, employee membership, journey ownership, step ownership, resources, checklist items, assignment, duplication, archive, and progress. Employees can complete only steps in their active assigned journey. | Employee checklist-item completion is a separate high-priority feature and remains open. |
| C-09 | Implemented | Quiz-to-journey rules are HBT Admin/Admin managed, team-scoped, reference-validated, and submission-scoped. Rule application cannot cross teams. Negative tests added. | Database foreign keys/composite constraints for every relationship remain. |
| C-10 | Implemented | Readiness calculation checks submission ownership for Employee and HBT team scope before processing. | Full assigned-advisor least-privilege and live database integration test remain. |

## High-priority findings

| ID | Status | Notes |
|---|---|---|
| H-01 | Open | Separate employee-visible quiz catalog from Admin catalog; filter active/team/partnership content. |
| H-02 | Open | Validate active quiz, question membership, required answers, duplicate IDs, onboarding/repeat policy transactionally. |
| H-03 | Open | Restrict HBT Member resource/recommendation configuration privileges. |
| H-04 | Open | Add explicit role authorization to partnership and event mutations. |
| H-05 | Open | Protect last Super Admin, self-demotion, promotion, and disabling. |
| H-06 | Open | Replace hard partnership/employer deletion with archive/deactivate. |
| H-07 | Implemented for HBT and approval activation | HBT and compatible inactive Company Manager accounts use single-use activation invitations rather than temporary passwords. Other legacy provisioning paths still require review. |
| H-08 | Partial | General employee/company invites and employer-approval invites now use hashed credentials and audited lifecycle transitions. Company Manager CSV/batch and other legacy invitation producers must be migrated to the same service. |
| H-09 | Partial | Activation and invite acceptance share an 8-character uppercase/lowercase/number policy. Direct signup/reset paths still require one centralized policy module. |
| H-10 | Open | Password reset/account recovery not yet implemented. |
| H-11 | Open | JWT remains in localStorage; refresh/session revocation design not implemented. |
| H-12 | Open | Separate global release QA from HBT tenant UAT. |
| H-13 | Open | Neutralize formula-prefixed CSV cells and add tests. |
| H-14 | Partial | Ordered migration runner and `schema_migrations` added; new security/invite/employer-approval schemas moved to migrations. Runtime DDL remains in other modules. |
| H-15 | Partial | Node unit regression suites now run in CI without database secrets. Disposable-DB integration suite remains. |
| H-16 | Open | Frontend component and Playwright suites remain. |
| H-17 | Open | Server-derived onboarding gate remains. |
| H-18 | Open | Employee checklist-item progress remains. |
| H-19 | Open | Complete course/module/lesson CMS remains. |
| H-20 | Open | Transactional email provider, queue, retries, delivery/bounce tracking remain. |
| H-21 | Partial | Stripe webhook transition is idempotent and transactional. Manual Admin payment-state changes still need explicit provisioning/revocation state-machine behavior. |
| H-22 | Open | Restrict HBT Member report scope to assigned employees. |

## Data integrity and backend design

| ID | Status | Notes |
|---|---|---|
| D-01 | Partial | Stripe, employer approval, contact deletion, invite acceptance/create/resend/revoke, activation, and journey assignment use transactions. Remaining multi-table controllers require conversion. |
| D-02 | Partial | Added affected-row checks to remediated routes. Repository-wide completion remains. |
| D-03 | Partial | Remediated routes return sanitized errors. Existing route-local `error.message` responses remain elsewhere. |
| D-04 | Partial | New security status-token table has a foreign key; additional controlled lifecycle constraints remain. |
| D-05 | Open | Persistent encrypted object/private storage, scanning, retention, and recovery remain. |
| D-06 | Open | Replace synchronous large-file hashing in document paths. |
| D-07 | Open | Replace in-process rate limiter with Redis-compatible shared limiter. |
| D-08 | Open | Add signup/payment-start idempotency key. |
| D-09 | Partial | Immutable `audit_logs` schema/service added with redaction, correlation ID, and IP HMAC. Events cover contact deletion, uploads, activation, invites, employer approvals, and contacts. Repository-wide privileged event coverage remains. |

## Frontend and layout

| ID | Status | Notes |
|---|---|---|
| U-01 | Open | Employee dashboard still needs backend-derived completion progress. |
| U-02 | Open | Employee Journey still needs checklist/resource rendering and per-item completion. |
| U-03 | Implemented | Repeated completed-step submission is idempotent and reports `already_completed`. Reopen workflow remains intentionally absent. |
| U-04 | Open | Shared typed API client and standardized retry/error states remain. |
| U-05 | Open | Consolidate global CSS override layers. |
| U-06 | Open | Remove dark/soft theme remnants. |
| U-07 | Open | Remove DOM-shape selectors used to hide controls. |
| U-08 | Open | Rebuild Admin Dashboard in shared light design. |
| U-09 | Open | Rename misleading System Health metric. |
| U-10 | Open | Replace placeholder public video. |
| U-11 | Open | Replace remote placeholder photography. |
| U-12 | Open | Rename discovery-call CTA or connect approved external link. |
| U-13 | Partial | New activation/payment copy uses Employee Benefit Program; complete repository glossary normalization remains. |
| U-14 | Open | Replace `0$` with `$0`. |
| U-15 | Partial | Default journey copy no longer instructs internal appointment booking; stale references remain elsewhere. |
| U-16 | Open | Replace Unicode navigation symbols. |
| U-17 | Open | Accessible mobile drawer focus management remains. |
| U-18 | Open | Remove global button nowrap where responsive wrapping is needed. |
| U-19 | Open | Add responsive table/card strategy. |
| U-20 | Open | Move route-specific widgets into explicit layouts. |

## Documentation

| ID | Status | Notes |
|---|---|---|
| DOC-01 | Open | README role model still needs Company Manager update. |
| DOC-02 | Open | Normalize database-name instructions. |
| DOC-03 | Open | Correct invitation/batch revocation documentation. |
| DOC-04 | Partial | Migration runner and this status document added. Full ordered migration inventory and rollback runbook remain. |

## Verification completed on this branch

- HomeBoost CI: backend unit tests/syntax and frontend build pass.
- QA Reimplementation Checks: pass.
- Vercel preview: success.
- Pull request remains draft, open, mergeable, and unmerged.

## Release blockers

The application must not be called production-ready until:

1. All Critical implementations pass live integration tests.
2. New migrations are executed successfully on a disposable fresh database and a production-like copy.
3. Stripe signed webhook tests pass with Stripe CLI/test mode.
4. Remaining High findings H-01 through H-22 are closed or explicitly accepted by the client and security owner.
5. Onboarding, checklist progress, email delivery, backup/restore, accessibility, and role-based E2E suites pass.
