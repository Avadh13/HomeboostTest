# Production Deployment Runbook

## Release decision

A successful build is necessary but not sufficient. Production release requires security, migration, data, recovery, and client acceptance gates.

## Deployment architecture

- Frontend: Vercel
- Backend: Railway
- Database: MySQL
- Payment provider: Stripe
- Backend startup: `npm run migrate && node src/server.js`

## Required pre-release checks

1. Pull request is reviewed and approved.
2. All Critical audit findings are implemented and tested.
3. HomeBoost CI passes.
4. QA Reimplementation Checks pass.
5. Frontend typecheck, lint, tests, and production build pass.
6. Backend unit/integration tests and syntax checks pass.
7. Migrations pass against a fresh disposable database and a production-like schema copy.
8. Pre-migration backup is complete and verified.
9. Stripe test-mode signed webhook suite passes.
10. Tenant-isolation negative tests pass.
11. Production environment variables are present without exposing values.
12. No demo payment endpoint or fallback provider exists in the deployed code.
13. Diagnostic routes are disabled.
14. Client-approved content, branding, legal pages, and domain routing are ready.
15. Rollback owner and communication channel are identified.

## Railway backend variables

Required:

```text
NODE_ENV=production
PORT=<provided by Railway>
DB_HOST=<secret>
DB_PORT=<secret>
DB_USER=<secret>
DB_PASSWORD=<secret>
DB_NAME=<secret>
DB_CONNECTION_LIMIT=<approved value>
JWT_SECRET=<long random secret>
JWT_EXPIRES_IN=1d
FRONTEND_URL=<approved production frontend origin>
CLIENT_URL=<approved production frontend origin>
PUBLIC_BACKEND_URL=<approved Railway public backend URL>
CORS_ORIGINS=<comma-separated approved origins>
STRIPE_SECRET_KEY=<secret>
STRIPE_WEBHOOK_SECRET=<secret>
HBT_PROGRAM_PRICE_CENTS=<approved amount>
HBT_PROGRAM_CURRENCY=cad
AUDIT_IP_HASH_SECRET=<separate secret>
ENABLE_DIAGNOSTIC_ROUTES=false
ALLOW_LOCAL_ORIGINS=false
ALLOW_VERCEL_PREVIEWS=false unless deliberately enabled for a controlled preview
ALLOW_CODESPACES_ORIGINS=false
```

Future requirements:

- Email provider secrets
- Object/private storage secrets
- Redis/shared rate-limit connection

## Stripe webhook configuration

1. Create a production webhook endpoint:

```text
POST <backend>/api/payments/stripe-webhook
```

2. Subscribe only to required event types, currently `checkout.session.completed`.
3. Store the signing secret in Railway.
4. Send a signed test event.
5. Confirm invalid or missing signatures fail, payment metadata is validated, the first valid event provisions once, and replayed events do not duplicate provisioning.
6. Reconcile the resulting registration/payment/user/team records.

HBT enrollment must fail closed with a service-unavailable response when Stripe is not configured. The application must never create a synthetic checkout session or provide a manual public payment-completion endpoint.

## Deployment sequence

1. Freeze unrelated production writes/deployments.
2. Record current production commit and deployment IDs.
3. Complete pre-migration backup.
4. Deploy backend branch to a non-production environment.
5. Run migrations and smoke tests.
6. Deploy frontend preview against that backend.
7. Complete role and tenant acceptance checks.
8. Merge only after explicit approval.
9. Railway deploys backend and runs migrations before Express starts.
10. Verify `/api/health`.
11. Verify Vercel production deployment.
12. Run non-destructive production smoke tests.
13. Monitor logs, Stripe events, database errors, authorization failures, and latency.

## Non-destructive production smoke tests

- Public Home/Pricing/Contact render without placeholder/demo media.
- Invalid login fails without account disclosure.
- Admin login and dashboard load.
- HBT Admin login and own-team data load.
- HBT Member cannot open HBT Admin configuration routes.
- Company Manager sees only own partnership.
- Employee sees only own portal.
- Cross-tenant known-ID requests return 404/403.
- Contact submission works; public contact list/delete fails.
- CMS public GET works; anonymous mutation fails.
- Anonymous upload fails.
- Public numeric payment status URL fails.
- Opaque status token shows no PII.
- HBT signup uses Stripe checkout only.
- Invalid/replayed Stripe events do not provision.
- Activation link is single-use.
- Invite link is single-use and previous resend link is invalid.

## Rollback

Rollback must consider both code and schema.

1. Stop or reduce writes.
2. Determine whether the migration is backward-compatible.
3. Roll back application commit only when the previous code supports the current schema.
4. Otherwise restore the pre-migration database backup into a recovery database and validate it.
5. Restore file/object versions when relevant.
6. Repoint traffic after approval.
7. Rotate credentials if exposure is involved.
8. Document incident timeline and corrective migration.

## Current release blockers

Do not call the application production-ready until Railway/Vercel deployment, signed Stripe integration, email delivery, persistent storage, backup restoration, role-based E2E flows, and accessibility checks have all been demonstrated.
