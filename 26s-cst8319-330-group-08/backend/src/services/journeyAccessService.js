const pool = require("../config/db");

const adminRoles = new Set(["admin", "super_admin"]);
const hbtRoles = new Set(["hbt_admin", "hbt_member"]);

const isAdmin = (user) => adminRoles.has(user?.role);
const isHbtAdmin = (user) => user?.role === "hbt_admin";
const isHbt = (user) => hbtRoles.has(user?.role);

const hasTeam = (user) => Number.isInteger(Number(user?.team_id)) && Number(user.team_id) > 0;

const getJourneyForRead = async (user, journeyId, connection = pool) => {
  const id = Number(journeyId);
  if (!id) return null;

  if (isAdmin(user)) {
    const [[journey]] = await connection.query(
      "SELECT * FROM journeys WHERE id = ? AND is_active = 1 LIMIT 1",
      [id],
    );
    return journey || null;
  }

  if (isHbt(user)) {
    if (!hasTeam(user)) return null;
    const [[journey]] = await connection.query(
      `SELECT * FROM journeys
       WHERE id = ? AND is_active = 1
         AND (team_id IS NULL OR team_id = ?)
       LIMIT 1`,
      [id, user.team_id],
    );
    return journey || null;
  }

  if (user?.role === "employee") {
    const [[journey]] = await connection.query(
      `SELECT j.*
       FROM journeys j
       JOIN employee_journey_assignments eja
         ON eja.journey_id = j.id
        AND eja.user_id = ?
        AND eja.status = 'active'
       WHERE j.id = ? AND j.is_active = 1
       LIMIT 1`,
      [user.id, id],
    );
    return journey || null;
  }

  return null;
};

const getJourneyForManage = async (user, journeyId, connection = pool) => {
  const id = Number(journeyId);
  if (!id) return null;

  if (isAdmin(user)) {
    const [[journey]] = await connection.query(
      "SELECT * FROM journeys WHERE id = ? LIMIT 1",
      [id],
    );
    return journey || null;
  }

  if (!isHbtAdmin(user) || !hasTeam(user)) return null;

  const [[journey]] = await connection.query(
    "SELECT * FROM journeys WHERE id = ? AND team_id = ? LIMIT 1",
    [id, user.team_id],
  );
  return journey || null;
};

const getStepForManage = async (user, stepId, connection = pool) => {
  const id = Number(stepId);
  if (!id) return null;

  const [[step]] = await connection.query(
    `SELECT js.*, j.team_id AS journey_team_id
     FROM journey_steps js
     JOIN journeys j ON j.id = js.journey_id
     WHERE js.id = ?
     LIMIT 1`,
    [id],
  );

  if (!step) return null;
  if (isAdmin(user)) return step;
  if (!isHbtAdmin(user) || !hasTeam(user)) return null;
  return Number(step.journey_team_id) === Number(user.team_id) ? step : null;
};

const getChecklistItemForManage = async (user, itemId, connection = pool) => {
  const id = Number(itemId);
  if (!id) return null;

  const [[item]] = await connection.query(
    `SELECT jci.*, js.journey_id, j.team_id AS journey_team_id
     FROM journey_checklist_items jci
     JOIN journey_steps js ON js.id = jci.journey_step_id
     JOIN journeys j ON j.id = js.journey_id
     WHERE jci.id = ?
     LIMIT 1`,
    [id],
  );

  if (!item) return null;
  if (isAdmin(user)) return item;
  if (!isHbtAdmin(user) || !hasTeam(user)) return null;
  return Number(item.journey_team_id) === Number(user.team_id) ? item : null;
};

const getAssignmentScope = async (user, employeeId, journeyId, connection = pool) => {
  const employeeUserId = Number(employeeId);
  const selectedJourneyId = Number(journeyId);
  if (!employeeUserId || !selectedJourneyId) return null;

  const [[scope]] = await connection.query(
    `SELECT
       employee.id AS employee_id,
       employee.partnership_id,
       p.team_id AS employee_team_id,
       j.id AS journey_id,
       j.team_id AS journey_team_id,
       j.is_active AS journey_is_active
     FROM users employee
     JOIN partnerships p ON p.id = employee.partnership_id
     JOIN journeys j ON j.id = ?
     WHERE employee.id = ?
       AND employee.role = 'employee'
       AND employee.is_active = 1
     LIMIT 1`,
    [selectedJourneyId, employeeUserId],
  );

  if (!scope || Number(scope.journey_is_active) !== 1) return null;
  if (isAdmin(user)) return scope;
  if (!isHbtAdmin(user) || !hasTeam(user)) return null;

  const sameEmployeeTeam = Number(scope.employee_team_id) === Number(user.team_id);
  const journeyAllowed = scope.journey_team_id === null || Number(scope.journey_team_id) === Number(user.team_id);
  return sameEmployeeTeam && journeyAllowed ? scope : null;
};

const getActiveAssignedStep = async (employeeUserId, stepId, connection = pool) => {
  const userId = Number(employeeUserId);
  const id = Number(stepId);
  if (!userId || !id) return null;

  const [[step]] = await connection.query(
    `SELECT js.id, js.journey_id
     FROM journey_steps js
     JOIN employee_journey_assignments eja
       ON eja.journey_id = js.journey_id
      AND eja.user_id = ?
      AND eja.status = 'active'
     WHERE js.id = ?
       AND js.is_active = 1
     LIMIT 1`,
    [userId, id],
  );

  return step || null;
};

const getAttachableResource = async (user, resourceId, connection = pool) => {
  const id = Number(resourceId);
  if (!id) return null;

  if (isAdmin(user)) {
    const [[resource]] = await connection.query(
      "SELECT id, team_id, is_global, is_active FROM resources WHERE id = ? AND is_active = 1 LIMIT 1",
      [id],
    );
    return resource || null;
  }

  if (!isHbtAdmin(user) || !hasTeam(user)) return null;

  const [[resource]] = await connection.query(
    `SELECT id, team_id, is_global, is_active
     FROM resources
     WHERE id = ?
       AND is_active = 1
       AND (is_global = 1 OR team_id = ?)
     LIMIT 1`,
    [id, user.team_id],
  );
  return resource || null;
};

module.exports = {
  adminRoles,
  hbtRoles,
  isAdmin,
  isHbt,
  isHbtAdmin,
  hasTeam,
  getJourneyForRead,
  getJourneyForManage,
  getStepForManage,
  getChecklistItemForManage,
  getAssignmentScope,
  getActiveAssignedStep,
  getAttachableResource,
};
