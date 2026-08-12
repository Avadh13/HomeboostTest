const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = (...parts) => fs.readFileSync(path.join(__dirname, ...parts), "utf8");

const backendSignup = () => read("..", "src", "routes", "hbtSignupRoutes.js");
const backendPayments = () => read("..", "src", "routes", "paymentRoutes.js");
const backendServer = () => read("..", "src", "server.js");
const envExample = () => read("..", ".env.example");
const frontend = (file) => read("..", "..", "frontend", "src", "pages", file);

const forbiddenProductionMedia = [
  "interactive-examples.mdn.mozilla.net",
  "images.unsplash.com",
];

test("HBT enrollment is Stripe-only and has no demo fallback", () => {
  const source = backendSignup();
  assert.match(source, /getCheckoutClient\(\)/);
  assert.match(source, /Online checkout is temporarily unavailable/);
  assert.match(source, /provider, provider_session_id/);
  assert.match(source, /'stripe'/);
  assert.doesNotMatch(source, /ALLOW_DEMO_PAYMENT_COMPLETION/);
  assert.doesNotMatch(source, /demo_pending/);
  assert.doesNotMatch(source, /provider[^\n]*['"]demo['"]/);
});

test("production payment router exposes no public demo completion path", () => {
  const payments = backendPayments();
  const server = backendServer();
  assert.doesNotMatch(payments, /router\.post\(["']\/demo-complete/);
  assert.doesNotMatch(server, /\/api\/payments\/demo-complete/);
  assert.doesNotMatch(envExample(), /ALLOW_DEMO_PAYMENT_COMPLETION/);
});

test("payment success page cannot manually complete a fake payment", () => {
  const source = frontend("PaymentSuccess.tsx");
  assert.doesNotMatch(source, /demo-complete/);
  assert.doesNotMatch(source, /Complete Demo Payment/i);
  assert.doesNotMatch(source, /searchParams\.get\(["']demo["']\)/);
});

test("public Home and Login contain no stock/demo media or employee self-registration CTA", () => {
  for (const file of ["Home.tsx", "Login.tsx", "PartnershipLanding.tsx"]) {
    const source = frontend(file);
    for (const marker of forbiddenProductionMedia) assert.doesNotMatch(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(frontend("PartnershipLanding.tsx"), /\/signup\?partnership=/);
  assert.doesNotMatch(frontend("Login.tsx"), /to=["']\/signup["']/);
});

test("resource and authenticated portal pages use actual images only", () => {
  for (const file of ["Resources.tsx", "ResourceDetails.tsx", "EmployeePortal.tsx", "HBTDashboard.tsx", "HBTTeamMembers.tsx"]) {
    const source = frontend(file);
    assert.doesNotMatch(source, /images\.unsplash\.com/);
  }
});

test("obsolete demo video SQL seed is removed", () => {
  const seedPath = path.join(__dirname, "..", "..", "sql", "home_video_walkthrough_seed_2026_06_28.sql");
  assert.equal(fs.existsSync(seedPath), false);
});
