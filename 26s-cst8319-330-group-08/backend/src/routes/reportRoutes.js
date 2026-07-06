const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const hbtRoles = ["hbt_admin", "hbt_member"];
const companyRoles = ["company", "company_admin"];
const reportRoles = [...adminRoles, ...hbtRoles, ...companyRoles];

const ensureReportTables = async (connection = pool) => {
  await connection.query(`CREATE TABLE IF NOT EXISTS report_export_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    export_type VARCHAR(80) NOT NULL,
    scope_role VARCHAR(80) NULL,
    row_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_report_export_user (user_id),
    INDEX idx_report_export_type (export_type),
    INDEX idx_report_export_created (created_at)
  )`);
};

const tableExists = async (tableName) => {
  const [rows] = await pool.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1",
    [tableName]
  );
  return rows.length > 0;
};

const scopeClause = (user, partnershipAlias = "p") => {
  if (adminRoles.includes(user.role)) return { clause: "", params: [] };
  if (hbtRoles.includes(user.role)) return { clause: ` AND ${partnershipAlias}.team_id = ?`, params: [user.team_id || 0] };
  if (companyRoles.includes(user.role)) return { clause: ` AND ${partnershipAlias}.id = ?`, params: [user.partnership_id || 0] };
  return { clause: " AND 1 = 0", params: [] };
};

const countValue = async (query, params = []) => {
  try {
    const [[row]] = await pool.query(query, params);
    return Number(Object.values(row || {})[0] || 0);
  } catch {
    return 0;
  }
};

const csvEscape = (value) => {
  if (value === null || value === undefined) return "";
  return `"${String(value).replace(/"/g, '""').replace(/[\r\n]+/g, " ")}"`;
};

const sendCsv = async (req, res, filename, rows) => {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : ["message"];
  const body = [headers.join(","), ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(","))].join("\n");
  await ensureReportTables();
  await pool.query("INSERT INTO report_export_logs (user_id, export_type, scope_role, row_count) VALUES (?, ?, ?, ?)", [req.user.id, filename, req.user.role, rows.length]);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
  return res.send(body || "message\nNo data");
};

router.use(protect);

router.get("/summary", async (req, res) => {
  try {
    if (!reportRoles.includes(req.user.role)) return res.status(403).json({ status: "error", message: "Report access required" });
    await ensureReportTables();
    const scope = scopeClause(req.user, "p");

    const metrics = {
      partnerships: await countValue(`SELECT COUNT(*) AS total FROM partnerships p WHERE 1=1 ${scope.clause}`, scope.params),
      employers: await countValue(`SELECT COUNT(DISTINCT p.employer_id) AS total FROM partnerships p WHERE 1=1 ${scope.clause}`, scope.params),
      employees: await countValue(`SELECT COUNT(*) AS total FROM users u LEFT JOIN partnerships p ON p.id = u.partnership_id WHERE u.role = 'employee' ${scope.clause}`, scope.params),
      quiz_submissions: await countValue(`SELECT COUNT(*) AS total FROM quiz_submissions qs LEFT JOIN partnerships p ON p.id = qs.partnership_id WHERE 1=1 ${scope.clause}`, scope.params),
      journey_assignments: await countValue(`SELECT COUNT(*) AS total FROM employee_journey_assignments eja JOIN users u ON u.id = eja.user_id LEFT JOIN partnerships p ON p.id = u.partnership_id WHERE eja.status = 'active' ${scope.clause}`, scope.params),
      uploaded_documents: await countValue(`SELECT COUNT(*) AS total FROM employee_documents ed LEFT JOIN partnerships p ON p.id = ed.partnership_id WHERE 1=1 ${scope.clause}`, scope.params),
      pending_documents: await countValue(`SELECT COUNT(*) AS total FROM employee_documents ed LEFT JOIN partnerships p ON p.id = ed.partnership_id WHERE ed.status IN ('uploaded', 'under_review', 'needs_correction') ${scope.clause}`, scope.params),
      pending_approvals: await countValue(`SELECT COUNT(*) AS total FROM employer_approval_requests ear LEFT JOIN partnerships p ON p.id = ear.partnership_id WHERE ear.approval_status = 'pending' ${scope.clause}`, scope.params),
      exports_generated: await countValue("SELECT COUNT(*) AS total FROM report_export_logs WHERE user_id = ?", [req.user.id]),
    };

    const readinessScope = scopeClause(req.user, "p");
    const [readinessBuckets] = (await tableExists("employee_readiness_scores"))
      ? await pool.query(
          `SELECT COALESCE(ers.level, 'Unknown') AS label, COUNT(DISTINCT ers.user_id) AS value
           FROM employee_readiness_scores ers
           JOIN users u ON u.id = ers.user_id
           LEFT JOIN partnerships p ON p.id = u.partnership_id
           WHERE 1=1 ${readinessScope.clause}
           GROUP BY COALESCE(ers.level, 'Unknown')
           ORDER BY value DESC`,
          readinessScope.params
        )
      : [[]];

    const [documentBuckets] = (await tableExists("employee_documents"))
      ? await pool.query(
          `SELECT COALESCE(ed.status, 'unknown') AS label, COUNT(*) AS value
           FROM employee_documents ed
           LEFT JOIN partnerships p ON p.id = ed.partnership_id
           WHERE 1=1 ${scope.clause}
           GROUP BY COALESCE(ed.status, 'unknown')
           ORDER BY value DESC`,
          scope.params
        )
      : [[]];

    return res.json({ status: "success", metrics, readiness_buckets: readinessBuckets, document_buckets: documentBuckets, generated_at: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load report summary", error: error.message });
  }
});

router.get("/employee-engagement", async (req, res) => {
  try {
    if (!reportRoles.includes(req.user.role)) return res.status(403).json({ status: "error", message: "Report access required" });
    const scope = scopeClause(req.user, "p");
    const [rows] = await pool.query(
      `SELECT
        u.id,
        u.full_name,
        u.email,
        e.name AS employer_name,
        p.slug AS partnership_slug,
        COUNT(DISTINCT qs.id) AS quiz_count,
        MAX(qs.submitted_at) AS last_quiz_at,
        MAX(ers.score) AS readiness_score,
        MAX(ers.level) AS readiness_level,
        MAX(ers.priority) AS readiness_priority,
        COUNT(DISTINCT ed.id) AS document_count,
        SUM(CASE WHEN ed.status = 'approved' THEN 1 ELSE 0 END) AS approved_document_count,
        MAX(j.title) AS current_journey,
        MAX(eja.status) AS journey_status
       FROM users u
       LEFT JOIN partnerships p ON p.id = u.partnership_id
       LEFT JOIN employers e ON e.id = p.employer_id
       LEFT JOIN quiz_submissions qs ON qs.user_id = u.id
       LEFT JOIN employee_readiness_scores ers ON ers.user_id = u.id
       LEFT JOIN employee_documents ed ON ed.user_id = u.id
       LEFT JOIN employee_journey_assignments eja ON eja.user_id = u.id AND eja.status = 'active'
       LEFT JOIN journeys j ON j.id = eja.journey_id
       WHERE u.role = 'employee' ${scope.clause}
       GROUP BY u.id, u.full_name, u.email, e.name, p.slug
       ORDER BY last_quiz_at DESC, u.created_at DESC
       LIMIT 300`,
      scope.params
    );
    return res.json({ status: "success", employees: rows });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load employee engagement report", error: error.message });
  }
});

router.get("/exports/:type", async (req, res) => {
  try {
    if (!reportRoles.includes(req.user.role)) return res.status(403).json({ status: "error", message: "Report export access required" });
    const type = String(req.params.type || "").toLowerCase();
    const scope = scopeClause(req.user, "p");

    if (type === "employees") {
      const [rows] = await pool.query(
        `SELECT u.id, u.full_name, u.email, e.name AS employer_name, p.slug AS partnership_slug, u.created_at,
                MAX(ers.score) AS readiness_score, MAX(ers.level) AS readiness_level, MAX(j.title) AS current_journey,
                COUNT(DISTINCT qs.id) AS quiz_submissions, COUNT(DISTINCT ed.id) AS documents_uploaded
         FROM users u
         LEFT JOIN partnerships p ON p.id = u.partnership_id
         LEFT JOIN employers e ON e.id = p.employer_id
         LEFT JOIN employee_readiness_scores ers ON ers.user_id = u.id
         LEFT JOIN employee_journey_assignments eja ON eja.user_id = u.id AND eja.status = 'active'
         LEFT JOIN journeys j ON j.id = eja.journey_id
         LEFT JOIN quiz_submissions qs ON qs.user_id = u.id
         LEFT JOIN employee_documents ed ON ed.user_id = u.id
         WHERE u.role = 'employee' ${scope.clause}
         GROUP BY u.id, u.full_name, u.email, e.name, p.slug, u.created_at
         ORDER BY u.created_at DESC`,
        scope.params
      );
      return sendCsv(req, res, "employees-export", rows);
    }

    if (type === "quiz-submissions") {
      const [rows] = await pool.query(
        `SELECT qs.id, q.title AS quiz_title, COALESCE(qs.full_name, u.full_name) AS employee_name, COALESCE(qs.email, u.email) AS employee_email,
                e.name AS employer_name, p.slug AS partnership_slug, qs.follow_up_status, qs.submitted_at,
                ers.score AS readiness_score, ers.level AS readiness_level, ers.priority AS readiness_priority, j.title AS assigned_journey
         FROM quiz_submissions qs
         LEFT JOIN quizzes q ON q.id = qs.quiz_id
         LEFT JOIN users u ON u.id = qs.user_id
         LEFT JOIN partnerships p ON p.id = qs.partnership_id
         LEFT JOIN employers e ON e.id = p.employer_id
         LEFT JOIN employee_readiness_scores ers ON ers.latest_submission_id = qs.id
         LEFT JOIN employee_journey_assignments eja ON eja.user_id = qs.user_id AND eja.status = 'active'
         LEFT JOIN journeys j ON j.id = eja.journey_id
         WHERE 1=1 ${scope.clause}
         ORDER BY qs.submitted_at DESC`,
        scope.params
      );
      return sendCsv(req, res, "quiz-submissions-export", rows);
    }

    if (type === "documents") {
      const [rows] = await pool.query(
        `SELECT ed.id, u.full_name AS employee_name, u.email AS employee_email, e.name AS employer_name, p.slug AS partnership_slug,
                ed.document_title, ed.original_filename, ed.mime_type, ed.file_size_bytes, ed.status, ed.uploaded_at, ed.reviewed_at, reviewer.full_name AS reviewed_by
         FROM employee_documents ed
         LEFT JOIN users u ON u.id = ed.user_id
         LEFT JOIN users reviewer ON reviewer.id = ed.reviewed_by_user_id
         LEFT JOIN partnerships p ON p.id = ed.partnership_id
         LEFT JOIN employers e ON e.id = p.employer_id
         WHERE 1=1 ${scope.clause}
         ORDER BY ed.uploaded_at DESC`,
        scope.params
      );
      return sendCsv(req, res, "documents-export", rows);
    }

    if (type === "approvals") {
      const [rows] = await pool.query(
        `SELECT ear.id, ear.requested_company_name, e.name AS employer_name, h.name AS team_name, ear.contact_name, ear.contact_email,
                ear.contact_phone, ear.contact_title, ear.approval_status, ear.review_note, ear.requested_at, ear.reviewed_at, ear.approved_at
         FROM employer_approval_requests ear
         LEFT JOIN partnerships p ON p.id = ear.partnership_id
         LEFT JOIN employers e ON e.id = ear.employer_id
         LEFT JOIN home_buying_teams h ON h.id = ear.team_id
         WHERE 1=1 ${scope.clause}
         ORDER BY ear.requested_at DESC`,
        scope.params
      );
      return sendCsv(req, res, "approval-requests-export", rows);
    }

    return res.status(400).json({ status: "error", message: "Unknown export type" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to export report", error: error.message });
  }
});

module.exports = router;
module.exports.ensureReportTables = ensureReportTables;
