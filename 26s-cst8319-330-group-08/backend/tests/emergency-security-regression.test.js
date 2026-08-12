const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("generic employee registration is invitation-only", () => {
  const controller = read("src/controllers/authController.js");
  const registerBlock = controller.slice(
    controller.indexOf("exports.register"),
    controller.indexOf("exports.login"),
  );

  assert.match(registerBlock, /INVITATION_REQUIRED/);
  assert.doesNotMatch(registerBlock, /INSERT\s+INTO\s+users/i);
  assert.doesNotMatch(registerBlock, /employee_invites/i);
});

test("all employee invite producers use the shared secure lifecycle", () => {
  const companyManager = read("src/routes/companyManagerRoutes.js");
  const enrollment = read("src/controllers/enrollmentController.js");
  const inviteRoutes = read("src/routes/inviteRoutes.js");

  for (const source of [companyManager, enrollment, inviteRoutes]) {
    assert.match(source, /createOrRefreshEmployeeInvite/);
    assert.doesNotMatch(source, /Math\.random\s*\(/);
  }

  assert.doesNotMatch(companyManager, /ensureInviteLinkColumns/);
  assert.doesNotMatch(companyManager, /inviteToken\s*=/);
  assert.doesNotMatch(companyManager, /inviteCode\s*=/);
});

test("enrollment revocation never deletes employee users", () => {
  const enrollment = read("src/controllers/enrollmentController.js");
  assert.doesNotMatch(enrollment, /DELETE\s+FROM\s+users/i);
  assert.match(enrollment, /Registered employee accounts and history were preserved/);
  assert.match(enrollment, /deleted_employees:\s*0/);
});

test("direct partnership creation cannot bypass employer approval", () => {
  const partnership = read("src/controllers/partnershipController.js");
  const createBlock = partnership.slice(partnership.indexOf("exports.createPartnership"));

  assert.match(createBlock, /EMPLOYER_APPROVAL_REQUIRED/);
  assert.match(createBlock, /PARTNERSHIP_CREATE_FORBIDDEN/);
  assert.doesNotMatch(createBlock, /INSERT\s+INTO\s+partnerships/i);
  assert.doesNotMatch(createBlock, /INSERT\s+INTO\s+employers/i);
});

test("HBT Member creation uses activation instead of shared passwords", () => {
  const controller = read("src/controllers/teamMemberController.js");
  const frontend = read("../frontend/src/pages/HBTTeamMembers.tsx");

  assert.match(controller, /createActivationInvitation/);
  assert.match(controller, /'hbt_member',\s*\?,\s*0\)/s);
  assert.doesNotMatch(controller, /temporary_password/);
  assert.doesNotMatch(controller, /Math\.random\s*\(/);
  assert.doesNotMatch(frontend, /temporary_password/);
  assert.match(frontend, /activation_link/);
});

test("recommendation mutations exclude HBT Members and enforce team ownership", () => {
  const source = read("src/routes/resourceRecommendationRoutes.js");

  assert.match(source, /const isHbtAdmin/);
  assert.match(source, /Admin or HBT Admin access required/);
  assert.match(source, /team_id IS NULL OR team_id = \?/);
  assert.match(source, /AND team_id = \?/);
  assert.doesNotMatch(source, /if \(!isAdmin\(req\.user\) && !isHbt\(req\.user\)\).*create recommendation rule/s);
});

test("emergency migration clears plaintext invite credentials and adds rule ownership", () => {
  const migration = read("src/migrations/20260812_emergency_security.js");

  assert.match(migration, /invite_token = NULL/);
  assert.match(migration, /invite_code = NULL/);
  assert.match(migration, /SHA2\(invite_token, 256\)/);
  assert.match(migration, /ADD COLUMN team_id INT NULL/);
  assert.match(migration, /SET is_active = 0/);
});
