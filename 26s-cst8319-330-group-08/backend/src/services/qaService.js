const pool = require("../config/db");

const PRIORITY_WEIGHTS = Object.freeze({ critical: 5, high: 3, medium: 2, low: 1 });
const VALID_STATUSES = new Set(["not_tested", "in_progress", "passed", "failed", "blocked", "not_applicable"]);
const VALID_PRIORITIES = new Set(Object.keys(PRIORITY_WEIGHTS));
const VALID_TEST_TYPES = new Set(["manual", "automated", "hybrid"]);
const VALID_ENVIRONMENTS = new Set(["local", "preview", "staging", "production"]);

const TEST_CASE_SEEDS = [
  ["public_program_content", "Public EBP Website", "Program information is complete and accurate", "Verify the public website explains the program, benefits, and supporting statistics without placeholder content.", "Client requirements pp. 1, 4", "visitor", "high", "manual", "/", 0],
  ["public_demo_video", "Public EBP Website", "Employee portal demonstration video plays", "Verify the approved demonstration video loads, plays, and remains usable on desktop and mobile.", "Client requirements p. 4", "visitor", "high", "manual", "/", 0],
  ["public_consultation_link", "Public EBP Website", "Consultation booking link works", "Verify the consultation or discovery-call action opens the approved external booking destination for Kelly.", "Client requirements p. 4", "visitor", "medium", "manual", "/contact", 0],
  ["public_responsive", "Public EBP Website", "Public pages are responsive", "Verify core public pages remain readable and operable on mobile, tablet, and desktop breakpoints.", "Client requirements pp. 1-4", "visitor", "high", "manual", "/", 0],

  ["hbt_registration", "HBT Registration and Payment", "Home Buying Team registration succeeds", "Verify a prospective Home Buying Team can submit a valid registration and receives a pending enrollment record.", "Client requirements pp. 2-4", "hbt_admin", "critical", "hybrid", "/hbt-signup", 1],
  ["hbt_registration_validation", "HBT Registration and Payment", "Registration validation rejects invalid data", "Verify required fields, email format, duplicate accounts, and invalid submissions are rejected safely.", "Client requirements p. 4", "hbt_admin", "high", "hybrid", "/hbt-signup", 0],
  ["stripe_checkout", "HBT Registration and Payment", "Stripe checkout session is created", "Verify a valid HBT registration creates a secure Stripe Checkout session with the expected enrollment details.", "Client requirements pp. 3-4", "hbt_admin", "critical", "hybrid", "/hbt-signup", 1],
  ["stripe_signed_webhook", "HBT Registration and Payment", "Signed Stripe webhook activates enrollment", "Verify only a valid signed successful-payment webhook activates the HBT account and enrollment.", "Client requirements pp. 3-4", "hbt_admin", "critical", "hybrid", "/payment-success", 1],
  ["stripe_failed_payment", "HBT Registration and Payment", "Failed payment does not activate access", "Verify cancelled, failed, duplicated, or unverified payment events cannot activate portal access.", "Client requirements pp. 3-4", "hbt_admin", "critical", "hybrid", "/payment-success", 1],
  ["hbt_post_payment_access", "HBT Registration and Payment", "Successful enrollment grants correct portal access", "Verify the paid HBT user can sign in and is routed to the correct HBT workspace.", "Client requirements pp. 2-4", "hbt_admin", "critical", "manual", "/hbt/dashboard", 1],

  ["course_content_access", "HBT Course Portal", "All course content is accessible", "Verify HBT users can open every approved lesson, PDF, video, and resource.", "Client requirements pp. 2, 4", "hbt_admin", "critical", "manual", "/hbt/courses", 1],
  ["course_progress", "HBT Course Portal", "Course progress is calculated correctly", "Verify lesson completion updates the course percentage and completed-module counts accurately.", "Client requirements pp. 2, 4", "hbt_admin", "high", "hybrid", "/hbt/courses", 0],
  ["course_resume", "HBT Course Portal", "Course resumes from the last position", "Verify course state survives refresh and logout and the user can continue where they stopped.", "Client requirements p. 4", "hbt_admin", "high", "manual", "/hbt/courses", 0],
  ["course_role_access", "HBT Course Portal", "Course access is role protected", "Verify unauthorized roles cannot read or modify HBT course content or progress.", "Client requirements pp. 2, 4", "admin", "critical", "automated", "/hbt/courses", 1],

  ["employer_create", "Employer Management", "HBT can add a participating employer", "Verify an HBT can create or connect an employer within its own organization scope.", "Client requirements pp. 2-4", "hbt_admin", "high", "hybrid", "/hbt/companies", 0],
  ["employer_approval", "Employer Management", "Employer participation approval works", "Verify the company point of contact can be recorded and participation can be approved or rejected.", "Client requirements p. 3", "company_admin", "critical", "manual", "/hbt/employer-approvals", 1],
  ["employer_employee_engagement", "Employer Management", "Employee participation and engagement are visible", "Verify authorized HBT and employer users can view correct employee participation and engagement metrics.", "Client requirements pp. 2, 4", "company_admin", "high", "manual", "/company/dashboard", 0],
  ["employer_tenant_isolation", "Employer Management", "Employer data is tenant isolated", "Verify one employer and HBT cannot read or modify another organization’s employees or records.", "Client requirements pp. 1-5", "admin", "critical", "hybrid", "/company/dashboard", 1],

  ["employee_invite_create", "Employee Invitation and Access", "Unique employee invitation is generated", "Verify an authorized HBT or employer can create a single-use invitation for the correct company workspace.", "Client requirements pp. 3-5", "company_admin", "critical", "hybrid", "/company/invites", 1],
  ["employee_invite_email", "Employee Invitation and Access", "Invitation email contains the correct link", "Verify the invitation is delivered with the correct production domain, token, company, and expiry information.", "Client requirements pp. 3, 5", "employee", "critical", "manual", "/invite/:token", 1],
  ["employee_invite_expiry", "Employee Invitation and Access", "Expired and reused invitations are rejected", "Verify expired, revoked, malformed, and previously accepted invitations cannot be used.", "Client requirements p. 5", "employee", "critical", "hybrid", "/invite/:token", 1],
  ["employee_workspace_assignment", "Employee Invitation and Access", "Employee joins the correct workspace", "Verify accepted invitations connect the employee to the intended employer, partnership, and HBT.", "Client requirements pp. 3, 5", "employee", "critical", "hybrid", "/employee-portal", 1],
  ["employee_secure_login", "Employee Invitation and Access", "Employee signs in securely", "Verify invited employees can sign in and unauthorized or disabled accounts are rejected.", "Client requirements p. 5", "employee", "critical", "hybrid", "/login", 1],

  ["onboarding_required", "Mandatory Onboarding Quiz", "New employees must complete onboarding", "Verify a new employee is directed to the onboarding quiz before personalized journey and resource access.", "Client requirements pp. 3, 5", "employee", "critical", "hybrid", "/quiz", 1],
  ["onboarding_questions", "Mandatory Onboarding Quiz", "Quiz questions and options load correctly", "Verify all active onboarding questions, options, validation, and required-answer rules work.", "Client requirements p. 5", "employee", "critical", "manual", "/quiz", 1],
  ["onboarding_submission", "Mandatory Onboarding Quiz", "Quiz submission is saved once", "Verify a valid submission is persisted, associated with the employee, and protected from duplicate accidental submission.", "Client requirements p. 5", "employee", "critical", "hybrid", "/quiz", 1],
  ["onboarding_access_gate", "Mandatory Onboarding Quiz", "Personalized access remains locked before completion", "Verify journey and personalized resources remain inaccessible until onboarding is complete.", "Client requirements p. 5", "employee", "critical", "automated", "/employee/journey", 1],
  ["onboarding_persistence", "Mandatory Onboarding Quiz", "Onboarding completion persists", "Verify completed users are not forced through onboarding again after refresh or a new login.", "Client requirements p. 5", "employee", "high", "hybrid", "/employee-portal", 0],

  ["quiz_rule_management", "Quiz-to-Journey Mapping", "HBT can manage quiz mapping rules", "Verify an authorized HBT can create and update quiz-outcome-to-journey mappings within its scope.", "Client requirements p. 5", "hbt_admin", "critical", "hybrid", "/hbt/quiz-journey-rules", 1],
  ["journey_auto_assignment", "Quiz-to-Journey Mapping", "Employee is automatically assigned to the correct journey", "Verify quiz results select and persist the correct journey immediately after onboarding.", "Client requirements pp. 3, 5", "employee", "critical", "hybrid", "/employee/journey", 1],
  ["journey_mapping_fallback", "Quiz-to-Journey Mapping", "Unmatched outcomes use a controlled fallback", "Verify incomplete mappings produce a safe fallback or visible blocker rather than an invalid assignment.", "Client requirements p. 5", "hbt_admin", "high", "hybrid", "/hbt/quiz-journey-rules", 0],
  ["journey_mapping_isolation", "Quiz-to-Journey Mapping", "Journey mappings are tenant isolated", "Verify an HBT cannot map employees to journeys owned by a different HBT or partnership.", "Client requirements p. 5", "admin", "critical", "automated", "/hbt/quiz-journey-rules", 1],

  ["journey_create", "Journey Management", "HBT can create multiple journeys", "Verify journeys can be created with unique names and associated content within the correct HBT scope.", "Client requirements p. 5", "hbt_admin", "critical", "hybrid", "/hbt/journeys", 1],
  ["journey_edit", "Journey Management", "Journey content can be edited and ordered", "Verify authorized users can edit content, checklist items, milestones, resources, and ordering.", "Client requirements p. 5", "hbt_admin", "high", "manual", "/hbt/journeys", 0],
  ["journey_duplicate", "Journey Management", "Journey content can be duplicated", "Verify duplication creates an independent copy without corrupting the original journey.", "Client requirements p. 5", "hbt_admin", "medium", "manual", "/hbt/journeys", 0],
  ["journey_archive", "Journey Management", "Archived journeys stop new assignments", "Verify archived journeys remain historically readable but cannot receive new employees.", "Client requirements p. 5", "hbt_admin", "high", "hybrid", "/hbt/journeys", 0],
  ["journey_delete", "Journey Management", "Journey deletion is protected", "Verify deletion requires confirmation and does not orphan employee progress or assignments.", "Client requirements p. 5", "hbt_admin", "high", "manual", "/hbt/journeys", 0],

  ["employee_journey_access", "Employee Journey Experience", "Employee can access the assigned journey", "Verify the assigned journey is available at any time after onboarding and contains the expected steps.", "Client requirements pp. 3, 5", "employee", "critical", "manual", "/employee/journey", 1],
  ["employee_checklist_progress", "Employee Journey Experience", "Checklist and milestone progress is accurate", "Verify completed checklist items update milestones and the overall journey percentage correctly.", "Client requirements p. 5", "employee", "critical", "hybrid", "/employee/journey", 1],
  ["employee_progress_persistence", "Employee Journey Experience", "Journey progress persists", "Verify progress survives refresh, logout, and a second device without duplicate completion records.", "Client requirements p. 5", "employee", "critical", "hybrid", "/employee/journey", 1],
  ["employee_progress_isolation", "Employee Journey Experience", "Employee progress is private", "Verify an employee cannot read or update another employee’s journey assignment or progress.", "Client requirements p. 5", "admin", "critical", "automated", "/employee/journey", 1],

  ["resource_personalized", "Resource Library", "Personalized resources appear after onboarding", "Verify quiz and journey results surface the expected personalized resources after completion.", "Client requirements pp. 2, 5-6", "employee", "critical", "manual", "/resources", 1],
  ["resource_browse_all", "Resource Library", "Employees can browse permitted resources outside the journey", "Verify employees can view the full permitted library in addition to assigned journey resources.", "Client requirements p. 6", "employee", "high", "manual", "/resources", 0],
  ["resource_search_filter", "Resource Library", "Resource search and category filters work", "Verify search and category filtering work separately and together with accurate empty states.", "Client requirements p. 6", "employee", "high", "manual", "/resources", 0],
  ["resource_content_open", "Resource Library", "Resource content opens safely", "Verify PDFs, videos, downloads, and external links open correctly while archived or restricted items remain hidden.", "Client requirements pp. 4-6", "employee", "high", "manual", "/resources/:id", 0],

  ["branding_employer_identity", "Employer Branding", "Correct employer branding is displayed", "Verify employer name, logo, and approved prompts follow the employee’s company or location.", "Client requirements p. 5", "employee", "high", "manual", "/employee-portal", 0],
  ["branding_default", "Employer Branding", "Default branding is safe", "Verify the standard program identity appears when no employer-specific branding exists.", "Client requirements p. 5", "employee", "medium", "manual", "/employee-portal", 0],
  ["branding_isolation", "Employer Branding", "Branding is tenant isolated", "Verify one employer’s logo or prompts never appear in another employer’s portal.", "Client requirements p. 5", "admin", "critical", "hybrid", "/employee-portal", 1],

  ["messaging_assignment", "Messaging and HBT Connection", "Employee sees the assigned HBT contact", "Verify the employee portal identifies the correct assigned Home Buying Team or advisor.", "Client requirements pp. 1-3", "employee", "high", "manual", "/employee/messages", 0],
  ["messaging_two_way", "Messaging and HBT Connection", "Employee and assigned HBT can exchange messages", "Verify messages send, receive, order, timestamp, and update unread counts correctly.", "Client requirements pp. 1-3", "employee", "high", "hybrid", "/employee/messages", 0],
  ["messaging_privacy", "Messaging and HBT Connection", "Conversations are private", "Verify only authorized conversation participants can read or modify messages.", "Client requirements pp. 1-3", "admin", "critical", "automated", "/employee/messages", 1],

  ["admin_user_management", "Admin and Security", "Admin can manage users and roles", "Verify authorized admins can create, update, disable, and correctly assign supported roles.", "Client requirements p. 2", "admin", "high", "hybrid", "/admin/users", 0],
  ["admin_content_management", "Admin and Security", "Admin can manage course and portal content", "Verify admins can manage courses, resources, quizzes, journeys, pages, and organizations as required.", "Client requirements p. 2", "admin", "high", "manual", "/admin", 0],
  ["rbac_routes", "Admin and Security", "Role-based routes reject unauthorized access", "Verify frontend guards and backend authorization reject users outside the permitted roles.", "Client requirements pp. 1-5", "admin", "critical", "automated", "/admin", 1],
  ["api_error_sanitization", "Admin and Security", "Production API errors are sanitized", "Verify API responses never expose stack traces, secrets, SQL details, tokens, or personal data.", "Production security requirement", "admin", "critical", "automated", "/api", 1],
  ["production_email", "Admin and Security", "Production transactional email delivery works", "Verify invitation and activation messages are delivered from the approved provider with production links.", "Client requirements pp. 3-5", "admin", "critical", "manual", "/admin/qa", 1],
  ["backup_restore", "Admin and Security", "Database backup and restore are verified", "Verify a current production-like backup can be restored and critical portal data remains consistent.", "Launch operations requirement", "admin", "critical", "manual", "/admin/qa", 1]
];

let schemaPromise = null;

const createSchema = async () => {
  await pool.query(`CREATE TABLE IF NOT EXISTS qa_test_cases (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    test_key VARCHAR(100) NOT NULL,
    category VARCHAR(80) NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    requirement_reference VARCHAR(160) NULL,
    user_role VARCHAR(50) NOT NULL DEFAULT 'all',
    priority ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium',
    test_type ENUM('manual','automated','hybrid') NOT NULL DEFAULT 'manual',
    route_path VARCHAR(255) NULL,
    is_launch_blocker TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_qa_test_cases_key (test_key),
    KEY idx_qa_test_cases_filters (is_active, category, user_role, priority),
    KEY idx_qa_test_cases_launch (is_active, is_launch_blocker, priority)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS qa_test_runs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    test_case_id BIGINT UNSIGNED NOT NULL,
    release_version VARCHAR(80) NOT NULL DEFAULT 'current',
    environment ENUM('local','preview','staging','production') NOT NULL DEFAULT 'preview',
    status ENUM('not_tested','in_progress','passed','failed','blocked','not_applicable') NOT NULL DEFAULT 'not_tested',
    actual_result TEXT NULL,
    notes TEXT NULL,
    tested_by INT NULL,
    tested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_qa_test_runs_latest (test_case_id, tested_at, id),
    KEY idx_qa_test_runs_release (release_version, environment, status),
    CONSTRAINT fk_qa_test_runs_case FOREIGN KEY (test_case_id) REFERENCES qa_test_cases(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS qa_test_evidence (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    test_run_id BIGINT UNSIGNED NOT NULL,
    file_url VARCHAR(1000) NOT NULL,
    file_name VARCHAR(255) NULL,
    evidence_type ENUM('screenshot','video','document','link','log') NOT NULL DEFAULT 'link',
    uploaded_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_qa_test_evidence_run (test_run_id, created_at),
    CONSTRAINT fk_qa_test_evidence_run FOREIGN KEY (test_run_id) REFERENCES qa_test_runs(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS qa_release_cycles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    version VARCHAR(80) NOT NULL,
    environment ENUM('local','preview','staging','production') NOT NULL DEFAULT 'preview',
    status ENUM('planned','active','completed','cancelled') NOT NULL DEFAULT 'planned',
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    created_by INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_qa_release_cycles_version_env (version, environment)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  const placeholders = TEST_CASE_SEEDS.map(() => "(?,?,?,?,?,?,?,?,?,?)").join(",");
  const values = TEST_CASE_SEEDS.flat();
  await pool.query(
    `INSERT INTO qa_test_cases
      (test_key, category, title, description, requirement_reference, user_role, priority, test_type, route_path, is_launch_blocker)
     VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE
       category = VALUES(category),
       title = VALUES(title),
       description = VALUES(description),
       requirement_reference = VALUES(requirement_reference),
       user_role = VALUES(user_role),
       priority = VALUES(priority),
       test_type = VALUES(test_type),
       route_path = VALUES(route_path),
       is_launch_blocker = VALUES(is_launch_blocker),
       is_active = 1`,
    values
  );
};

const ensureQaSchema = async () => {
  if (!schemaPromise) {
    schemaPromise = createSchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
};

const normalizeFilters = (filters = {}) => ({
  category: typeof filters.category === "string" ? filters.category.trim() : "",
  role: typeof filters.role === "string" ? filters.role.trim() : "",
  priority: VALID_PRIORITIES.has(filters.priority) ? filters.priority : "",
  status: VALID_STATUSES.has(filters.status) ? filters.status : "",
  search: typeof filters.search === "string" ? filters.search.trim().slice(0, 120) : "",
  launchBlocker: filters.launch_blocker === "true" || filters.launch_blocker === true,
});

const listTestCases = async (filters = {}) => {
  await ensureQaSchema();
  const normalized = normalizeFilters(filters);
  const where = ["tc.is_active = 1"];
  const params = [];

  if (normalized.category) {
    where.push("tc.category = ?");
    params.push(normalized.category);
  }
  if (normalized.role) {
    where.push("tc.user_role = ?");
    params.push(normalized.role);
  }
  if (normalized.priority) {
    where.push("tc.priority = ?");
    params.push(normalized.priority);
  }
  if (normalized.status) {
    where.push("COALESCE(qr.status, 'not_tested') = ?");
    params.push(normalized.status);
  }
  if (normalized.launchBlocker) where.push("tc.is_launch_blocker = 1");
  if (normalized.search) {
    where.push("(tc.title LIKE ? OR tc.description LIKE ? OR tc.test_key LIKE ? OR tc.requirement_reference LIKE ?)");
    const pattern = `%${normalized.search}%`;
    params.push(pattern, pattern, pattern, pattern);
  }

  const [rows] = await pool.query(
    `SELECT
       tc.*,
       COALESCE(qr.status, 'not_tested') AS status,
       qr.id AS latest_run_id,
       qr.release_version,
       qr.environment,
       qr.actual_result,
       qr.notes,
       qr.tested_at,
       tester.full_name AS tester_name,
       COALESCE(ev.evidence_count, 0) AS evidence_count
     FROM qa_test_cases tc
     LEFT JOIN qa_test_runs qr ON qr.id = (
       SELECT qr2.id
       FROM qa_test_runs qr2
       WHERE qr2.test_case_id = tc.id
       ORDER BY qr2.tested_at DESC, qr2.id DESC
       LIMIT 1
     )
     LEFT JOIN users tester ON tester.id = qr.tested_by
     LEFT JOIN (
       SELECT test_run_id, COUNT(*) AS evidence_count
       FROM qa_test_evidence
       GROUP BY test_run_id
     ) ev ON ev.test_run_id = qr.id
     WHERE ${where.join(" AND ")}
     ORDER BY FIELD(tc.priority, 'critical','high','medium','low'), tc.category, tc.title`,
    params
  );

  return rows.map((row) => ({
    ...row,
    is_launch_blocker: Boolean(row.is_launch_blocker),
    is_active: Boolean(row.is_active),
    evidence_count: Number(row.evidence_count || 0),
  }));
};

const aggregateCoverage = (rows, field) => {
  const groups = new Map();
  for (const row of rows) {
    const key = row[field] || "Unassigned";
    if (!groups.has(key)) groups.set(key, { name: key, passed: 0, total: 0, score: 0 });
    const group = groups.get(key);
    if (row.status === "not_applicable") continue;
    const weight = PRIORITY_WEIGHTS[row.priority] || 1;
    group.total += weight;
    if (row.status === "passed") group.passed += weight;
  }
  return Array.from(groups.values())
    .map((group) => ({ ...group, score: group.total ? Math.round((group.passed / group.total) * 100) : 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const summarizeTestCases = (rows) => {
  const counts = {
    not_tested: 0,
    in_progress: 0,
    passed: 0,
    failed: 0,
    blocked: 0,
    not_applicable: 0,
  };

  let totalWeight = 0;
  let passedWeight = 0;
  let lastTestedAt = null;

  for (const row of rows) {
    counts[row.status] = (counts[row.status] || 0) + 1;
    if (row.tested_at && (!lastTestedAt || new Date(row.tested_at) > new Date(lastTestedAt))) lastTestedAt = row.tested_at;
    if (row.status === "not_applicable") continue;
    const weight = PRIORITY_WEIGHTS[row.priority] || 1;
    totalWeight += weight;
    if (row.status === "passed") passedWeight += weight;
  }

  const score = totalWeight ? Math.round((passedWeight / totalWeight) * 100) : 0;
  const criticalBlockers = rows.filter(
    (row) => (row.is_launch_blocker || row.priority === "critical") && !["passed", "not_applicable"].includes(row.status)
  );
  const readiness = criticalBlockers.length > 0 ? "not_ready" : score >= 90 ? "ready" : score >= 75 ? "ready_with_warnings" : "not_ready";

  return {
    readiness,
    score,
    total: rows.length,
    counts,
    critical_blocker_count: criticalBlockers.length,
    critical_blockers: criticalBlockers.slice(0, 12),
    category_coverage: aggregateCoverage(rows, "category"),
    role_coverage: aggregateCoverage(rows, "user_role"),
    last_tested_at: lastTestedAt,
  };
};

const getSummary = async () => summarizeTestCases(await listTestCases());

const getTestCase = async (id) => {
  const rows = await listTestCases();
  const testCase = rows.find((row) => Number(row.id) === Number(id));
  if (!testCase) return null;
  const runs = await listTestRuns(id);
  return { ...testCase, runs };
};

const listTestRuns = async (testCaseId) => {
  await ensureQaSchema();
  const [runs] = await pool.query(
    `SELECT qr.*, tester.full_name AS tester_name
     FROM qa_test_runs qr
     LEFT JOIN users tester ON tester.id = qr.tested_by
     WHERE qr.test_case_id = ?
     ORDER BY qr.tested_at DESC, qr.id DESC
     LIMIT 100`,
    [testCaseId]
  );
  if (runs.length === 0) return [];

  const runIds = runs.map((run) => run.id);
  const [evidence] = await pool.query(
    `SELECT * FROM qa_test_evidence WHERE test_run_id IN (?) ORDER BY created_at DESC`,
    [runIds]
  );
  const evidenceByRun = evidence.reduce((map, item) => {
    const key = String(item.test_run_id);
    if (!map[key]) map[key] = [];
    map[key].push(item);
    return map;
  }, {});
  return runs.map((run) => ({ ...run, evidence: evidenceByRun[String(run.id)] || [] }));
};

const recordTestRun = async ({ testCaseId, status, releaseVersion, environment, actualResult, notes, evidenceUrls, userId }) => {
  await ensureQaSchema();
  if (!VALID_STATUSES.has(status)) throw new Error("Invalid QA status");
  if (!VALID_ENVIRONMENTS.has(environment)) throw new Error("Invalid QA environment");

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [cases] = await connection.query("SELECT id FROM qa_test_cases WHERE id = ? AND is_active = 1 LIMIT 1", [testCaseId]);
    if (cases.length === 0) {
      const error = new Error("QA test case not found");
      error.statusCode = 404;
      throw error;
    }

    const [result] = await connection.query(
      `INSERT INTO qa_test_runs
       (test_case_id, release_version, environment, status, actual_result, notes, tested_by, tested_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [testCaseId, releaseVersion || "current", environment, status, actualResult || null, notes || null, userId || null]
    );

    const cleanEvidence = Array.isArray(evidenceUrls)
      ? evidenceUrls
          .filter((item) => item && typeof item.file_url === "string" && item.file_url.trim())
          .slice(0, 10)
      : [];

    for (const item of cleanEvidence) {
      await connection.query(
        `INSERT INTO qa_test_evidence (test_run_id, file_url, file_name, evidence_type, uploaded_by)
         VALUES (?, ?, ?, ?, ?)`,
        [
          result.insertId,
          item.file_url.trim().slice(0, 1000),
          typeof item.file_name === "string" ? item.file_name.trim().slice(0, 255) || null : null,
          ["screenshot", "video", "document", "link", "log"].includes(item.evidence_type) ? item.evidence_type : "link",
          userId || null,
        ]
      );
    }

    await connection.commit();
    return { id: result.insertId, test_case_id: Number(testCaseId) };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const createTestCase = async (payload, userId) => {
  await ensureQaSchema();
  if (!payload.test_key || !payload.title || !payload.category) throw new Error("Test key, category, and title are required");
  const priority = VALID_PRIORITIES.has(payload.priority) ? payload.priority : "medium";
  const testType = VALID_TEST_TYPES.has(payload.test_type) ? payload.test_type : "manual";
  const [result] = await pool.query(
    `INSERT INTO qa_test_cases
     (test_key, category, title, description, requirement_reference, user_role, priority, test_type, route_path, is_launch_blocker, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(payload.test_key).trim().slice(0, 100),
      String(payload.category).trim().slice(0, 80),
      String(payload.title).trim().slice(0, 180),
      payload.description || null,
      payload.requirement_reference || null,
      payload.user_role || "all",
      priority,
      testType,
      payload.route_path || null,
      payload.is_launch_blocker ? 1 : 0,
      userId || null,
    ]
  );
  return getTestCase(result.insertId);
};

const updateTestCase = async (id, payload) => {
  await ensureQaSchema();
  const priority = VALID_PRIORITIES.has(payload.priority) ? payload.priority : "medium";
  const testType = VALID_TEST_TYPES.has(payload.test_type) ? payload.test_type : "manual";
  const [result] = await pool.query(
    `UPDATE qa_test_cases SET
       category = ?, title = ?, description = ?, requirement_reference = ?, user_role = ?, priority = ?,
       test_type = ?, route_path = ?, is_launch_blocker = ?, is_active = ?
     WHERE id = ?`,
    [
      String(payload.category || "").trim().slice(0, 80),
      String(payload.title || "").trim().slice(0, 180),
      payload.description || null,
      payload.requirement_reference || null,
      payload.user_role || "all",
      priority,
      testType,
      payload.route_path || null,
      payload.is_launch_blocker ? 1 : 0,
      payload.is_active === false ? 0 : 1,
      id,
    ]
  );
  if (result.affectedRows === 0) return null;
  return getTestCase(id);
};

const deactivateTestCase = async (id) => {
  await ensureQaSchema();
  const [result] = await pool.query("UPDATE qa_test_cases SET is_active = 0 WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

module.exports = {
  PRIORITY_WEIGHTS,
  VALID_STATUSES,
  VALID_PRIORITIES,
  VALID_TEST_TYPES,
  VALID_ENVIRONMENTS,
  ensureQaSchema,
  listTestCases,
  getTestCase,
  listTestRuns,
  recordTestRun,
  getSummary,
  createTestCase,
  updateTestCase,
  deactivateTestCase,
};
