# Database Migrations

## Purpose

Database schema changes must be applied through ordered migration modules. Normal HTTP request handling must not create or alter tables.

## Commands

From `26s-cst8319-330-group-08/backend`:

```bash
npm run migrate
```

Production startup runs migrations before starting Express:

```bash
npm start
```

Local development also runs migrations before Nodemon:

```bash
npm run dev
```

## Migration tracking

The runner creates `schema_migrations` and records:

- Migration version
- Filename
- Application timestamp

A version is executed once. Migration files must be immutable after they have been applied to a shared environment. Corrections require a new migration version.

## Current ordered migrations

1. `20260728_phase0_security.js`
   - HBT registrations and payments prerequisites
   - Opaque public registration-status tokens
   - Stripe webhook replay ledger
   - Account activation invitations
   - Immutable audit logs

2. `20260728_invitation_security.js`
   - Employee invitation token/code hash columns
   - Backfill SHA-256 hashes for legacy invite credentials
   - Clear legacy plaintext credentials
   - Unique hash indexes
   - Invite lifecycle logs

3. `20260728_employer_approval.js`
   - Employer approval requests
   - Company points of contact

## Adding a migration

1. Add a CommonJS module under `backend/src/migrations`.
2. Prefix the filename with a sortable UTC date/time or sequence.
3. Export:

```js
module.exports = {
  version: "unique_version",
  up: async (connection) => {
    // Idempotent schema/data operations.
  },
};
```

4. Use `CREATE TABLE IF NOT EXISTS` and query `INFORMATION_SCHEMA` before adding columns or indexes to existing tables.
5. Do not read secrets or make external network calls from a migration.
6. Test against:
   - A fresh disposable database
   - A copy of the current production schema
7. Back up production before applying destructive or data-transforming migrations.

## Rollback policy

The current runner is forward-only. Do not automatically drop security tables or transformed data.

For a failed deployment:

1. Stop application writes.
2. Preserve logs and the failed schema state.
3. Restore the pre-migration backup when data correctness is uncertain.
4. Otherwise deploy a new forward corrective migration.
5. Never edit an already-recorded migration version.

## Current limitation

Several legacy services still contain runtime `CREATE TABLE` or `ALTER TABLE` operations. These must be moved into new ordered migrations before production readiness is declared.
