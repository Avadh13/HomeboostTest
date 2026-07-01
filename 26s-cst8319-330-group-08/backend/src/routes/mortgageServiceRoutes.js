const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

const isAdmin = (user) => user?.role === "admin" || user?.role === "super_admin";
const normalizeText = (value, max = 255) => String(value || "").trim().slice(0, max);
const toBool = (value, fallback = 1) => {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || value === 1 || value === "1" || value === "true" ? 1 : 0;
};
const slugify = (value) => normalizeText(value, 160).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `service-${Date.now()}`;

let schemaReady = false;
let schemaPromise = null;

const seedServices = [
  ["purchase-home", "Purchasing a Home", "Purchase", "Guidance for first-time buyers, next-home buyers, pre-approval, affordability, and next steps.", "🏡", "from-blue-500 to-sky-500", 1],
  ["renewal-refinance", "Renewal / Refinance", "Renewal", "Review renewal options, refinance strategy, payment goals, and lender alternatives before signing.", "🔁", "from-violet-500 to-purple-500", 2],
  ["debt-consolidation", "Debt Consolidation", "Debt Help", "Explore mortgage-based strategies to simplify debt, improve cash flow, and plan responsibly.", "💳", "from-emerald-500 to-teal-500", 3],
  ["self-employed", "Self-Employed Mortgage", "Self-Employed", "Support for business owners, contractors, and non-traditional income documentation.", "💼", "from-amber-500 to-orange-500", 4],
  ["separation-divorce", "Separation / Divorce Mortgage", "Separation", "Sensitive guidance for buyouts, refinancing, affordability, and next-home planning after separation.", "🤝", "from-pink-500 to-rose-500", 5],
  ["not-sure-yet", "Not sure yet", "Not Sure", "Start with a simple conversation and let an advisor help identify the right mortgage path.", "✨", "from-indigo-500 to-violet-500", 6],
];

const ensureSchema = async () => {
  if (schemaReady) return;
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mortgage_services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_key VARCHAR(160) NOT NULL UNIQUE,
        title VARCHAR(180) NOT NULL,
        short_title VARCHAR(80) NULL,
        description TEXT NULL,
        icon VARCHAR(20) DEFAULT '🏡',
        color_class VARCHAR(120) DEFAULT 'from-blue-500 to-violet-500',
        display_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const [[countRow]] = await pool.query(`SELECT COUNT(*) AS total FROM mortgage_services`);
    if (Number(countRow.total) === 0) {
      await pool.query(
        `INSERT INTO mortgage_services (service_key, title, short_title, description, icon, color_class, display_order) VALUES ?`,
        [seedServices]
      );
    }

    schemaReady = true;
  })();

  try {
    await schemaPromise;
  } finally {
    schemaPromise = null;
  }
};

const requireAdmin = (req, res, next) => {
  if (!isAdmin(req.user)) return res.status(403).json({ status: "error", message: "Admin access required" });
  next();
};

const loadServices = async ({ includeInactive = false } = {}) => {
  await ensureSchema();
  const [rows] = await pool.query(
    `SELECT * FROM mortgage_services ${includeInactive ? "" : "WHERE is_active = 1"} ORDER BY display_order ASC, id ASC`
  );
  return rows;
};

router.get("/", async (req, res) => {
  try {
    const services = await loadServices({ includeInactive: false });
    return res.json({ status: "success", services });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load mortgage services", error: error.message });
  }
});

router.get("/admin", protect, requireAdmin, async (req, res) => {
  try {
    const services = await loadServices({ includeInactive: true });
    return res.json({ status: "success", services });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load admin mortgage services", error: error.message });
  }
});

router.post("/", protect, requireAdmin, async (req, res) => {
  try {
    await ensureSchema();
    const title = normalizeText(req.body.title, 180);
    if (!title) return res.status(400).json({ status: "error", message: "Service title is required" });

    const serviceKey = slugify(req.body.service_key || title);
    const [[orderRow]] = await pool.query(`SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM mortgage_services`);

    const [result] = await pool.query(
      `INSERT INTO mortgage_services (service_key, title, short_title, description, icon, color_class, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        serviceKey,
        title,
        normalizeText(req.body.short_title, 80) || title.slice(0, 80),
        normalizeText(req.body.description, 2000) || null,
        normalizeText(req.body.icon, 20) || "🏡",
        normalizeText(req.body.color_class, 120) || "from-blue-500 to-violet-500",
        Number(orderRow.next_order || 1),
        toBool(req.body.is_active, 1),
      ]
    );

    return res.status(201).json({ status: "success", message: "Mortgage service added", id: result.insertId });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ status: "error", message: "Service key already exists" });
    return res.status(500).json({ status: "error", message: "Failed to add mortgage service", error: error.message });
  }
});

router.put("/:id", protect, requireAdmin, async (req, res) => {
  try {
    await ensureSchema();
    const title = normalizeText(req.body.title, 180);
    if (!title) return res.status(400).json({ status: "error", message: "Service title is required" });

    await pool.query(
      `UPDATE mortgage_services
       SET service_key = ?, title = ?, short_title = ?, description = ?, icon = ?, color_class = ?, display_order = ?, is_active = ?
       WHERE id = ?`,
      [
        slugify(req.body.service_key || title),
        title,
        normalizeText(req.body.short_title, 80) || title.slice(0, 80),
        normalizeText(req.body.description, 2000) || null,
        normalizeText(req.body.icon, 20) || "🏡",
        normalizeText(req.body.color_class, 120) || "from-blue-500 to-violet-500",
        Number(req.body.display_order || 0),
        toBool(req.body.is_active, 1),
        req.params.id,
      ]
    );

    return res.json({ status: "success", message: "Mortgage service updated" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ status: "error", message: "Service key already exists" });
    return res.status(500).json({ status: "error", message: "Failed to update mortgage service", error: error.message });
  }
});

router.put("/:id/move", protect, requireAdmin, async (req, res) => {
  try {
    await ensureSchema();
    const direction = req.body.direction === "down" ? "down" : "up";
    const [[current]] = await pool.query(`SELECT * FROM mortgage_services WHERE id = ? LIMIT 1`, [req.params.id]);
    if (!current) return res.status(404).json({ status: "error", message: "Mortgage service not found" });

    const comparator = direction === "up" ? "<" : ">";
    const sort = direction === "up" ? "DESC" : "ASC";
    const [[target]] = await pool.query(
      `SELECT * FROM mortgage_services WHERE display_order ${comparator} ? ORDER BY display_order ${sort}, id ${sort} LIMIT 1`,
      [current.display_order]
    );

    if (!target) return res.json({ status: "success", message: "Order unchanged" });
    await pool.query(`UPDATE mortgage_services SET display_order = ? WHERE id = ?`, [target.display_order, current.id]);
    await pool.query(`UPDATE mortgage_services SET display_order = ? WHERE id = ?`, [current.display_order, target.id]);
    return res.json({ status: "success", message: "Mortgage service moved" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to move mortgage service", error: error.message });
  }
});

router.delete("/:id", protect, requireAdmin, async (req, res) => {
  try {
    await ensureSchema();
    await pool.query(`DELETE FROM mortgage_services WHERE id = ?`, [req.params.id]);
    return res.json({ status: "success", message: "Mortgage service deleted" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to delete mortgage service", error: error.message });
  }
});

module.exports = router;
