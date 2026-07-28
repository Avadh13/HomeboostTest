const test = require("node:test");
const assert = require("node:assert/strict");

const { requireAdmin } = require("../src/middleware/roleMiddleware");
const requireStripeWebhookSignature = require("../src/middleware/stripeWebhookGuard");
const { provisionHbtFromRegistration } = require("../src/services/hbtProvisionService");

const responseRecorder = () => {
  const state = { statusCode: 200, payload: null };
  return {
    state,
    status(code) {
      state.statusCode = code;
      return this;
    },
    json(payload) {
      state.payload = payload;
      return this;
    },
  };
};

test("requireAdmin rejects unauthenticated and non-admin users", () => {
  const unauthenticatedResponse = responseRecorder();
  requireAdmin({}, unauthenticatedResponse, () => assert.fail("next should not run"));
  assert.equal(unauthenticatedResponse.state.statusCode, 401);

  const employeeResponse = responseRecorder();
  requireAdmin({ user: { role: "employee" } }, employeeResponse, () => assert.fail("next should not run"));
  assert.equal(employeeResponse.state.statusCode, 403);
});

test("requireAdmin permits admin and super_admin", () => {
  for (const role of ["admin", "super_admin"]) {
    let called = false;
    requireAdmin({ user: { role } }, responseRecorder(), () => { called = true; });
    assert.equal(called, true);
  }
});

test("Stripe webhook guard rejects missing configuration and signature", () => {
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_WEBHOOK_SECRET;

  const missingConfigResponse = responseRecorder();
  requireStripeWebhookSignature({ headers: {} }, missingConfigResponse, () => assert.fail("next should not run"));
  assert.equal(missingConfigResponse.state.statusCode, 503);

  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  const missingSignatureResponse = responseRecorder();
  requireStripeWebhookSignature({ headers: {} }, missingSignatureResponse, () => assert.fail("next should not run"));
  assert.equal(missingSignatureResponse.state.statusCode, 400);

  if (originalSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
});

test("Stripe webhook guard permits a signed request when configured", () => {
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  let called = false;

  requireStripeWebhookSignature(
    { headers: { "stripe-signature": "test_signature" } },
    responseRecorder(),
    () => { called = true; },
  );

  assert.equal(called, true);
  if (originalSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
});

test("HBT provisioning never overwrites an existing incompatible user role", async () => {
  const connection = {
    query: async (sql) => {
      if (sql.includes("FROM hbt_registrations")) {
        return [[{
          id: 17,
          email: "employee@example.com",
          company_name: "Example HBT",
          full_name: "Existing Employee",
          payment_status: "paid",
        }]];
      }
      if (sql.includes("FROM users WHERE email")) {
        return [[{ id: 99, role: "employee", team_id: 12, is_active: 1 }]];
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };

  await assert.rejects(
    () => provisionHbtFromRegistration(17, connection),
    (error) => error.code === "HBT_ACCOUNT_CONFLICT" && error.statusCode === 409,
  );
});
