const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

const hbtOnly = (req, res, next) => {
  if (!req.user || !["hbt_admin", "hbt_member"].includes(req.user.role)) {
    return res.status(403).json({ status: "error", message: "HBT access required" });
  }

  next();
};

router.get("/", protect, hbtOnly, async (req, res) => {
  try {
    const [userRows] = await pool.query(
      "SELECT team_id FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );

    const teamId = userRows[0]?.team_id || req.user.team_id;

    if (!teamId) {
      return res.json([]);
    }

    const [rows] = await pool.query(
      `SELECT
        p.id,
        p.slug,
        p.status,
        p.created_at,
        e.id AS employer_id,
        e.name AS employer_name,
        e.logo_url,
        e.website,
        e.phone,
        e.contact_email,
        p.team_id
       FROM partnerships p
       JOIN employers e ON p.employer_id = e.id
       WHERE p.team_id = ?
       ORDER BY e.name ASC, p.id DESC`,
      [teamId]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to load HBT partnerships", error: error.message });
  }
});

module.exports = router;
