const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createActivationInvitation,
  validateActivationPassword,
  activationPublicPayload,
} = require("../src/services/accountActivationService");
const { sanitizeValue } = require("../src/services/auditLogService");

const findInsertParams = (calls) => {
  const call = calls.find(([sql]) => sql.includes("INSERT INTO account_activation_invitations"));
  return call?.[1] || null;
};

test("activation invitation stores only a token hash", async () => {
  const calls = [];
  const connection = {
    query: async (sql, params = []) => {
      calls.push([sql, params]);
      return [{ affectedRows: 1 }];
    },
  };

  const result = await createActivationInvitation(connection, {
    userId: 25,
    email: "Owner@Example.com",
    targetRole: "hbt_admin",
    teamId: 7,
  });

  const insertParams = findInsertParams(calls);
  assert.ok(insertParams);
  const storedHash = insertParams[5];
  assert.equal(storedHash.length, 64);
  assert.notEqual(storedHash, result.token);
  assert.ok(result.activation_url.includes(encodeURIComponent(result.token)));
});

test("activation password policy rejects weak passwords", () => {
  assert.match(validateActivationPassword("short") || "", /8 characters/);
  assert.match(validateActivationPassword("lowercase1") || "", /uppercase/);
  assert.match(validateActivationPassword("UPPERCASE1") || "", /lowercase/);
  assert.match(validateActivationPassword("NoNumberHere") || "", /number/);
  assert.equal(validateActivationPassword("StrongPass123"), null);
});

test("activation validation payload masks email and excludes token data", () => {
  const payload = activationPublicPayload({
    email: "private.user@example.com",
    target_role: "hbt_admin",
    team_name: "Example Team",
    expires_at: "2026-08-10T12:00:00Z",
    token_hash: "secret_hash",
  });

  assert.equal(payload.email, "pr**********@example.com");
  assert.equal(payload.role, "hbt_admin");
  assert.equal(payload.organization, "Example Team");
  assert.equal(Object.hasOwn(payload, "token_hash"), false);
});

test("audit metadata redacts credentials and limits nested content", () => {
  const sanitized = sanitizeValue({
    action: "test",
    password: "NeverStoreMe",
    token: "NeverStoreThisEither",
    nested: {
      api_key: "sk-secret",
      safe_value: "allowed",
    },
  });

  assert.equal(sanitized.password, "[redacted]");
  assert.equal(sanitized.token, "[redacted]");
  assert.equal(sanitized.nested.api_key, "[redacted]");
  assert.equal(sanitized.nested.safe_value, "allowed");
});
