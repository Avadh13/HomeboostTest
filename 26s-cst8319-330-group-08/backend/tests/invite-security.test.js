const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createInviteCredentials,
  findInviteByCredential,
  inviteStateError,
  publicInvitePayload,
  deliveryPayload,
} = require("../src/services/inviteSecurityService");
const { hashOpaqueToken } = require("../src/services/paymentSecurityService");

test("invite credentials are random and stored as hashes", () => {
  const first = createInviteCredentials();
  const second = createInviteCredentials();

  assert.equal(first.tokenHash, hashOpaqueToken(first.token));
  assert.equal(first.codeHash, hashOpaqueToken(first.code));
  assert.equal(first.tokenHash.length, 64);
  assert.equal(first.codeHash.length, 64);
  assert.notEqual(first.token, second.token);
  assert.match(first.code, /^\d{6}$/);
});

test("invite credential lookup hashes the supplied link or code", async () => {
  const calls = [];
  const connection = {
    query: async (sql, params) => {
      calls.push([sql, params]);
      return [[{
        id: 7,
        status: "invited",
        partnership_status: "active",
      }]];
    },
  };

  const credential = "A".repeat(43);
  const invite = await findInviteByCredential(connection, credential);
  assert.equal(invite.id, 7);
  assert.deepEqual(calls[0][1], [hashOpaqueToken(credential), hashOpaqueToken(credential)]);
  assert.match(calls[0][0], /invite_token_hash/);
  assert.match(calls[0][0], /partnership_status/);
});

test("invite lifecycle rejects revoked, used, unavailable, and expired invitations", () => {
  assert.equal(inviteStateError(null).status, 404);
  assert.equal(inviteStateError({ status: "revoked" }).status, 410);
  assert.equal(inviteStateError({ status: "registered" }).status, 409);
  assert.equal(inviteStateError({ status: "unknown" }).status, 409);
  assert.equal(inviteStateError({ status: "invited", expires_at: "2000-01-01T00:00:00Z" }).status, 410);
  assert.equal(inviteStateError({ status: "invited", expires_at: "2999-01-01T00:00:00Z" }), null);
});

test("stored invite payload excludes token hashes and one-time credentials", () => {
  const payload = publicInvitePayload({
    id: 7,
    full_name: "Employee",
    email: "employee@example.com",
    status: "invited",
    invite_role: "employee",
    partnership_id: 3,
    employer_name: "Employer",
    partnership_slug: "employer",
    expires_at: "2999-01-01T00:00:00Z",
    created_at: "2026-07-28T00:00:00Z",
    invite_token_hash: "secret",
    invite_code_hash: "secret",
  });

  assert.equal(Object.hasOwn(payload, "invite_token_hash"), false);
  assert.equal(Object.hasOwn(payload, "invite_code_hash"), false);
  assert.equal(Object.hasOwn(payload, "invite_link"), false);
  assert.equal(Object.hasOwn(payload, "invite_code"), false);
});

test("one-time delivery payload contains only freshly generated credentials", () => {
  const credentials = createInviteCredentials();
  const payload = deliveryPayload({
    id: 7,
    full_name: "Employee",
    email: "employee@example.com",
    status: "invited",
    invite_role: "employee",
    partnership_id: 3,
  }, credentials);

  assert.equal(payload.invite_code, credentials.code);
  assert.ok(payload.invite_link.endsWith(encodeURIComponent(credentials.token)));
  assert.equal(Object.hasOwn(payload, "tokenHash"), false);
});
