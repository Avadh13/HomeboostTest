const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const companyRoles = ["company", "company_admin"];
const hbtRoles = ["hbt_admin", "hbt_member"];
const clean = (value, max = 255) => String(value || "").trim().slice(0, max);
const emailClean = (value) => clean(value, 255).toLowerCase();
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const canReview = (user) => adminRoles.includes(user?.role) || user?.role === "hbt_admin";
const canUseCompanyFlow = (user) => canReview(user) || companyRoles.includes(user?.role);

const ensureEmployerApprovalTables = async (connection = pool) => {
  await connection.query(`CREATE TABLE IF NOT EXISTS employer_approval_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partnership_id INT NULL,
    employer_id INT NULL,
    team_id INT NULL,
    requested_by_user_id INT NULL,
    requested_company_name VARCHAR(180) NOT NULL,
    contact_name VARCHAR(180) NULL,
    contact_email VARCHAR(255) NULL,
    contact_phone VARCHAR(80) NULL,
    contact_title VARCHAR(120) NULL,
    approval_status VARCHAR(40) DEFAULT 'pending',
    review_note TEXT NULL,
    reviewed_by_user_id INT NULL,
    reviewed_at DATETIME NULL,
    approved_at DATETIME NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_employer_approval_partnership (partnership_id),
    INDEX idx_employer_approval_team (team_id),
    INDEX idx_employer_approval_status (approval_status),
    INDEX idx_employer_approval_requested_by (requested_by_user_id)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS company_points_of_contact (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partnership_id INT NOT NULL,
    user_id INT NULL,
    full_name VARCHAR(180) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(80) NULL,
    title VARCHAR(120) NULL,
    is_primary TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_by_user_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_company_poc_partnership_email (partnership_id, email),
    INDEX idx_company_poc_partnership (partnership_id),
    INDEX idx_company_poc_active (is_active)
  )`);
};

const getPartnershipContext = async (partnershipId) => {
  const [[row]] = await pool.query(
    `SELECT p.id AS partnership_id, p.team_id, p.employer_id, p.slug, e.name AS employer_name, h.name AS team_name
     FROM partnerships p
     LEFT JOIN employers e ON e.id = p.employer_id
     LEFT JOIN home_buying_teams h ON h.id = p.team_id
     WHERE p.id = ? LIMIT 1`,
    [partnershipId]
  );
  return row || null;
};

const canAccessPartnership = async (user, partnershipId) => {
  if (adminRoles.includes(user?.role)) return true;
  if (companyRoles.includes(user?.role)) return Number(user.partnership_id) === Number(partnershipId);
  if (hbtRoles.includes(user?.role)) {
    const context = await getPartnershipContext(partnershipId);
    return Number(context?.team_id) === Number(user.team_id);
  }
  return false;
};

router.use(protect);

router.get("/requests", async (req, res) => {
  try {
    if (!canUseCompanyFlow(req.user)) return res.status(403).json({ status: "error", message: "Employer approval access required" });
    await ensureEmployerApprovalTables();

    const params = [];
    let clause = "WHERE 1=1";
    if (req.user.role === "hbt_admin") {
      clause += " AND ear.team_id = ?";
      params.push(req.user.team_id);
    } else if (companyRoles.includes(req.user.role)) {
      clause += " AND ear.partnership_id = ?";
      params.push(req.user.partnership_id);
    }

    const [requests] = await pool.query(
      `SELECT ear.*, e.name AS employer_name, h.name AS team_name, u.full_name AS requested_by_name, reviewer.full_name AS reviewed_by_name
       FROM employer_approval_requests ear
       LEFT JOIN employers e ON e.id = ear.employer_id
       LEFT JOIN home_buying_teams h ON h.id = ear.team_id
       LEFT JOIN users u ON u.id = ear.requested_by_user_id
       LEFT JOIN users reviewer ON reviewer.id = ear.reviewed_by_user_id
       ${clause}
       ORDER BY ear.requested_at DESC, ear.id DESC
       LIMIT 250`,
      params
    );

    return res.json({ status: "success", requests });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load employer approval requests", error: error.message });
  }
});

router.post("/requests", async (req, res) => {
  try {
    if (!canUseCompanyFlow(req.user)) return res.status(403).json({ status: "error", message: "Employer approval access required" });
    await ensureEmployerApprovalTables();

    const partnershipId = Number(req.body.partnership_id || req.user.partnership_id);
    if (!partnershipId) return res.status(400).json({ status: "error", message: "partnership_id is required" });
    if (!(await canAccessPartnership(req.user, partnershipId))) return res.status(403).json({ status: "error", message: "Not allowed for this partnership" });

    const context = await getPartnershipContext(partnershipId);
    if (!context) return res.status(404).json({ status: "error", message: "Partnership not found" });

    const companyName = clean(req.body.requested_company_name || context.employer_name, 180);
    const contactName = clean(req.body.contact_name || req.user.full_name, 180);
    const contactEmail = emailClean(req.body.contact_email || req.user.email);
    if (!companyName || !contactName || !isEmail(contactEmail)) return res.status(400).json({ status: "error", message: "Company name, contact name, and valid contact email are required" });

    const [result] = await pool.query(
      `INSERT INTO employer_approval_requests
       (partnership_id, employer_id, team_id, requested_by_user_id, requested_company_name, contact_name, contact_email, contact_phone, contact_title, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [partnershipId, context.employer_id, context.team_id, req.user.id, companyName, contactName, contactEmail, clean(req.body.contact_phone, 80) || null, clean(req.body.contact_title, 120) || null]
    );

    await pool.query(
      `INSERT INTO company_points_of_contact (partnership_id, full_name, email, phone, title, is_primary, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), phone = VALUES(phone), title = VALUES(title), is_active = 1`,
      [partnershipId, contactName, contactEmail, clean(req.body.contact_phone, 80) || null, clean(req.body.contact_title, 120) || null, req.user.id]
    );

    return res.status(201).json({ status: "success", message: "Employer approval request created", request_id: result.insertId });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to create employer approval request", error: error.message });
  }
});

router.put("/requests/:id/status", async (req, res) => {
  try {
    if (!canReview(req.user)) return res.status(403).json({ status: "error", message: "HBT admin or admin access required" });
    await ensureEmployerApprovalTables();
    const status = clean(req.body.approval_status, 40);
    if (!["pending", "approved", "rejected", "needs_info"].includes(status)) return res.status(400).json({ status: "error", message: "Invalid approval status" });

    const [[request]] = await pool.query("SELECT * FROM employer_approval_requests WHERE id = ? LIMIT 1", [req.params.id]);
    if (!request) return res.status(404).json({ status: "error", message: "Approval request not found" });
    if (req.user.role === "hbt_admin" && Number(request.team_id) !== Number(req.user.team_id)) return res.status(403).json({ status: "error", message: "Not allowed to review this request" });

    await pool.query(
      `UPDATE employer_approval_requests
       SET approval_status = ?, review_note = ?, reviewed_by_user_id = ?, reviewed_at = NOW(), approved_at = IF(? = 'approved', NOW(), approved_at)
       WHERE id = ?`,
      [status, clean(req.body.review_note, 2000) || null, req.user.id, status, req.params.id]
    );

    return res.json({ status: "success", message: "Employer approval status updated" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update employer approval status", error: error.message });
  }
});

router.get("/contacts", async (req, res) => {
  try {
    if (!canUseCompanyFlow(req.user)) return res.status(403).json({ status: "error", message: "Company contact access required" });
    await ensureEmployerApprovalTables();
    const partnershipId = Number(req.query.partnership_id || req.user.partnership_id);
    if (!partnershipId) return res.status(400).json({ status: "error", message: "partnership_id is required" });
    if (!(await canAccessPartnership(req.user, partnershipId))) return res.status(403).json({ status: "error", message: "Not allowed for this partnership" });
    const [contacts] = await pool.query("SELECT * FROM company_points_of_contact WHERE partnership_id = ? AND is_active = 1 ORDER BY is_primary DESC, id DESC", [partnershipId]);
    return res.json({ status: "success", contacts });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load company contacts", error: error.message });
  }
});

router.post("/contacts", async (req, res) => {
  try {
    if (!canUseCompanyFlow(req.user)) return res.status(403).json({ status: "error", message: "Company contact access required" });
    await ensureEmployerApprovalTables();
    const partnershipId = Number(req.body.partnership_id || req.user.partnership_id);
    if (!partnershipId) return res.status(400).json({ status: "error", message: "partnership_id is required" });
    if (!(await canAccessPartnership(req.user, partnershipId))) return res.status(403).json({ status: "error", message: "Not allowed for this partnership" });
    const fullName = clean(req.body.full_name, 180);
    const email = emailClean(req.body.email);
    if (!fullName || !isEmail(email)) return res.status(400).json({ status: "error", message: "Full name and valid email are required" });
    const isPrimary = req.body.is_primary ? 1 : 0;
    if (isPrimary) await pool.query("UPDATE company_points_of_contact SET is_primary = 0 WHERE partnership_id = ?", [partnershipId]);
    await pool.query(
      `INSERT INTO company_points_of_contact (partnership_id, full_name, email, phone, title, is_primary, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), phone = VALUES(phone), title = VALUES(title), is_primary = VALUES(is_primary), is_active = 1`,
      [partnershipId, fullName, email, clean(req.body.phone, 80) || null, clean(req.body.title, 120) || null, isPrimary, req.user.id]
    );
    return res.status(201).json({ status: "success", message: "Company contact saved" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to save company contact", error: error.message });
  }
});

router.delete("/contacts/:id", async (req, res) => {
  try {
    if (!canUseCompanyFlow(req.user)) return res.status(403).json({ status: "error", message: "Company contact access required" });
    await ensureEmployerApprovalTables();
    const [[contact]] = await pool.query("SELECT * FROM company_points_of_contact WHERE id = ? LIMIT 1", [req.params.id]);
    if (!contact) return res.status(404).json({ status: "error", message: "Contact not found" });
    if (!(await canAccessPartnership(req.user, contact.partnership_id))) return res.status(403).json({ status: "error", message: "Not allowed for this contact" });
    await pool.query("UPDATE company_points_of_contact SET is_active = 0 WHERE id = ?", [req.params.id]);
    return res.json({ status: "success", message: "Company contact removed" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to remove company contact", error: error.message });
  }
});

module.exports = router;
module.exports.ensureEmployerApprovalTables = ensureEmployerApprovalTables;
