const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../src/config/db");

const request = async (app, path, options = {}) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, options);
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { status: response.status, body };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

const appFor = (router) => {
  const app = express();
  app.use(express.json());
  app.use(router);
  return app;
};

test("admin-protected content mutation routes reject requests without a token", async () => {
  const cases = [
    ["pricing", require("../src/routes/pricingRoutes"), "/"],
    ["faqs", require("../src/routes/faqRoutes"), "/"],
    ["sections", require("../src/routes/sectionRoutes"), "/"],
    ["cards", require("../src/routes/cardRoutes"), "/"],
    ["resources", require("../src/routes/resourceRoutes"), "/"],
    ["quizzes", require("../src/routes/quizRoutes"), "/"],
  ];

  for (const [label, router, path] of cases) {
    const response = await request(appFor(router), path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Protected write" }),
    });
    assert.equal(response.status, 401, `${label} should reject missing token`);
  }
});

test("admin-only content mutation routes reject authenticated non-admin users", async () => {
  const originalQuery = pool.query;
  const token = jwt.sign({ id: 12 }, process.env.JWT_SECRET);

  pool.query = async (sql) => {
    if (String(sql).includes("FROM users")) {
      return [[{
        id: 12,
        full_name: "Employee User",
        email: "employee@example.com",
        role: "employee",
        team_id: null,
        partnership_id: 3,
        is_active: 1,
      }]];
    }
    throw new Error(`Unexpected query after auth: ${sql}`);
  };

  try {
    const cases = [
      ["pricing", require("../src/routes/pricingRoutes"), "/"],
      ["faqs", require("../src/routes/faqRoutes"), "/"],
      ["sections", require("../src/routes/sectionRoutes"), "/"],
      ["cards", require("../src/routes/cardRoutes"), "/"],
      ["resource create", require("../src/routes/resourceRoutes"), "/"],
      ["quiz create", require("../src/routes/quizRoutes"), "/"],
    ];

    for (const [label, router, path] of cases) {
      const response = await request(appFor(router), path, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: "Protected write", question: "Protected question" }),
      });
      assert.equal(response.status, 403, `${label} should reject non-admin user`);
    }
  } finally {
    pool.query = originalQuery;
  }
});

test("document upload returns uploaded message when multer saves a file", async () => {
  const originalQuery = pool.query;
  const token = jwt.sign({ id: 44 }, process.env.JWT_SECRET);

  pool.query = async (sql) => {
    const text = String(sql);
    if (text.includes("FROM users")) {
      return [[{
        id: 44,
        full_name: "Employee User",
        email: "employee@example.com",
        role: "employee",
        team_id: null,
        partnership_id: 7,
        is_active: 1,
      }]];
    }
    if (text.includes("COUNT(*) AS total FROM document_checklist_templates")) return [[{ total: 1 }]];
    if (text.includes("INFORMATION_SCHEMA.COLUMNS")) return [[]];
    if (text.includes("SELECT title FROM document_checklist_templates")) return [[]];
    if (text.includes("INSERT INTO employee_documents")) return [{ insertId: 123 }];
    return [[]];
  };

  try {
    const form = new FormData();
    form.append("document_title", "Test document");
    form.append("file", new Blob(["%PDF-1.4\n"], { type: "application/pdf" }), "test.pdf");

    const response = await request(appFor(require("../src/routes/documentRoutes")), "/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });

    assert.equal(response.status, 201, JSON.stringify(response.body));
    assert.equal(response.body.message, "Document uploaded");
  } finally {
    pool.query = originalQuery;
  }
});
