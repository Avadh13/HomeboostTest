const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

const isAdmin = (user) => user?.role === "admin" || user?.role === "super_admin";
const normalizeText = (value, max = 255) => String(value || "").trim().slice(0, max);
const normalizeNullableText = (value, max = 1000) => {
  const clean = normalizeText(value, max);
  return clean || null;
};
const toBooleanNumber = (value, fallback = 1) => {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || value === 1 || value === "1" || value === "true" ? 1 : 0;
};

let schemaReady = false;
let schemaPromise = null;

const ensureFooterSchema = async () => {
  if (schemaReady) return;
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS footer_settings (
        id TINYINT PRIMARY KEY DEFAULT 1,
        is_enabled TINYINT(1) DEFAULT 1,
        brand_name VARCHAR(255) DEFAULT 'HomeBoost Employee Benefit',
        logo_text VARCHAR(40) DEFAULT 'HB',
        tagline VARCHAR(255) DEFAULT 'Employer home-buying benefit platform.',
        description TEXT NULL,
        cta_text VARCHAR(120) DEFAULT 'Request Setup',
        cta_link VARCHAR(500) DEFAULT '/contact',
        newsletter_title VARCHAR(255) DEFAULT 'Stay connected',
        newsletter_text TEXT NULL,
        background_mode ENUM('dark','light','soft') DEFAULT 'dark',
        layout_style ENUM('three_column','compact','newsletter') DEFAULT 'three_column',
        copyright_text VARCHAR(255) DEFAULT '© 2026 HomeBoost. All rights reserved.',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS footer_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        label VARCHAR(120) NOT NULL,
        href VARCHAR(500) NOT NULL,
        column_key ENUM('left','center','right','bottom') DEFAULT 'left',
        display_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        opens_new_tab TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const [[settingsCount]] = await pool.query(`SELECT COUNT(*) AS total FROM footer_settings`);
    if (Number(settingsCount.total) === 0) {
      await pool.query(
        `INSERT INTO footer_settings
         (id, brand_name, logo_text, tagline, description, cta_text, cta_link, newsletter_title, newsletter_text, background_mode, layout_style, copyright_text)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, 'dark', 'three_column', ?)`,
        [
          "HomeBoost Employee Benefit",
          "HB",
          "Employer home-buying benefit platform.",
          "Modern employer portals, advisor communication, resources, quizzes, appointments, and guided home-buying support in one place.",
          "Request Setup",
          "/contact",
          "Need a custom employer portal?",
          "Create branded footer content, links, and calls-to-action directly from the admin panel.",
          "© 2026 HomeBoost. All rights reserved.",
        ]
      );
    }

    const [[linksCount]] = await pool.query(`SELECT COUNT(*) AS total FROM footer_links`);
    if (Number(linksCount.total) === 0) {
      const defaults = [
        ["Employer Portals", "/partners", "left", 1],
        ["Pricing", "/pricing", "left", 2],
        ["Contact", "/contact", "left", 3],
        ["Employee Login", "/login", "center", 1],
        ["Create Account", "/signup", "center", 2],
        ["Resources", "/resources", "center", 3],
        ["Admin Portal", "/admin/login", "right", 1],
        ["Messages", "/login", "right", 2],
        ["Alerts", "/login", "right", 3],
        ["HomeBoost", "/", "bottom", 1],
      ];

      await pool.query(
        `INSERT INTO footer_links (label, href, column_key, display_order) VALUES ?`,
        [defaults]
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
  if (!isAdmin(req.user)) {
    return res.status(403).json({ status: "error", message: "Admin access required" });
  }
  next();
};

const getFooterData = async ({ includeInactive = false } = {}) => {
  await ensureFooterSchema();

  const [[settings]] = await pool.query(`SELECT * FROM footer_settings WHERE id = 1 LIMIT 1`);
  const [links] = await pool.query(
    `SELECT * FROM footer_links
     ${includeInactive ? "" : "WHERE is_active = 1"}
     ORDER BY FIELD(column_key, 'left', 'center', 'right', 'bottom'), display_order ASC, id ASC`
  );

  return { settings, links };
};

router.get("/", async (req, res) => {
  try {
    const data = await getFooterData({ includeInactive: false });
    return res.json({ status: "success", ...data });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load footer", error: error.message });
  }
});

router.get("/admin", protect, requireAdmin, async (req, res) => {
  try {
    const data = await getFooterData({ includeInactive: true });
    return res.json({ status: "success", ...data });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load footer admin data", error: error.message });
  }
});

router.put("/settings", protect, requireAdmin, async (req, res) => {
  try {
    await ensureFooterSchema();

    const payload = {
      is_enabled: toBooleanNumber(req.body.is_enabled, 1),
      brand_name: normalizeText(req.body.brand_name, 255) || "HomeBoost Employee Benefit",
      logo_text: normalizeText(req.body.logo_text, 40) || "HB",
      tagline: normalizeNullableText(req.body.tagline, 255),
      description: normalizeNullableText(req.body.description, 2000),
      cta_text: normalizeNullableText(req.body.cta_text, 120),
      cta_link: normalizeNullableText(req.body.cta_link, 500),
      newsletter_title: normalizeNullableText(req.body.newsletter_title, 255),
      newsletter_text: normalizeNullableText(req.body.newsletter_text, 2000),
      background_mode: ["dark", "light", "soft"].includes(req.body.background_mode) ? req.body.background_mode : "dark",
      layout_style: ["three_column", "compact", "newsletter"].includes(req.body.layout_style) ? req.body.layout_style : "three_column",
      copyright_text: normalizeNullableText(req.body.copyright_text, 255),
    };

    await pool.query(
      `UPDATE footer_settings
       SET is_enabled = ?, brand_name = ?, logo_text = ?, tagline = ?, description = ?, cta_text = ?, cta_link = ?, newsletter_title = ?, newsletter_text = ?, background_mode = ?, layout_style = ?, copyright_text = ?
       WHERE id = 1`,
      [
        payload.is_enabled,
        payload.brand_name,
        payload.logo_text,
        payload.tagline,
        payload.description,
        payload.cta_text,
        payload.cta_link,
        payload.newsletter_title,
        payload.newsletter_text,
        payload.background_mode,
        payload.layout_style,
        payload.copyright_text,
      ]
    );

    const data = await getFooterData({ includeInactive: true });
    return res.json({ status: "success", message: "Footer settings updated", ...data });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update footer settings", error: error.message });
  }
});

router.post("/links", protect, requireAdmin, async (req, res) => {
  try {
    await ensureFooterSchema();

    const label = normalizeText(req.body.label, 120);
    const href = normalizeText(req.body.href, 500);
    const columnKey = ["left", "center", "right", "bottom"].includes(req.body.column_key) ? req.body.column_key : "left";

    if (!label || !href) {
      return res.status(400).json({ status: "error", message: "Label and URL are required" });
    }

    const [[orderRow]] = await pool.query(`SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM footer_links WHERE column_key = ?`, [columnKey]);

    const [result] = await pool.query(
      `INSERT INTO footer_links (label, href, column_key, display_order, is_active, opens_new_tab)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [label, href, columnKey, Number(orderRow.next_order || 1), toBooleanNumber(req.body.is_active, 1), toBooleanNumber(req.body.opens_new_tab, 0)]
    );

    return res.status(201).json({ status: "success", message: "Footer link added", id: result.insertId });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to add footer link", error: error.message });
  }
});

router.put("/links/:id", protect, requireAdmin, async (req, res) => {
  try {
    await ensureFooterSchema();

    const label = normalizeText(req.body.label, 120);
    const href = normalizeText(req.body.href, 500);
    const columnKey = ["left", "center", "right", "bottom"].includes(req.body.column_key) ? req.body.column_key : "left";

    if (!label || !href) {
      return res.status(400).json({ status: "error", message: "Label and URL are required" });
    }

    await pool.query(
      `UPDATE footer_links
       SET label = ?, href = ?, column_key = ?, display_order = ?, is_active = ?, opens_new_tab = ?
       WHERE id = ?`,
      [label, href, columnKey, Number(req.body.display_order || 0), toBooleanNumber(req.body.is_active, 1), toBooleanNumber(req.body.opens_new_tab, 0), req.params.id]
    );

    return res.json({ status: "success", message: "Footer link updated" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update footer link", error: error.message });
  }
});

router.put("/links/:id/move", protect, requireAdmin, async (req, res) => {
  try {
    await ensureFooterSchema();

    const direction = req.body.direction === "down" ? "down" : "up";
    const [[current]] = await pool.query(`SELECT * FROM footer_links WHERE id = ? LIMIT 1`, [req.params.id]);

    if (!current) {
      return res.status(404).json({ status: "error", message: "Footer link not found" });
    }

    const comparator = direction === "up" ? "<" : ">";
    const sort = direction === "up" ? "DESC" : "ASC";
    const [[target]] = await pool.query(
      `SELECT * FROM footer_links
       WHERE column_key = ? AND display_order ${comparator} ?
       ORDER BY display_order ${sort}, id ${sort}
       LIMIT 1`,
      [current.column_key, current.display_order]
    );

    if (!target) {
      return res.json({ status: "success", message: "Footer link order unchanged" });
    }

    await pool.query(`UPDATE footer_links SET display_order = ? WHERE id = ?`, [target.display_order, current.id]);
    await pool.query(`UPDATE footer_links SET display_order = ? WHERE id = ?`, [current.display_order, target.id]);

    return res.json({ status: "success", message: "Footer link moved" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to move footer link", error: error.message });
  }
});

router.delete("/links/:id", protect, requireAdmin, async (req, res) => {
  try {
    await ensureFooterSchema();
    await pool.query(`DELETE FROM footer_links WHERE id = ?`, [req.params.id]);
    return res.json({ status: "success", message: "Footer link deleted" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to delete footer link", error: error.message });
  }
});

module.exports = router;
