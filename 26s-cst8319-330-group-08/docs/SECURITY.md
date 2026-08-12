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

Centralized access services currently include:

- `journeyAccessService`
- `quizJourneyAccessService`
- Quiz submission access middleware
- Readiness submission access checks
- Employer approval partnership access checks

## Authentication and account activation

- JWTs are signed only by the backend.
- Inactive users are rejected by authentication middleware.
- New HBT accounts are created inactive.
- Passwords are created through single-use activation invitations.
- Activation tokens are generated from 256 bits of cryptographic randomness.
- Only SHA-256 token hashes are stored.
- Activation tokens expire, can be revoked, and become unusable after acceptance.
- Passwords require at least eight characters, uppercase, lowercase, and a number.
- Existing accounts are never silently converted to another role or moved to another tenant.

Current limitation: access JWTs remain in browser localStorage. A future session-hardening change must evaluate HttpOnly SameSite cookies or a short-lived access/rotating refresh-token design.

## Invitations

- New invitation links and six-digit codes are generated with `crypto`.
- Only hashes are stored in `employee_invites`.
- Plaintext legacy invitation credentials are backfilled to hashes and cleared by migration.
- Raw link/code values are returned only at creation or resend time.
- List endpoints never return tokens, codes, or hashes.
- Resend revokes previous credentials.
- Revoke clears usable credential hashes.
- Acceptance is transactional and audited.

## Stripe

Production webhook handling requires:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- A valid `stripe-signature`

For `checkout.session.completed`, the backend verifies:

- Stripe signature
- Event ID uniqueness
- Event type
- `payment_status === paid`
- Registration metadata
- Stored registration checkout-session ID
- Stored payment provider/session ID
- Exact amount
- Exact currency
- Customer email

Payment update and HBT provisioning occur in one database transaction. Replayed event IDs are acknowledged without repeating side effects.

## Public enrollment status

Public payment/enrollment status URLs use opaque tokens. The database stores only token hashes. Responses expose only:

- Registration state
- Payment state
- Whether portal preparation is complete
- Creation timestamp

They do not expose name, email, user ID, team ID, registration ID, Stripe session ID, or credentials.

## Uploads

The image upload route:

- Requires Admin/Super Admin/HBT Admin
- Accepts one file up to 5 MiB
- Buffers before writing
- Identifies JPEG/PNG/WebP by magic bytes
- Selects extension server-side
- Uses UUID filenames
- Rejects path traversal
- Writes with exclusive-create permissions
- Calculates SHA-256
- Records an audit event

Remaining controls before production:

- Decode/re-encode images
- Malware scanning
- Object storage
- Per-user/team quota
- Retention/cleanup
- Replace unrestricted static-directory serving with managed asset delivery

## Audit logging

`audit_logs` is append-only at the application layer. Events contain:

- Actor ID and role
- Action
- Entity type and ID
- Team/partnership scope
- Request correlation ID
- HMAC-protected IP metadata
- Success/failure result
- Sanitized metadata
- Timestamp

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

Production safety flags:

- `ALLOW_DEMO_PAYMENT_COMPLETION=false`
- `ENABLE_DIAGNOSTIC_ROUTES=false`
- `ALLOW_LOCAL_ORIGINS=false`
- `ALLOW_CODESPACES_ORIGINS=false`

Never place server secrets in frontend `VITE_` variables.

## Vulnerability handling

1. Do not post secrets, private records, or exploit details into public issues.
2. Disable affected functionality when active exploitation is possible.
3. Rotate exposed credentials immediately.
4. Preserve relevant audit and platform logs.
5. Patch on a branch with regression tests.
6. Verify tenant-negative and authorization-negative cases.
7. Deploy only after security review and rollback preparation.
