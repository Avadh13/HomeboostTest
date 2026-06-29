const fs = require("fs");
const csv = require("csv-parser");
const pool = require("../config/db");

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizeName = (value) => String(value || "").trim();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const readCsvRows = (filePath) =>
  new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("error", reject)
      .on("end", () => resolve(rows));
  });

const removeUploadedFile = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, () => {});
};

exports.uploadEmployeesCsv = async (req, res) => {
  let connection;

  try {
    const user = req.user;
    const { partnershipId } = req.params;

    if (!req.file) {
      return res.status(400).json({ status: "error", message: "CSV file is required" });
    }

    if (!user || user.role !== "hbt_admin") {
      removeUploadedFile(req.file.path);
      return res.status(403).json({ status: "error", message: "Only HBT admins can upload employees" });
    }

    const rows = await readCsvRows(req.file.path);

    if (rows.length === 0) {
      removeUploadedFile(req.file.path);
      return res.status(400).json({ status: "error", message: "CSV file is empty. Required headers: full_name,email" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [partnerships] = await connection.query(
      `SELECT id, team_id, slug
       FROM partnerships
       WHERE id = ? AND team_id = ? AND status = 'active'
       LIMIT 1`,
      [partnershipId, user.team_id]
    );

    if (partnerships.length === 0) {
      await connection.rollback();
      removeUploadedFile(req.file.path);
      return res.status(403).json({ status: "error", message: "Partnership not found or not assigned to your team" });
    }

    const partnership = partnerships[0];

    const [batchResult] = await connection.query(
      `INSERT INTO enrollment_batches
       (partnership_id, uploaded_by_user_id, original_filename)
       VALUES (?, ?, ?)`,
      [partnershipId, user.id, req.file.originalname]
    );

    const batchId = batchResult.insertId;
    let invited = 0;
    let skipped = 0;
    const errors = [];
    const seenEmails = new Set();
    const invitedEmployees = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const fullName = normalizeName(row.full_name || row.name || row.FullName || row["Full Name"]);
      const email = normalizeEmail(row.email || row.Email);
      const rowNumber = index + 2;

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
        [partnershipId, batchId, user.id, fullName, email]
      );

      invited++;
      invitedEmployees.push({
        full_name: fullName,
        email,
        signup_url: `/signup?partnership=${partnership.slug}`,
      });
    }

    await connection.query(
      `UPDATE enrollment_batches
       SET created_count = ?, skipped_count = ?
       WHERE id = ?`,
      [invited, skipped, batchId]
    );

    await connection.commit();
    removeUploadedFile(req.file.path);

    return res.json({
      status: "success",
      message: "CSV invite list completed",
      batch_id: batchId,
      invited,
      created: invited,
      skipped,
      signup_rule: "Employees can register only when their email exists in the approved invite list for this partnership.",
      invited_employees: invitedEmployees,
      errors,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    if (req.file?.path) removeUploadedFile(req.file.path);

    return res.status(500).json({
      status: "error",
      message: "CSV invite upload failed",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

exports.getEnrollmentBatches = async (req, res) => {
  try {
    const user = req.user;

    if (!user || user.role !== "hbt_admin") {
      return res.status(403).json({ status: "error", message: "Only HBT admins can view enrollment batches" });
    }

    const [batches] = await pool.query(
      `SELECT 
        eb.id,
        eb.partnership_id,
        eb.original_filename,
        eb.created_count,
        eb.skipped_count,
        eb.status,
        eb.created_at,
        eb.revoked_at,
        e.name AS employer_name,
        p.slug
       FROM enrollment_batches eb
       JOIN partnerships p ON eb.partnership_id = p.id
       JOIN employers e ON p.employer_id = e.id
       WHERE p.team_id = ?
       ORDER BY eb.id DESC`,
      [user.team_id]
    );

    return res.json(batches);
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load enrollment batches", error: error.message });
  }
};

exports.revokeEnrollmentBatch = async (req, res) => {
  let connection;

  try {
    const user = req.user;
    const { batchId } = req.params;

    if (!user || user.role !== "hbt_admin") {
      return res.status(403).json({ status: "error", message: "Only HBT admins can revoke enrollment batches" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [batches] = await connection.query(
      `SELECT eb.id, eb.status
       FROM enrollment_batches eb
       JOIN partnerships p ON eb.partnership_id = p.id
       WHERE eb.id = ? AND p.team_id = ?
       LIMIT 1`,
      [batchId, user.team_id]
    );

    if (batches.length === 0) {
      await connection.rollback();
      return res.status(404).json({ status: "error", message: "Batch not found or not assigned to your team" });
    }

    if (batches[0].status === "revoked") {
      await connection.rollback();
      return res.status(400).json({ status: "error", message: "Batch is already revoked" });
    }

    const [revokeInvitesResult] = await connection.query(
      `UPDATE employee_invites
       SET status = 'revoked', revoked_at = NOW()
       WHERE enrollment_batch_id = ?
       AND status = 'invited'`,
      [batchId]
    );

    const [deleteOldUsersResult] = await connection.query(
      `DELETE FROM users
       WHERE enrollment_batch_id = ?
       AND role = 'employee'`,
      [batchId]
    );

    await connection.query(
      `UPDATE enrollment_batches
       SET status = 'revoked', revoked_at = NOW()
       WHERE id = ?`,
      [batchId]
    );

    await connection.commit();

    return res.json({
      status: "success",
      message: "Enrollment batch revoked successfully",
      revoked_invites: revokeInvitesResult.affectedRows,
      deleted_employees: deleteOldUsersResult.affectedRows,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to revoke enrollment batch", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};
