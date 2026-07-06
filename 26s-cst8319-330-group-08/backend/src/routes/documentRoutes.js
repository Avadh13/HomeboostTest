const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const hbtRoles = ["hbt_admin", "hbt_member"];
const isAdmin = (user) => adminRoles.includes(user?.role);
const isHbt = (user) => hbtRoles.includes(user?.role);
const isEmployee = (user) => user?.role === "employee";
const text = (value, max = 255) => String(value || "").trim().slice(0, max);
const storageDir = path.resolve(process.env.DOCUMENT_STORAGE_DIR || path.join(__dirname, "..", "..", "private-documents"));
fs.mkdirSync(storageDir, { recursive: true });

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, storageDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".bin";
      cb(null, `${Date.now()}-${crypto.randomBytes(16).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: Number(process.env.DOCUMENT_MAX_BYTES || 10 * 1024 * 1024) },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) return cb(new Error("Only PDF, image, Word, and DOCX files are allowed"));
    cb(null, true);
  },
});

const columnExists = async (connection, tableName, columnName) => {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [tableName, columnName]
  );
  return rows.length > 0;
};

const addColumnIfMissing = async (connection, tableName, columnName, definition) => {
  if (!(await columnExists(connection, tableName, columnName))) await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
};

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
    stored_filename VARCHAR(255) NULL,
    stored_path VARCHAR(700) NULL,
    mime_type VARCHAR(120) NULL,
    file_size_bytes INT NULL,
    storage_provider VARCHAR(60) DEFAULT 'private_disk',
    file_sha256 VARCHAR(128) NULL,
    uploaded_by_ip VARCHAR(80) NULL,
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

  await addColumnIfMissing(connection, "employee_documents", "stored_filename", "VARCHAR(255) NULL");
  await addColumnIfMissing(connection, "employee_documents", "stored_path", "VARCHAR(700) NULL");
  await addColumnIfMissing(connection, "employee_documents", "mime_type", "VARCHAR(120) NULL");
  await addColumnIfMissing(connection, "employee_documents", "file_size_bytes", "INT NULL");
  await addColumnIfMissing(connection, "employee_documents", "storage_provider", "VARCHAR(60) DEFAULT 'private_disk'");
  await addColumnIfMissing(connection, "employee_documents", "file_sha256", "VARCHAR(128) NULL");
  await addColumnIfMissing(connection, "employee_documents", "uploaded_by_ip", "VARCHAR(80) NULL");

  await connection.query(`CREATE TABLE IF NOT EXISTS document_review_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    author_user_id INT NOT NULL,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_document_notes_document (document_id)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS document_access_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    document_id INT NOT NULL,
    actor_user_id INT NULL,
    action VARCHAR(80) NOT NULL,
    ip_address VARCHAR(80) NULL,
    user_agent VARCHAR(500) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_document_access_document (document_id),
    INDEX idx_document_access_actor (actor_user_id),
    INDEX idx_document_access_action (action)
  )`);

  const [[count]] = await connection.query("SELECT COUNT(*) AS total FROM document_checklist_templates WHERE team_id IS NULL");
  if (Number(count.total || 0) === 0) {
    const defaults = [
      ["government_id", "Government ID", "Upload a clear image or PDF of accepted identification.", 1, 1],
      ["income_document", "Income document", "Upload recent pay stub, employment letter, or income proof requested by your advisor.", 1, 2],
      ["savings_document", "Savings / down payment proof", "Upload bank or savings evidence when requested.", 1, 3],
      ["optional_support", "Optional supporting document", "Upload this only if requested by your advisor.", 0, 4],
    ];
    for (const row of defaults) {
      await connection.query(
        `INSERT INTO document_checklist_templates (team_id, document_key, title, description, is_required, sort_order) VALUES (NULL, ?, ?, ?, ?, ?)`,
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

const logDocumentAccess = async (req, documentId, action) => {
  await pool.query(
    "INSERT INTO document_access_logs (document_id, actor_user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
    [documentId, req.user?.id || null, action, text(req.ip, 80) || null, text(req.get("user-agent"), 500) || null]
  );
};

const fileHash = (filePath) => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");

const buildChecklist = async (employee) => {
  const teamId = await teamForPartnership(employee.partnership_id);
  const [templates] = await pool.query(
    `SELECT * FROM document_checklist_templates WHERE is_active = 1 AND (team_id IS NULL OR team_id = ?) ORDER BY sort_order ASC, id ASC`,
    [teamId]
  );
  const [documents] = await pool.query("SELECT * FROM employee_documents WHERE user_id = ? ORDER BY uploaded_at DESC, id DESC", [employee.id]);
  const latestByTemplate = new Map();
  documents.forEach((doc) => { if (doc.template_id && !latestByTemplate.has(Number(doc.template_id))) latestByTemplate.set(Number(doc.template_id), doc); });
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
    if (isHbt(req.user)) { teamClause = "AND p.team_id = ?"; params.push(req.user.team_id); }
    const [documents] = await pool.query(
      `SELECT ed.id, ed.user_id, ed.partnership_id, ed.template_id, ed.document_title, ed.original_filename, ed.mime_type, ed.file_size_bytes, ed.status, ed.uploaded_at, ed.review_note, u.full_name AS employee_name, u.email AS employee_email, e.name AS employer_name
       FROM employee_documents ed
       JOIN users u ON u.id = ed.user_id
       LEFT JOIN partnerships p ON p.id = ed.partnership_id
       LEFT JOIN employers e ON e.id = p.employer_id
       WHERE ed.status IN ('uploaded', 'under_review', 'needs_correction') ${teamClause}
       ORDER BY ed.uploaded_at DESC LIMIT 100`,
      params
    );
    return res.json({ status: "success", documents });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load document review queue", error: error.message });
  }
});

router.post("/upload", upload.single("file"), async (req, res) => {
  let savedPath = req.file?.path;
  try {
    await ensureDocumentTables();
    if (!isEmployee(req.user)) return res.status(403).json({ status: "error", message: "Employee access required" });
    const templateId = Number(req.body.template_id) || null;
    let title = text(req.body.document_title, 180) || "Submitted document";
    if (templateId) {
      const [[template]] = await pool.query("SELECT title FROM document_checklist_templates WHERE id = ? LIMIT 1", [templateId]);
      title = template?.title || title;
    }

    const originalName = text(req.file?.originalname || req.body.original_filename || `${title}.pdf`, 255);
    const storedFilename = req.file?.filename || null;
    const hash = savedPath ? fileHash(savedPath) : null;
    const [result] = await pool.query(
      `INSERT INTO employee_documents
       (user_id, partnership_id, template_id, document_title, original_filename, stored_filename, stored_path, mime_type, file_size_bytes, storage_provider, file_sha256, uploaded_by_ip, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'private_disk', ?, ?, 'uploaded')`,
      [req.user.id, req.user.partnership_id || null, templateId, title, originalName, storedFilename, savedPath || null, req.file?.mimetype || null, req.file?.size || null, hash, text(req.ip, 80) || null]
    );
    await logDocumentAccess(req, result.insertId, savedPath ? "uploaded_file" : "submitted_metadata");
    savedPath = null;
    return res.status(201).json({ status: "success", message: savedPath ? "Document uploaded" : "Document submitted", document_id: result.insertId });
  } catch (error) {
    if (savedPath && fs.existsSync(savedPath)) fs.unlinkSync(savedPath);
    return res.status(500).json({ status: "error", message: "Failed to upload document", error: error.message });
  }
});

router.get("/:id/download", async (req, res) => {
  try {
    await ensureDocumentTables();
    const [[document]] = await pool.query("SELECT * FROM employee_documents WHERE id = ? LIMIT 1", [req.params.id]);
    if (!document) return res.status(404).json({ status: "error", message: "Document not found" });
    const employee = await employeeById(document.user_id);
    if (!(await canAccessEmployee(req.user, employee))) return res.status(403).json({ status: "error", message: "Not allowed to download this document" });
    if (!document.stored_path || !fs.existsSync(document.stored_path)) return res.status(404).json({ status: "error", message: "Stored file not available" });
    await logDocumentAccess(req, document.id, "downloaded");
    return res.download(document.stored_path, document.original_filename || document.stored_filename || `document-${document.id}`);
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to download document", error: error.message });
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
    await pool.query("UPDATE employee_documents SET status = ?, review_note = ?, reviewed_by_user_id = ?, reviewed_at = NOW() WHERE id = ?", [status, note, req.user.id, req.params.id]);
    if (note) await pool.query("INSERT INTO document_review_notes (document_id, author_user_id, note_text) VALUES (?, ?, ?)", [req.params.id, req.user.id, note]);
    await logDocumentAccess(req, document.id, `status_${status}`);
    return res.json({ status: "success", message: "Document status updated" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update document status", error: error.message });
  }
});

module.exports = router;
module.exports.ensureDocumentTables = ensureDocumentTables;
