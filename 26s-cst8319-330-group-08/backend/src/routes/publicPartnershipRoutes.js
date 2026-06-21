const express = require("express");
const pool = require("../config/db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        p.id,
        p.slug,
        p.status,
        e.name AS employer_name,
        e.logo_url,
        e.website,
        e.phone,
        e.contact_email,
        h.name AS hbt_name
       FROM partnerships p
       JOIN employers e ON p.employer_id = e.id
       JOIN home_buying_teams h ON p.team_id = h.id
       WHERE p.status = 'active'
       ORDER BY e.name ASC`
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load partner companies",
      error: error.message,
    });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const [rows] = await pool.query(
      `SELECT
        p.id,
        p.slug,
        p.status,
        e.name AS employer_name,
        e.logo_url,
        e.website,
        e.phone,
        e.contact_email,
        h.name AS hbt_name,
        h.email AS hbt_email,
        h.phone AS hbt_phone,
        h.website AS hbt_website
       FROM partnerships p
       JOIN employers e ON p.employer_id = e.id
       JOIN home_buying_teams h ON p.team_id = h.id
       WHERE p.slug = ? AND p.status = 'active'
       LIMIT 1`,
      [slug]
    );

    if (!rows.length) {
      return res.status(404).json({ status: "error", message: "Partner company not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load partner company",
      error: error.message,
    });
  }
});

module.exports = router;
