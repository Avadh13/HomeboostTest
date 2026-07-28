const test = require("node:test");
const assert = require("node:assert/strict");

const migration = require("../src/migrations/20260728_phase0_security");

test("Phase 0 migration creates prerequisite and security tables in order", async () => {
  const statements = [];
  const connection = {
    query: async (sql) => {
      statements.push(String(sql));
      return [[], []];
    },
  };

  await migration.up(connection);

  const joined = statements.join("\n");
  const registrationsIndex = joined.indexOf("CREATE TABLE IF NOT EXISTS hbt_registrations");
  const paymentsIndex = joined.indexOf("CREATE TABLE IF NOT EXISTS payments");
  const statusTokensIndex = joined.indexOf("CREATE TABLE IF NOT EXISTS hbt_registration_status_tokens");
  const eventsIndex = joined.indexOf("CREATE TABLE IF NOT EXISTS stripe_webhook_events");
  const activationsIndex = joined.indexOf("CREATE TABLE IF NOT EXISTS account_activation_invitations");
  const auditIndex = joined.indexOf("CREATE TABLE IF NOT EXISTS audit_logs");

  assert.ok(registrationsIndex >= 0);
  assert.ok(paymentsIndex > registrationsIndex);
  assert.ok(statusTokensIndex > paymentsIndex);
  assert.ok(eventsIndex > statusTokensIndex);
  assert.ok(activationsIndex > eventsIndex);
  assert.ok(auditIndex > activationsIndex);
  assert.match(joined, /UNIQUE KEY uq_stripe_webhook_event_id/);
  assert.match(joined, /UNIQUE KEY uq_activation_token_hash/);
  assert.match(joined, /FOREIGN KEY \(registration_id\) REFERENCES hbt_registrations\(id\)/);
});
