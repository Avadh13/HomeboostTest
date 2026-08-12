const express = require("express");
const fs = require("fs");
const csv = require("csv-parser");
const multer = require("multer");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");
const {
  InviteLifecycleError,
  normalizeEmail,
  normalizeName,
  isValidEmail,
  createOrRefreshEmployeeInvite,
  listPublicInvitesForPartnership,
  revokePendingBatchInvites,
} = require("../services/inviteLifecycleService");

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
      [partnershipId],
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
      [partnershipId],
    );

    const invites = await listPublicInvitesForPartnership(pool, partnershipId);

    const [batches] = await pool.query(
      `SELECT id, partnership_id, original_filename, created_count, skipped_count, status, created_at, revoked_at
       FROM enrollment_batches
       WHERE partnership_id = ?
       ORDER BY id DESC`,
      [partnershipId],
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
      [partnershipId],
    );

    return res.json({
      status: "success",
      partnership,
      employees,
      invites,
      batches,
      submissions,
      stats: {
        employees: employees.length,
        invited: invites.filter((item) => item.status === "invited").length,
        registered: invites.filter((item) => item.status === "registered").length,
        revoked: invites.filter((item) => item.status === "revoked").length,
        quiz_submissions: submissions.length,
      },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load employer dashboard" });
  }
});

router.post("/invites", protect, requireCompanyManager, async (req, res) => {
  const connection = await pool.getConnection();
  let transactionStarted = false;
  try {
    const partnershipId = Number(req.user.partnership_id);
    const fullName = normalizeName(req.body.full_name || req.body.name);
    const email = normalizeEmail(req.body.email);

    if (!fullName || !isValidEmail(email)) {
      return res.status(400).json({ status: "error", message: "Valid full name and email are required" });
    }

    await connection.beginTransaction();
    transactionStarted = true;
    const result = await createOrRefreshEmployeeInvite(connection, {
      partnershipId,
      invitedByUserId: req.user.id,
      fullName,
      email,
      expiresDays: 14,
    });
    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      status: "success",
      message: "Employee invitation created",
      invite: result.invite,
      delivery: result.delivery,
    });
  } catch (error) {
    if (transactionStarted) await connection.rollback();
    if (error instanceof InviteLifecycleError) {
      return res.status(error.statusCode).json({ status: "error", code: error.code, message: error.message });
    }
    return res.status(500).json({ status: "error", message: "Failed to add employee invite" });
  } finally {
    connection.release();
  }
});

router.post("/invites/upload", protect, requireCompanyManager, upload.single("file"), async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    if (!req.file) return res.status(400).json({ status: "error", message: "CSV file is required" });

    const rows = await readCsvRows(req.file.path);
    if (rows.length === 0) {
      removeUploadedFile(req.file.path);
      return res.status(400).json({ status: "error", message: "CSV file is empty. Required headers: full_name,email" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const partnershipId = Number(req.user.partnership_id);
    const [[partnership]] = await connection.query(
      "SELECT id, status FROM partnerships WHERE id = ? LIMIT 1 FOR UPDATE",
      [partnershipId],
    );
    if (!partnership || partnership.status !== "active") {
      await connection.rollback();
      transactionStarted = false;
      removeUploadedFile(req.file.path);
      return res.status(409).json({ status: "error", message: "Employer portal is not active" });
    }

    const [batchResult] = await connection.query(
      `INSERT INTO enrollment_batches (partnership_id, uploaded_by_user_id, original_filename)
       VALUES (?, ?, ?)`,
      [partnershipId, req.user.id, req.file.originalname],
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
        skipped += 1;
        errors.push({ row_number: rowNumber, email, reason: "Missing full_name or email" });
        continue;
      }
      if (!isValidEmail(email)) {
        skipped += 1;
        errors.push({ row_number: rowNumber, email, reason: "Invalid email format" });
        continue;
      }
      if (seenEmails.has(email)) {
        skipped += 1;
        errors.push({ row_number: rowNumber, email, reason: "Duplicate email inside this CSV" });
        continue;
      }
      seenEmails.add(email);

      try {
        const result = await createOrRefreshEmployeeInvite(connection, {
          partnershipId,
          enrollmentBatchId: batchId,
          invitedByUserId: req.user.id,
          fullName,
          email,
          expiresDays: 14,
        });
        invited += 1;
        invitedEmployees.push({
          ...result.invite,
          invite_link: result.delivery.invite_link,
          invite_code: result.delivery.invite_code,
        });
      } catch (error) {
        if (!(error instanceof InviteLifecycleError)) throw error;
        skipped += 1;
        errors.push({ row_number: rowNumber, email, reason: error.message });
      }
    }

    await connection.query(
      `UPDATE enrollment_batches SET created_count = ?, skipped_count = ? WHERE id = ?`,
      [invited, skipped, batchId],
    );
    await connection.commit();
    transactionStarted = false;
    removeUploadedFile(req.file.path);

    return res.json({
      status: "success",
      message: "Employee invitations created",
      batch_id: batchId,
      invited,
      skipped,
      invited_employees: invitedEmployees,
      errors,
    });
  } catch (error) {
    if (connection && transactionStarted) await connection.rollback();
    if (req.file?.path) removeUploadedFile(req.file.path);
    return res.status(500).json({ status: "error", message: "CSV invite upload failed" });
  } finally {
    if (connection) connection.release();
  }
});

router.put("/batches/:batchId/revoke", protect, requireCompanyManager, async (req, res) => {
  let connection;
  let transactionStarted = false;

  try {
    const partnershipId = Number(req.user.partnership_id);
    const { batchId } = req.params;

    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [batches] = await connection.query(
      `SELECT id, status FROM enrollment_batches WHERE id = ? AND partnership_id = ? LIMIT 1 FOR UPDATE`,
      [batchId, partnershipId],
    );
    if (batches.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(404).json({ status: "error", message: "Batch not found for this employer" });
    }
    if (batches[0].status === "revoked") {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({ status: "error", message: "Batch is already revoked" });
    }

    const revokedInvites = await revokePendingBatchInvites(connection, { batchId, partnershipId });
    await connection.query(
      `UPDATE enrollment_batches SET status = 'revoked', revoked_at = NOW() WHERE id = ? AND partnership_id = ?`,
      [batchId, partnershipId],
    );
    await connection.commit();
    transactionStarted = false;

    return res.json({
      status: "success",
      message: "Batch revoked. Registered employee accounts were preserved.",
      revoked_invites: revokedInvites,
      deleted_employees: 0,
    });
  } catch (error) {
    if (connection && transactionStarted) await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to revoke batch" });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;
