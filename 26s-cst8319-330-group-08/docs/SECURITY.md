# Security Architecture and Operating Rules

## Security boundary

The React frontend is not an authorization boundary. Every protected read or mutation must be authenticated and authorized in the Express API, with tenant restrictions included in the database query or a reusable access service.

## Roles

- `super_admin`
- `admin`
- `hbt_admin`
- `hbt_member`
- `company_admin`
- `company`
- `employee`

See `PERMISSIONS.md` for the current permission matrix.

## Tenant isolation

Tenant-scoped operations must derive `team_id` and `partnership_id` from the authenticated database user loaded by `authMiddleware`. Values sent by the browser are untrusted and may only identify a requested object; the backend must independently prove access.

For inaccessible tenant objects, return `404` where practical to avoid object enumeration.

Centralized access services currently include `journeyAccessService`, `quizJourneyAccessService`, quiz submission access middleware, readiness submission access checks, and employer approval partnership access checks.

## Authentication and account activation

- JWTs are signed only by the backend.
- Inactive users are rejected by authentication middleware.
- New HBT accounts are created inactive where the activation workflow applies.
- Passwords are created through single-use activation invitations for invitation-based roles.
- Activation tokens are generated from cryptographic randomness and only token hashes are stored.
- Activation tokens expire, can be revoked, and become unusable after acceptance.
- Existing accounts are never silently converted to another role or moved to another tenant.

Current limitation: access JWTs remain in browser localStorage. A future session-hardening change must evaluate HttpOnly SameSite cookies or a short-lived access/rotating refresh-token design.

## Invitations

- New invitation links and codes use cryptographic random generation.
- Only hashes are stored in `employee_invites`.
- Raw link/code values are returned only at creation or resend time.
- List endpoints never return tokens, codes, or hashes.
- Resend invalidates previous credentials.
- Revoke clears usable credential hashes.
- Acceptance is transactional and audited.

## Stripe

Production HBT enrollment is Stripe-only. There is no public demo payment-completion endpoint and no synthetic checkout fallback.

Production webhook handling requires:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- A valid `stripe-signature`

For `checkout.session.completed`, the backend verifies Stripe signature, event uniqueness, event type, paid status, registration metadata, stored checkout-session ID, stored Stripe payment/session ID, exact amount, exact currency, and customer email.

Payment update and HBT provisioning occur in one database transaction. Replayed event IDs are acknowledged without repeating side effects. When Stripe is not configured, HBT enrollment fails closed with a service-unavailable response instead of creating a synthetic payment.

Historical records from an earlier demo-payment implementation may remain in the database for audit/history, but production payment summaries, lists, receipts, and status mutations exclude those records.

## Public enrollment status

Public payment/enrollment status URLs use opaque tokens. The database stores only token hashes. Responses expose only registration state, payment state, whether portal preparation is complete, and creation timestamp. They do not expose name, email, user ID, team ID, registration ID, Stripe session ID, or credentials.

## Uploads

The image upload route requires Admin/Super Admin/HBT Admin, accepts one file up to the configured limit, identifies approved image types by magic bytes, selects extension server-side, uses randomized filenames, rejects traversal, hashes content, and records an audit event.

Remaining controls before full production readiness include image decode/re-encode, malware scanning, managed object storage, per-user/team quota, retention/cleanup, and replacement of unrestricted static-directory serving with managed asset delivery.

## Audit logging

`audit_logs` is append-only at the application layer. Events contain actor ID/role, action, entity type/ID, tenant scope, request correlation ID, protected request metadata, result, sanitized metadata, and timestamp.

Never log passwords, password hashes, JWTs, raw tokens, API keys, secrets, file contents, or sensitive financial data.

## Required production environment variables

- `NODE_ENV=production`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGINS`
- `FRONTEND_URL`
- `PUBLIC_BACKEND_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `HBT_PROGRAM_PRICE_CENTS`
- `HBT_PROGRAM_CURRENCY`
- `AUDIT_IP_HASH_SECRET`

Production safety settings:

- `ENABLE_DIAGNOSTIC_ROUTES=false`
- `ALLOW_LOCAL_ORIGINS=false`
- `ALLOW_CODESPACES_ORIGINS=false`

There is intentionally no environment switch that re-enables demo payment completion.

Never place server secrets in frontend `VITE_` variables.

## Vulnerability handling

1. Do not post secrets, private records, or exploit details into public issues.
2. Disable affected functionality when active exploitation is possible.
3. Rotate exposed credentials immediately.
4. Preserve relevant audit and platform logs.
5. Patch on a branch with regression tests.
6. Verify tenant-negative and authorization-negative cases.
7. Deploy only after security review and rollback preparation.
