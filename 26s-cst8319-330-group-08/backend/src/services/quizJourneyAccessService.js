const pool = require("../config/db");

const adminRoles = new Set(["admin", "super_admin"]);
const isAdmin = (user) => adminRoles.has(user?.role);
const isHbtAdmin = (user) => user?.role === "hbt_admin";
const hasTeam = (user) => Number.isInteger(Number(user?.team_id)) && Number(user.team_id) > 0;

const normalizeTeamId = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const getRuleForManage = async (user, ruleId, connection = pool) => {
  const id = Number(ruleId);
  if (!id) return null;

  if (isAdmin(user)) {
    const [[rule]] = await connection.query(
      "SELECT * FROM quiz_journey_rules WHERE id = ? LIMIT 1",
      [id],
    );
    return rule || null;
  }

  if (!isHbtAdmin(user) || !hasTeam(user)) return null;
  const [[rule]] = await connection.query(
    "SELECT * FROM quiz_journey_rules WHERE id = ? AND team_id = ? LIMIT 1",
    [id, user.team_id],
  );
  return rule || null;
};

const validateRuleReferences = async (user, input, connection = pool) => {
  if (!isAdmin(user) && !isHbtAdmin(user)) return null;
  if (isHbtAdmin(user) && !hasTeam(user)) return null;

  const teamId = isHbtAdmin(user) ? Number(user.team_id) : normalizeTeamId(input.team_id);
  const journeyId = Number(input.journey_id);
  const quizId = input.quiz_id ? Number(input.quiz_id) : null;
  if (!journeyId || (input.quiz_id && !quizId)) return null;

  const [[journey]] = await connection.query(
    "SELECT id, team_id, is_active FROM journeys WHERE id = ? LIMIT 1",
    [journeyId],
  );
  if (!journey || Number(journey.is_active) !== 1) return null;

  let quiz = null;
  if (quizId) {
    [[quiz]] = await connection.query(
      "SELECT id, team_id, is_global, is_active FROM quizzes WHERE id = ? LIMIT 1",
      [quizId],
    );
    if (!quiz || Number(quiz.is_active) !== 1) return null;
  }

  if (teamId === null) {
    const globalJourney = journey.team_id === null;
    const globalQuiz = !quiz || Number(quiz.is_global) === 1 || quiz.team_id === null;
    if (!globalJourney || !globalQuiz) return null;
  } else {
    const journeyAllowed = journey.team_id === null || Number(journey.team_id) === teamId;
    const quizAllowed = !quiz || Number(quiz.is_global) === 1 || quiz.team_id === null || Number(quiz.team_id) === teamId;
    if (!journeyAllowed || !quizAllowed) return null;
  }

  return { teamId, journeyId, quizId, journey, quiz };
};

const getSubmissionForApply = async (user, submissionId, connection = pool) => {
  const id = Number(submissionId);
  if (!id) return null;

  const [[submission]] = await connection.query(
    `SELECT qs.id, qs.quiz_id, qs.user_id, qs.partnership_id, p.team_id
     FROM quiz_submissions qs
     JOIN partnerships p ON p.id = qs.partnership_id
     WHERE qs.id = ?
     LIMIT 1`,
    [id],
  );
  if (!submission?.user_id) return null;

  if (isAdmin(user)) return submission;
  if (!isHbtAdmin(user) || !hasTeam(user)) return null;
  return Number(submission.team_id) === Number(user.team_id) ? submission : null;
};

module.exports = {
  adminRoles,
  isAdmin,
  isHbtAdmin,
  hasTeam,
  normalizeTeamId,
  getRuleForManage,
  validateRuleReferences,
  getSubmissionForApply,
};
