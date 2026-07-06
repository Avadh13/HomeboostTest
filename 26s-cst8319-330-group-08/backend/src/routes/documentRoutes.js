const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const hbtRoles = ["hbt_admin", "hbt_member"];
const isAdmin = (user) => adminRoles.includes(user?.role);
const isHbt = (user) => hbtRoles.includes(user?.role);
const isEmployee = (user) => user?.role === "employee";
const text = (value, max = 255) => String(value || "").trim().slice(0, max);

const ensureDocumentTables = async (connection = pool) => {
  await connection.query(`CREATE TABLE IF NOT EXISTS document_checklist_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NULL,
    document_key VARCHAR(120) NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    is_required TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_document_templates_team (team_id),
    INDEX idx_document_templates_active (is_active)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS employee_documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    partnership_id INT NULL,
    template_id INT NULL,
    document_title VARCHAR(180) NOT NULL,
    original_filename VARCHAR(255) NULL,
    status VARCHAR(40) DEFAULT 'uploaded',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by_user_id INT NULL,
    reviewed_at DATETIME NULL,
    review_note TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employee_documents_user (user_id),
    INDEX idx_employee_documents_partnership (partnership_id),
    INDEX idx_employee_documents_template (template_id),
    INDEX idx_employee_documents_status (status)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS document_review_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    author_user_id INT NOT NULL,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_document_notes_document (document_id)
  )`);

  const [[count]] = await connection.query("SELECT COUNT(*) AS total FROM document_checklist_templates WHERE team_id IS NULL");
  if (Number(count.total || 0) === 0) {
    const defaults = [
      ["required_1", "Required document 1", "Add the requested document for review.", 1, 1],
      ["required_2", "Required document 2", "Add the requested document for review.", 1, 2],
      ["required_3", "Required document 3", "Add the requested document for review.", 1, 3],
      ["optional_1", "Optional supporting document", "Add this only if requested by your advisor.", 0, 4]
    ];
    for (const row of defaults) {
      await connection.query(
        `INSERT INTO document_checklist_templates (team_id, document_key, title, description, is_required, sort_order)
         VALUES (NULL, ?, ?, ?, ?, ?)`,
        row
      );
    }
  }
};

const teamForPartnership = async (partnershipId) => {
  const [[row]] = await pool.query("SELECT team_id FROM partnerships WHERE id = ? LIMIT 1", [partnershipId]);
  return row?.team_id || null;
};

const employeeById = async (employeeId) => {
  const [[employee]] = await pool.query("SELECT id, full_name, email, partnership_id FROM users WHERE id = ? AND role = 'employee' LIMIT 1", [employeeId]);
  return employee || null;
};

const canAccessEmployee = async (user, employee) => {
  if (!user || !employee) return false;
  if (isAdmin(user)) return true;
  if (isEmployee(user)) return Number(user.id) === Number(employee.id);
  if (isHbt(user)) return Number(await teamForPartnership(employee.partnership_id)) === Number(user.team_id);
  return false;
};

const buildChecklist = async (employee) => {
  const teamId = await teamForPartnership(employee.partnership_id);
  const [templates] = await pool.query(
    `SELECT * FROM document_checklist_templates WHERE is_active = 1 AND (team_id IS NULL OR team_id = ?) ORDER BY sort_order ASC, id ASC`,
    [teamId]
  );
  const [documents] = await pool.query(
    `SELECT * FROM employee_documents WHERE user_id = ? ORDER BY uploaded_at DESC, id DESC`,
    [employee.id]
  );
  const latestByTemplate = new Map();
  documents.forEach((doc) => {
    if (doc.template_id && !latestByTemplate.has(Number(doc.template_id))) latestByTemplate.set(Number(doc.template_id), doc);
  });
  const checklist = templates.map((template) => ({ ...template, document: latestByTemplate.get(Number(template.id)) || null, status: latestByTemplate.get(Number(template.id))?.status || "not_uploaded" }));
  const required = checklist.filter((item) => Number(item.is_required) === 1);
  const requiredCount = required.length || checklist.length || 1;
  const requiredUploaded = required.filter((item) => item.document).length;
  return { employee, checklist, documents, progress: { uploaded_count: checklist.filter((item) => item.document).length, approved_count: checklist.filter((item) => item.status === "approved").length, required_count: requiredCount, required_uploaded: requiredUploaded, percent: Math.round((requiredUploaded / requiredCount) * 100) } };
};

router.use(protect);

router.get("/checklist", async (req, res) => {
  try {
    await ensureDocumentTables();
    const employeeId = isEmployee(req.user) ? req.user.id : Number(req.query.employee_id || req.user.id);
    const employee = await employeeById(employeeId);
    if (!employee) return res.status(404).json({ status: "error", message: "Employee not found" });
    if (!(await canAccessEmployee(req.user, employee))) return res.status(403).json({ status: "error", message: "Not allowed to view this checklist" });
    return res.json({ status: "success", ...(await buildChecklist(employee)) });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load document checklist", error: error.message });
  }
});

router.get("/review-queue", async (req, res) => {
  try {
    await ensureDocumentTables();
    if (!isAdmin(req.user) && !isHbt(req.user)) return res.status(403).json({ status: "error", message: "Admin or HBT access required" });
    const params = [];
    let teamClause = "";
    if (isHbt(req.user)) {
      teamClause = "AND p.team_id = ?";
      params.push(req.user.team_id);
    }
    const [documents] = await pool.query(
      `SELECT ed.id, ed.user_id, ed.partnership_id, ed.template_id, ed.document_title, ed.original_filename, ed.status, ed.uploaded_at, ed.review_note, u.full_name AS employee_name, u.email AS employee_email, e.name AS employer_name
       FROM employee_documents ed
       JOIN users u ON u.id = ed.user_id
       LEFT JOIN partnerships p ON p.id = ed.partnership_id
       LEFT JOIN employers e ON e.id = p.employer_id
       WHERE ed.status IN ('uploaded', 'under_review', 'needs_correction') ${teamClause}
       ORDER BY ed.uploaded_at DESC
       LIMIT 100`,
      params
    );
    return res.json({ status: "success", documents });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load document review queue", error: error.message });
  }
});

router.post("/upload", async (req, res) => {
  try {
    await ensureDocumentTables();
    if (!isEmployee(req.user)) return res.status(403).json({ status: "error", message: "Employee access required" });
    const templateId = Number(req.body.template_id) || null;
    let title = text(req.body.document_title, 180) || "Submitted document";
    if (templateId) {
      const [[template]] = await pool.query("SELECT title FROM document_checklist_templates WHERE id = ? LIMIT 1", [templateId]);
      title = template?.title || title;
    }
    const filename = text(req.body.original_filename || `${title}.pdf`, 255);
    const [result] = await pool.query(
      `INSERT INTO employee_documents (user_id, partnership_id, template_id, document_title, original_filename, status) VALUES (?, ?, ?, ?, ?, 'uploaded')`,
      [req.user.id, req.user.partnership_id || null, templateId, title, filename]
    );
    return res.status(201).json({ status: "success", message: "Document submitted", document_id: result.insertId });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to submit document", error: error.message });
  }
});

router.put("/:id/status", async (req, res) => {
  try {
    await ensureDocumentTables();
    if (!isAdmin(req.user) && !isHbt(req.user)) return res.status(403).json({ status: "error", message: "Admin or HBT access required" });
    const allowed = new Set(["uploaded", "under_review", "needs_correction", "approved", "rejected"]);
    const status = text(req.body.status, 40);
    if (!allowed.has(status)) return res.status(400).json({ status: "error", message: "Invalid document status" });
    const [[document]] = await pool.query("SELECT * FROM employee_documents WHERE id = ? LIMIT 1", [req.params.id]);
    if (!document) return res.status(404).json({ status: "error", message: "Document not found" });
    const employee = await employeeById(document.user_id);
    if (!(await canAccessEmployee(req.user, employee))) return res.status(403).json({ status: "error", message: "Not allowed to review this document" });
    const note = text(req.body.review_note, 1000) || null;
    await pool.query(`UPDATE employee_documents SET status = ?, review_note = ?, reviewed_by_user_id = ?, reviewed_at = NOW() WHERE id = ?`, [status, note, req.user.id, req.params.id]);
    if (note) await pool.query("INSERT INTO document_review_notes (document_id, author_user_id, note_text) VALUES (?, ?, ?)", [req.params.id, req.user.id, note]);
    return res.json({ status: "success", message: "Document status updated" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update document status", error: error.message });
  }
});

module.exports = router;
module.exports.ensureDocumentTables = ensureDocumentTables;
