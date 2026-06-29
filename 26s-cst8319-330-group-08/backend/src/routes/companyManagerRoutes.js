const express = require("express");
const fs = require("fs");
const csv = require("csv-parser");
const multer = require("multer");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
const uploadDir = "uploads/csv/";
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const isCsv =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.toLowerCase().endsWith(".csv");

    if (!isCsv) return callback(new Error("Only .csv files are allowed"));
    return callback(null, true);
  },
});

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizeName = (value) => String(value || "").trim();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const removeUploadedFile = (filePath) => filePath && fs.unlink(filePath, () => {});

const readCsvRows = (filePath) =>
  new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("error", reject)
      .on("end", () => resolve(rows));
  });

const requireCompanyManager = (req, res, next) => {
  if (!req.user || (req.user.role !== "company_admin" && req.user.role !== "company")) {
    return res.status(403).json({ status: "error", message: "Employer manager access required" });
  }

  if (!req.user.partnership_id) {
    return res.status(400).json({ status: "error", message: "Employer manager account is not linked to a partnership" });
  }

  next();
};

router.get("/dashboard", protect, requireCompanyManager, async (req, res) => {
  try {
    const partnershipId = req.user.partnership_id;

    const [[partnership]] = await pool.query(
      `SELECT
        p.id,
        p.slug,
        p.status,
        e.name AS employer_name,
        e.logo_url,
        e.website,
        e.phone,
        e.contact_email,
        e.brand_primary_color,
        e.brand_secondary_color,
        h.name AS hbt_name,
        h.email AS hbt_email,
        h.phone AS hbt_phone,
        h.website AS hbt_website
       FROM partnerships p
       JOIN employers e ON p.employer_id = e.id
       JOIN home_buying_teams h ON p.team_id = h.id
       WHERE p.id = ?
       LIMIT 1`,
      [partnershipId]
    );

    if (!partnership) {
      return res.status(404).json({ status: "error", message: "Partnership not found" });
    }

    const [employees] = await pool.query(
      `SELECT id, full_name, email, is_active, created_at
       FROM users
       WHERE role = 'employee'
       AND partnership_id = ?
       ORDER BY created_at DESC`,
      [partnershipId]
    );

    const [invites] = await pool.query(
      `SELECT id, full_name, email, status, created_at, registered_at, revoked_at
       FROM employee_invites
       WHERE partnership_id = ?
       ORDER BY id DESC`,
      [partnershipId]
    );

    const [batches] = await pool.query(
      `SELECT id, partnership_id, original_filename, created_count, skipped_count, status, created_at, revoked_at
       FROM enrollment_batches
       WHERE partnership_id = ?
       ORDER BY id DESC`,
      [partnershipId]
    );

    const [submissions] = await pool.query(
      `SELECT
        qs.id,
        qs.quiz_id,
        qs.user_id,
        qs.submitted_at,
        COALESCE(qs.follow_up_status, 'new') AS follow_up_status,
        q.title AS quiz_title,
        COALESCE(qs.full_name, u.full_name, 'Employee') AS employee_name,
        COALESCE(qs.email, u.email, '') AS employee_email
       FROM quiz_submissions qs
       LEFT JOIN quizzes q ON qs.quiz_id = q.id
       LEFT JOIN users u ON qs.user_id = u.id
       WHERE qs.partnership_id = ?
       ORDER BY qs.id DESC
       LIMIT 50`,
      [partnershipId]
    );

    const [appointments] = await pool.query(
      `SELECT
        a.id,
        a.topic,
        a.preferred_date,
        a.status,
        a.created_at,
        u.full_name AS employee_name,
        u.email AS employee_email,
        tm.full_name AS team_member_name
       FROM appointments a
       LEFT JOIN users u ON a.employee_user_id = u.id
       LEFT JOIN team_members tm ON a.team_member_id = tm.id
       WHERE a.partnership_id = ?
       ORDER BY a.created_at DESC
       LIMIT 50`,
      [partnershipId]
    );

    res.json({
      status: "success",
      partnership,
      employees,
      invites,
      batches,
      submissions,
      appointments,
      stats: {
        employees: employees.length,
        invited: invites.filter((item) => item.status === "invited").length,
        registered: invites.filter((item) => item.status === "registered").length,
        revoked: invites.filter((item) => item.status === "revoked").length,
        quiz_submissions: submissions.length,
        pending_appointments: appointments.filter((item) => item.status === "pending").length,
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to load employer dashboard", error: error.message });
  }
});

router.post("/invites", protect, requireCompanyManager, async (req, res) => {
  try {
    const partnershipId = req.user.partnership_id;
    const fullName = normalizeName(req.body.full_name || req.body.name);
    const email = normalizeEmail(req.body.email);

    if (!fullName || !email) {
      return res.status(400).json({ status: "error", message: "Full name and email are required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ status: "error", message: "Please enter a valid email address" });
    }

    const [existingUser] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (existingUser.length > 0) {
      return res.status(409).json({ status: "error", message: "This email already has an account" });
    }

    await pool.query(
      `INSERT INTO employee_invites
       (partnership_id, invited_by_user_id, full_name, email, status)
       VALUES (?, ?, ?, ?, 'invited')
       ON DUPLICATE KEY UPDATE
         full_name = VALUES(full_name),
         invited_by_user_id = VALUES(invited_by_user_id),
         status = IF(status = 'registered', 'registered', 'invited'),
         revoked_at = NULL`,
      [partnershipId, req.user.id, fullName, email]
    );

    const [[invite]] = await pool.query(
      `SELECT id, full_name, email, status, created_at, registered_at, revoked_at
       FROM employee_invites
       WHERE partnership_id = ? AND email = ?
       LIMIT 1`,
      [partnershipId, email]
    );

    return res.status(201).json({
      status: "success",
      message: invite.status === "registered" ? "Employee is already registered" : "Employee invite added successfully",
      invite,
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to add employee invite", error: error.message });
  }
});

router.post("/invites/upload", protect, requireCompanyManager, upload.single("file"), async (req, res) => {
  let connection;

  try {
    if (!req.file) {
      return res.status(400).json({ status: "error", message: "CSV file is required" });
    }

    const rows = await readCsvRows(req.file.path);
    if (rows.length === 0) {
      removeUploadedFile(req.file.path);
      return res.status(400).json({ status: "error", message: "CSV file is empty. Required headers: full_name,email" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const partnershipId = req.user.partnership_id;

    const [batchResult] = await connection.query(
      `INSERT INTO enrollment_batches (partnership_id, uploaded_by_user_id, original_filename)
       VALUES (?, ?, ?)`,
      [partnershipId, req.user.id, req.file.originalname]
    );

    const batchId = batchResult.insertId;
    const seenEmails = new Set();
    const errors = [];
    const invitedEmployees = [];
    let invited = 0;
    let skipped = 0;

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2;
      const fullName = normalizeName(row.full_name || row.name || row.FullName || row["Full Name"]);
      const email = normalizeEmail(row.email || row.Email);

      if (!fullName || !email) {
        skipped++;
        errors.push({ row_number: rowNumber, email, reason: "Missing full_name or email" });
        continue;
      }

      if (!isValidEmail(email)) {
        skipped++;
        errors.push({ row_number: rowNumber, email, reason: "Invalid email format" });
        continue;
      }

      if (seenEmails.has(email)) {
        skipped++;
        errors.push({ row_number: rowNumber, email, reason: "Duplicate email inside this CSV" });
        continue;
      }

      seenEmails.add(email);

      const [existingUser] = await connection.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
      if (existingUser.length > 0) {
        skipped++;
        errors.push({ row_number: rowNumber, email, reason: "Email already has an account" });
        continue;
      }

      await connection.query(
        `INSERT INTO employee_invites
         (partnership_id, enrollment_batch_id, invited_by_user_id, full_name, email, status)
         VALUES (?, ?, ?, ?, ?, 'invited')
         ON DUPLICATE KEY UPDATE
           full_name = VALUES(full_name),
           enrollment_batch_id = VALUES(enrollment_batch_id),
           invited_by_user_id = VALUES(invited_by_user_id),
           status = IF(status = 'registered', 'registered', 'invited'),
           revoked_at = NULL`,
        [partnershipId, batchId, req.user.id, fullName, email]
      );

      invited++;
      invitedEmployees.push({ full_name: fullName, email });
    }

    await connection.query(
      `UPDATE enrollment_batches SET created_count = ?, skipped_count = ? WHERE id = ?`,
      [invited, skipped, batchId]
    );

    await connection.commit();
    removeUploadedFile(req.file.path);

    res.json({ status: "success", message: "Employee invite list uploaded", batch_id: batchId, invited, skipped, invited_employees: invitedEmployees, errors });
  } catch (error) {
    if (connection) await connection.rollback();
    if (req.file?.path) removeUploadedFile(req.file.path);
    res.status(500).json({ status: "error", message: "CSV invite upload failed", error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

router.put("/batches/:batchId/revoke", protect, requireCompanyManager, async (req, res) => {
  let connection;

  try {
    const partnershipId = req.user.partnership_id;
    const { batchId } = req.params;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [batches] = await connection.query(
      `SELECT id, status FROM enrollment_batches WHERE id = ? AND partnership_id = ? LIMIT 1`,
      [batchId, partnershipId]
    );

    if (batches.length === 0) {
      await connection.rollback();
      return res.status(404).json({ status: "error", message: "Batch not found for this employer" });
    }

    const [result] = await connection.query(
      `UPDATE employee_invites
       SET status = 'revoked', revoked_at = NOW()
       WHERE enrollment_batch_id = ?
       AND partnership_id = ?
       AND status = 'invited'`,
      [batchId, partnershipId]
    );

    await connection.query(`UPDATE enrollment_batches SET status = 'revoked', revoked_at = NOW() WHERE id = ?`, [batchId]);
    await connection.commit();

    res.json({ status: "success", message: "Batch revoked", revoked_invites: result.affectedRows });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ status: "error", message: "Failed to revoke batch", error: error.message });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
