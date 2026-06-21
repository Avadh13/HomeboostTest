const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

const adminOnly = (req, res, next) => {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "super_admin")) {
    return res.status(403).json({
      message: "Admin access required",
    });
  }

  next();
};

// Get all partnerships
router.get("/", protect, adminOnly, async (req, res) => {
  try {
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
        h.id AS team_id,
        h.name AS hbt_name
       FROM partnerships p
       JOIN employers e ON p.employer_id = e.id
       JOIN home_buying_teams h ON p.team_id = h.id
       ORDER BY p.id DESC`
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load partnerships",
      error: error.message,
    });
  }
});

// Create company + partnership
router.post("/", protect, adminOnly, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      company_name,
      slug,
      logo_url,
      website,
      phone,
      contact_email,
      team_id,
      status,
    } = req.body;

    if (!company_name || !slug || !team_id) {
      return res.status(400).json({
        message: "Company name, slug, and HBT team are required",
      });
    }

    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "")
      .replace(/\s+/g, "");

    await connection.beginTransaction();

    const [existingSlug] = await connection.query(
      `SELECT id FROM partnerships WHERE slug = ? LIMIT 1`,
      [cleanSlug]
    );

    if (existingSlug.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        message: "This slug already exists. Please use a different slug.",
      });
    }

    const [employerResult] = await connection.query(
      `INSERT INTO employers
       (name, slug, logo_url, website, phone, contact_email, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        company_name,
        cleanSlug,
        logo_url || null,
        website || null,
        phone || null,
        contact_email || null,
        status || "active",
      ]
    );

    const employerId = employerResult.insertId;

    const [partnershipResult] = await connection.query(
      `INSERT INTO partnerships
       (employer_id, team_id, slug, status)
       VALUES (?, ?, ?, ?)`,
      [employerId, team_id, cleanSlug, status || "active"]
    );

    await connection.commit();

    res.status(201).json({
      message: "Employer partnership created successfully",
      partnership_id: partnershipResult.insertId,
      employer_id: employerId,
      slug: cleanSlug,
      public_url: `/${cleanSlug}`,
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      message: "Failed to create employer partnership",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

// Delete partnership + employer
router.delete("/:id", protect, adminOnly, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    await connection.beginTransaction();

    const [partnershipRows] = await connection.query(
      `SELECT employer_id FROM partnerships WHERE id = ? LIMIT 1`,
      [id]
    );

    if (partnershipRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        message: "Partnership not found",
      });
    }

    const employerId = partnershipRows[0].employer_id;

    await connection.query(`DELETE FROM partnerships WHERE id = ?`, [id]);
    await connection.query(`DELETE FROM employers WHERE id = ?`, [employerId]);

    await connection.commit();

    res.json({
      message: "Partnership deleted successfully",
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      message: "Failed to delete partnership",
      error: error.message,
    });
  } finally {
    connection.release();
  }
});

module.exports = router;