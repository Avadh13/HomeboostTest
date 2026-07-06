const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const canManage = (user) => adminRoles.includes(user?.role) || user?.role === "hbt_admin";
const clean = (value, max = 255) => String(value || "").trim().slice(0, max);

const ensurePortalSettingsTable = async (connection = pool) => {
  await connection.query(`CREATE TABLE IF NOT EXISTS partnership_portal_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    partnership_id INT NOT NULL,
    portal_title VARCHAR(180) NULL,
    welcome_message TEXT NULL,
    prompt_text TEXT NULL,
    logo_url VARCHAR(500) NULL,
    primary_color VARCHAR(30) NULL,
    secondary_color VARCHAR(30) NULL,
    footer_text TEXT NULL,
    is_published TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_partnership_portal_settings (partnership_id),
    INDEX idx_partnership_portal_settings_published (is_published)
  )`);
};

const canAccessPartnership = async (user, partnershipId) => {
  if (adminRoles.includes(user.role)) return true;
  if (user.role === "hbt_admin") {
    const [[partnership]] = await pool.query("SELECT team_id FROM partnerships WHERE id = ? LIMIT 1", [partnershipId]);
    return Number(partnership?.team_id) === Number(user.team_id);
  }
  if ((user.role === "company" || user.role === "company_admin") && Number(user.partnership_id) === Number(partnershipId)) return true;
  return false;
};

router.use(protect);

router.get("/me", async (req, res) => {
  try {
    if (!req.user.partnership_id) return res.status(400).json({ status: "error", message: "Account is not linked to a partnership" });
    await ensurePortalSettingsTable();
    const [[settings]] = await pool.query(
      `SELECT pps.*, e.name AS employer_name, e.logo_url AS employer_logo_url, e.brand_primary_color, e.brand_secondary_color
       FROM partnerships p
       JOIN employers e ON e.id = p.employer_id
       LEFT JOIN partnership_portal_settings pps ON pps.partnership_id = p.id
       WHERE p.id = ? LIMIT 1`,
      [req.user.partnership_id]
    );
    return res.json({ status: "success", settings });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load portal branding", error: error.message });
  }
});

router.get("/partnership/:partnershipId", async (req, res) => {
  try {
    if (!canManage(req.user) && req.user.role !== "company" && req.user.role !== "company_admin") return res.status(403).json({ status: "error", message: "Portal branding access required" });
    if (!(await canAccessPartnership(req.user, req.params.partnershipId))) return res.status(403).json({ status: "error", message: "Not allowed for this partnership" });
    await ensurePortalSettingsTable();
    const [[settings]] = await pool.query(
      `SELECT p.id AS partnership_id, p.slug, e.name AS employer_name, e.logo_url AS employer_logo_url, e.brand_primary_color, e.brand_secondary_color, pps.*
       FROM partnerships p
       JOIN employers e ON e.id = p.employer_id
       LEFT JOIN partnership_portal_settings pps ON pps.partnership_id = p.id
       WHERE p.id = ? LIMIT 1`,
      [req.params.partnershipId]
    );
    if (!settings) return res.status(404).json({ status: "error", message: "Partnership not found" });
    return res.json({ status: "success", settings });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load portal branding", error: error.message });
  }
});

router.put("/partnership/:partnershipId", async (req, res) => {
  try {
    if (!canManage(req.user) && req.user.role !== "company" && req.user.role !== "company_admin") return res.status(403).json({ status: "error", message: "Portal branding access required" });
    if (!(await canAccessPartnership(req.user, req.params.partnershipId))) return res.status(403).json({ status: "error", message: "Not allowed for this partnership" });
    await ensurePortalSettingsTable();
    const partnershipId = Number(req.params.partnershipId);
    await pool.query(
      `INSERT INTO partnership_portal_settings
       (partnership_id, portal_title, welcome_message, prompt_text, logo_url, primary_color, secondary_color, footer_text, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         portal_title = VALUES(portal_title),
         welcome_message = VALUES(welcome_message),
         prompt_text = VALUES(prompt_text),
         logo_url = VALUES(logo_url),
         primary_color = VALUES(primary_color),
         secondary_color = VALUES(secondary_color),
         footer_text = VALUES(footer_text),
         is_published = VALUES(is_published)`,
      [
        partnershipId,
        clean(req.body.portal_title, 180) || null,
        clean(req.body.welcome_message, 2000) || null,
        clean(req.body.prompt_text, 2000) || null,
        clean(req.body.logo_url, 500) || null,
        clean(req.body.primary_color, 30) || null,
        clean(req.body.secondary_color, 30) || null,
        clean(req.body.footer_text, 2000) || null,
        req.body.is_published ?? 1,
      ]
    );
    return res.json({ status: "success", message: "Portal branding saved" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to save portal branding", error: error.message });
  }
});

module.exports = router;
module.exports.ensurePortalSettingsTable = ensurePortalSettingsTable;
