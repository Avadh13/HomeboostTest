const test = require("node:test");
const assert = require("node:assert/strict");

const { requireAdmin } = require("../src/middleware/roleMiddleware");
const requireStripeWebhookSignature = require("../src/middleware/stripeWebhookGuard");
const { provisionHbtFromRegistration } = require("../src/services/hbtProvisionService");
const {
  getAssignmentScope,
  getActiveAssignedStep,
} = require("../src/services/journeyAccessService");
const {
  validateRuleReferences,
  getSubmissionForApply,
} = require("../src/services/quizJourneyAccessService");
const {
  hashOpaqueToken,
  toPublicRegistrationStatus,
  validateCheckoutSession,
  claimStripeEvent,
} = require("../src/services/paymentSecurityService");

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

const validCheckoutContext = () => ({
  session: {
    id: "cs_test_123",
    payment_status: "paid",
    amount_total: 99000,
    currency: "cad",
    customer_details: { email: "owner@example.com" },
    metadata: { registration_id: "17" },
  },
  registration: {
    id: 17,
    email: "owner@example.com",
    checkout_session_id: "cs_test_123",
  },
  payment: {
    id: 4,
    provider: "stripe",
    provider_session_id: "cs_test_123",
    amount_cents: 99000,
    currency: "cad",
  },
});

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

test("Stripe checkout validation accepts an exact stored payment match", () => {
  assert.equal(validateCheckoutSession(validCheckoutContext()), true);
});

test("Stripe checkout validation rejects unpaid, mismatched, or forged sessions", () => {
  const cases = [
    ["CHECKOUT_NOT_PAID", (context) => { context.session.payment_status = "unpaid"; }],
    ["CHECKOUT_AMOUNT_MISMATCH", (context) => { context.session.amount_total = 1; }],
    ["CHECKOUT_CURRENCY_MISMATCH", (context) => { context.session.currency = "usd"; }],
    ["CHECKOUT_SESSION_MISMATCH", (context) => { context.session.id = "cs_forged"; }],
    ["CHECKOUT_REGISTRATION_MISMATCH", (context) => { context.session.metadata.registration_id = "999"; }],
    ["CHECKOUT_EMAIL_MISMATCH", (context) => { context.session.customer_details.email = "attacker@example.com"; }],
  ];

  for (const [expectedCode, mutate] of cases) {
    const context = validCheckoutContext();
    mutate(context);
    assert.throws(
      () => validateCheckoutSession(context),
      (error) => error.code === expectedCode,
    );
  }
});

test("Stripe event claim blocks replayed event IDs", async () => {
  const acceptedConnection = {
    query: async () => [{ affectedRows: 1 }],
  };
  const replayConnection = {
    query: async () => [{ affectedRows: 0 }],
  };
  const event = {
    id: "evt_123",
    type: "checkout.session.completed",
    data: { object: { id: "cs_123", metadata: { registration_id: "17" } } },
  };

  assert.equal(await claimStripeEvent(acceptedConnection, event), true);
  assert.equal(await claimStripeEvent(replayConnection, event), false);
});

test("Public registration status excludes PII and internal identifiers", () => {
  const publicStatus = toPublicRegistrationStatus({
    id: 17,
    full_name: "Private Name",
    email: "private@example.com",
    checkout_session_id: "cs_secret",
    team_id: 4,
    user_id: 9,
    status: "portal_created",
    payment_status: "paid",
    created_at: "2026-07-28T00:00:00Z",
  });

  assert.deepEqual(Object.keys(publicStatus).sort(), [
    "created_at",
    "payment_status",
    "portal_ready",
    "status",
  ]);
  assert.equal(publicStatus.portal_ready, true);
});

test("Opaque status tokens are hashed deterministically without storing raw tokens", () => {
  const token = "A".repeat(43);
  const hash = hashOpaqueToken(token);
  assert.equal(hash.length, 64);
  assert.equal(hash, hashOpaqueToken(token));
  assert.notEqual(hash, token);
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

test("HBT Admin cannot assign a journey to an employee from another team", async () => {
  const connection = {
    query: async () => [[{
      employee_id: 50,
      partnership_id: 10,
      employee_team_id: 8,
      journey_id: 12,
      journey_team_id: 8,
      journey_is_active: 1,
    }]],
  };

  const scope = await getAssignmentScope(
    { id: 2, role: "hbt_admin", team_id: 7 },
    50,
    12,
    connection,
  );
  assert.equal(scope, null);
});

test("HBT Admin can assign a team or global journey to an employee in their team", async () => {
  for (const journeyTeamId of [7, null]) {
    const connection = {
      query: async () => [[{
        employee_id: 50,
        partnership_id: 10,
        employee_team_id: 7,
        journey_id: 12,
        journey_team_id: journeyTeamId,
        journey_is_active: 1,
      }]],
    };

    const scope = await getAssignmentScope(
      { id: 2, role: "hbt_admin", team_id: 7 },
      50,
      12,
      connection,
    );
    assert.equal(scope.employee_id, 50);
    assert.equal(scope.journey_id, 12);
  }
});

test("Employee step completion requires an active assignment containing that step", async () => {
  const deniedConnection = { query: async () => [[]] };
  assert.equal(await getActiveAssignedStep(25, 900, deniedConnection), null);

  const allowedConnection = {
    query: async () => [[{ id: 900, journey_id: 33 }]],
  };
  const step = await getActiveAssignedStep(25, 900, allowedConnection);
  assert.deepEqual(step, { id: 900, journey_id: 33 });
});

test("HBT Admin cannot create a quiz journey rule using another team's journey", async () => {
  const connection = {
    query: async (sql) => {
      if (sql.includes("FROM journeys")) {
        return [[{ id: 44, team_id: 9, is_active: 1 }]];
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };

  const references = await validateRuleReferences(
    { role: "hbt_admin", team_id: 7 },
    { journey_id: 44 },
    connection,
  );
  assert.equal(references, null);
});

test("HBT Admin can create a rule using an authorized team quiz and journey", async () => {
  const connection = {
    query: async (sql) => {
      if (sql.includes("FROM journeys")) {
        return [[{ id: 44, team_id: 7, is_active: 1 }]];
      }
      if (sql.includes("FROM quizzes")) {
        return [[{ id: 19, team_id: 7, is_global: 0, is_active: 1 }]];
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };

  const references = await validateRuleReferences(
    { role: "hbt_admin", team_id: 7 },
    { journey_id: 44, quiz_id: 19 },
    connection,
  );
  assert.equal(references.teamId, 7);
  assert.equal(references.journeyId, 44);
  assert.equal(references.quizId, 19);
});

test("Manual quiz journey apply is blocked across HBT teams", async () => {
  const connection = {
    query: async () => [[{
      id: 82,
      quiz_id: 4,
      user_id: 90,
      partnership_id: 3,
      team_id: 8,
    }]],
  };

  const submission = await getSubmissionForApply(
    { role: "hbt_admin", team_id: 7 },
    82,
    connection,
  );
  assert.equal(submission, null);
});
