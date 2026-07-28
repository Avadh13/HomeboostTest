const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getVisibleQuizzes,
  getAccessibleQuiz,
  validateQuizSubmission,
} = require("../src/services/quizAccessService");
const quizMigration = require("../src/migrations/20260728_quiz_security");

const employee = {
  id: 41,
  role: "employee",
  partnership_id: 12,
  full_name: "Employee One",
  email: "employee@example.com",
};

const validationConnection = ({ questions, options, quiz = { id: 7, title: "Readiness" } }) => ({
  query: async (sql, params) => {
    if (sql.includes("FROM quizzes q")) {
      assert.deepEqual(params, [7, 12]);
      return [[quiz]];
    }
    if (sql.includes("FROM quiz_questions")) return [questions];
    if (sql.includes("FROM quiz_options")) return [options];
    throw new Error(`Unexpected query: ${sql}`);
  },
});

test("anonymous and company users cannot enumerate quizzes", async () => {
  let called = false;
  const connection = { query: async () => { called = true; return [[]]; } };

  assert.deepEqual(await getVisibleQuizzes(connection, null), []);
  assert.deepEqual(await getVisibleQuizzes(connection, { role: "company", partnership_id: 12 }), []);
  assert.equal(called, false);
});

test("employee quiz visibility is constrained by active partnership and tenant assignment", async () => {
  const connection = {
    query: async (sql, params) => {
      assert.match(sql, /p\.status = 'active'/);
      assert.match(sql, /quiz_partnerships/);
      assert.match(sql, /q\.team_id IS NULL OR q\.team_id = p\.team_id/);
      assert.deepEqual(params, [12]);
      return [[{ id: 7, is_active: 1, access_type: "public" }]];
    },
  };

  const quizzes = await getVisibleQuizzes(connection, employee);
  assert.equal(quizzes.length, 1);
  assert.equal(quizzes[0].id, 7);
});

test("employee without partnership cannot access a quiz", async () => {
  const connection = { query: async () => assert.fail("database should not be queried") };
  const quiz = await getAccessibleQuiz(connection, { id: 1, role: "employee" }, 7);
  assert.equal(quiz, null);
});

test("submission rejects a question that belongs to another quiz", async () => {
  const connection = validationConnection({
    questions: [{ id: 10, quiz_id: 7, question_type: "short_text", is_required: 1 }],
    options: [],
  });

  await assert.rejects(
    () => validateQuizSubmission(connection, employee, 7, [{ question_id: 999, answer_text: "No" }]),
    (error) => error.code === "QUIZ_QUESTION_INVALID" && error.statusCode === 400,
  );
});

test("submission rejects duplicate question answers", async () => {
  const connection = validationConnection({
    questions: [{ id: 10, quiz_id: 7, question_type: "short_text", is_required: 1 }],
    options: [],
  });

  await assert.rejects(
    () => validateQuizSubmission(connection, employee, 7, [
      { question_id: 10, answer_text: "First" },
      { question_id: 10, answer_text: "Second" },
    ]),
    (error) => error.code === "QUIZ_QUESTION_DUPLICATE",
  );
});

test("submission requires every required question", async () => {
  const connection = validationConnection({
    questions: [{ id: 10, quiz_id: 7, question_type: "short_text", is_required: 1 }],
    options: [],
  });

  await assert.rejects(
    () => validateQuizSubmission(connection, employee, 7, []),
    (error) => error.code === "QUIZ_REQUIRED_MISSING",
  );
});

test("single-choice answer is canonicalized from the stored option", async () => {
  const connection = validationConnection({
    questions: [{ id: 10, quiz_id: 7, question_type: "multiple_choice", is_required: 1 }],
    options: [
      { id: 100, question_id: 10, option_text: "Renting" },
      { id: 101, question_id: 10, option_text: "Buying" },
    ],
  });

  const result = await validateQuizSubmission(connection, employee, 7, [{
    question_id: 10,
    selected_option_id: 101,
    answer_text: "Tampered text",
  }]);

  assert.deepEqual(result.normalizedAnswers, [{
    question_id: 10,
    selected_option_id: 101,
    answer_text: "Buying",
  }]);
});

test("submission rejects an option from another question", async () => {
  const connection = validationConnection({
    questions: [{ id: 10, quiz_id: 7, question_type: "multiple_choice", is_required: 1 }],
    options: [{ id: 100, question_id: 10, option_text: "Renting" }],
  });

  await assert.rejects(
    () => validateQuizSubmission(connection, employee, 7, [{ question_id: 10, selected_option_id: 999 }]),
    (error) => error.code === "QUIZ_OPTION_INVALID",
  );
});

test("legacy checkbox text is validated and canonicalized", async () => {
  const connection = validationConnection({
    questions: [{ id: 10, quiz_id: 7, question_type: "checkbox", is_required: 1 }],
    options: [
      { id: 100, question_id: 10, option_text: "Income proof" },
      { id: 101, question_id: 10, option_text: "Identification" },
    ],
  });

  const result = await validateQuizSubmission(connection, employee, 7, [{
    question_id: 10,
    answer_text: "Income proof, Identification",
  }]);

  assert.equal(result.normalizedAnswers[0].answer_text, "Income proof, Identification");
  assert.equal(result.normalizedAnswers[0].selected_option_id, null);
});

test("quiz migration creates visibility columns, assignments, and indexes", async () => {
  const statements = [];
  const connection = {
    query: async (sql) => {
      statements.push(sql);
      if (sql.includes("INFORMATION_SCHEMA.COLUMNS")) return [[]];
      if (sql.includes("INFORMATION_SCHEMA.STATISTICS")) return [[]];
      return [[], []];
    },
  };

  await quizMigration.up(connection);
  const combined = statements.join("\n");
  assert.match(combined, /ADD COLUMN access_type/);
  assert.match(combined, /ADD COLUMN is_required/);
  assert.match(combined, /CREATE TABLE IF NOT EXISTS quiz_partnerships/);
  assert.match(combined, /idx_quizzes_visibility/);
});
