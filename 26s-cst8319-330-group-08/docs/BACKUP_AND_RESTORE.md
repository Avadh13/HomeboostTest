# Backup and Restore Runbook

## Scope

This runbook covers:

- MySQL application data
- Private documents
- Public/managed uploaded assets
- Deployment environment configuration
- Migration state

A backup is not considered valid until a restore test succeeds.

## Recovery objectives

Production owners must approve concrete values before launch:

- Recovery Point Objective (RPO): maximum acceptable data loss
- Recovery Time Objective (RTO): maximum acceptable service outage

Recommended initial targets for a small production rollout:

- Database RPO: 24 hours or better
- Database RTO: 4 hours or better
- Uploaded/private files RPO: 24 hours or better
- Configuration recovery: 1 hour or better

These are recommendations, not commitments, until the client and hosting owner approve them.

## Database backups

Minimum controls:

1. Enable provider-managed automated MySQL backups where supported.
2. Create an encrypted logical backup before every production migration.
3. Retain several independent restore points.
4. Store a copy outside the live database service/project.
5. Restrict backup access using least privilege.
6. Never commit backup files or database credentials to GitHub.

Example logical backup from an authorized administrative workstation:

```bash
mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --set-gtid-purged=OFF \
  -h "$DB_HOST" \
  -P "$DB_PORT" \
  -u "$DB_USER" \
  -p \
  "$DB_NAME" > "homeboost-$(date +%Y%m%d-%H%M%S).sql"
```

Encrypt the output before transferring it to backup storage.

## File backups

Local ephemeral application disks are not a production backup.

Before launch, private documents and managed assets must use persistent object/private storage with:

- Versioning or immutable snapshots
- Server-side encryption
- Lifecycle/retention rules
- Access logs
- Separate production credentials
- Periodic export or replication to a second recovery location

## Environment configuration

Maintain a protected inventory of required variable names, owners, and rotation dates. Do not store secret values in the repository.

Required recovery configuration includes:

- Database connection
- JWT secret
- Stripe credentials/webhook secret
- CORS/frontend/backend URLs
- Audit IP hashing secret
- Email provider credentials when added
- Object storage credentials when added

Use the hosting provider's secret-management/export process and maintain an offline recovery procedure controlled by the account owner.

## Pre-migration backup procedure

1. Announce maintenance or confirm the migration is backward-compatible.
2. Verify current deployment health.
3. Record current application commit and `schema_migrations` rows.
4. Create database backup.
5. Verify backup size and checksum.
6. Confirm file/object-storage backup state.
7. Apply migration to staging/production-like copy.
8. Run migration validation and smoke tests.
9. Apply to production.
10. Monitor errors, payments, authentication, and tenant-scoped endpoints.

## Restore procedure

1. Declare the incident and stop writes when continued activity risks corruption.
2. Record current commit, database state, and recent audit/deployment logs.
3. Create a final forensic snapshot when safe.
4. Provision a clean recovery database; do not overwrite the only production copy first.
5. Restore the selected backup.
6. Verify tables, row counts, foreign keys, and `schema_migrations`.
7. Run application migrations only when they are required for the selected application commit.
8. Point a staging/recovery deployment at the restored database.
9. Run:
   - Authentication smoke test
   - Role/tenant isolation tests
   - Employee portal read test
   - Admin read test
   - Invitation/activation validation without consuming real tokens
   - Payment record reconciliation without issuing charges
   - Document/object availability test
10. Obtain incident-owner approval.
11. Switch production traffic.
12. Continue heightened monitoring.
13. Document data loss window and remediation.

## Restore test schedule

- Before first production launch
- After changing database provider or backup configuration
- After major schema changes
- At least quarterly after launch

Record:

- Backup identifier/date
- Restored environment
- Start/end time
- Data verification results
- Application smoke-test results
- Actual RPO/RTO
- Failures and corrective actions

## Current blockers

Production recovery is not proven until:

- A disposable database restore succeeds
- File/object storage is persistent and backed up
- Critical environment variables can be restored securely
- A responsible owner approves RPO/RTO
