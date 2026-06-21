const pool = require("../config/db");

exports.getPartnershipBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const [rows] = await pool.query(
      `SELECT
        p.id AS partnership_id,
        p.slug AS partnership_slug,
        p.status,
        e.id AS employer_id,
        e.name AS employer_name,
        e.logo_url,
        e.address,
        e.phone,
        e.website,
        e.brand_primary_color,
        e.brand_secondary_color,
        h.id AS team_id,
        h.name AS team_name
       FROM partnerships p
       JOIN employers e ON p.employer_id = e.id
       JOIN home_buying_teams h ON p.team_id = h.id
       WHERE p.slug = ? AND p.status = 'active'
       LIMIT 1`,
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Partnership not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to load partnership", error: error.message });
  }
};

exports.getHBTPartnerships = async (req, res) => {
  try {
    const teamId = req.user.team_id;

    if (!teamId) {
      return res.status(403).json({ status: "error", message: "HBT account is not linked to a team" });
    }

    const [rows] = await pool.query(
      `SELECT p.id, p.slug, p.status, p.created_at,
              e.name AS employer_name, e.logo_url, e.website, e.phone
       FROM partnerships p
       JOIN employers e ON p.employer_id = e.id
       WHERE p.team_id = ?
       ORDER BY p.id DESC`,
      [teamId]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to load HBT partnerships", error: error.message });
  }
};

exports.getHBTEmployees = async (req, res) => {
  try {
    const teamId = req.user.team_id;

    if (!teamId) {
      return res.status(403).json({ status: "error", message: "HBT account is not linked to a team" });
    }

    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.created_at,
              p.slug AS partnership_slug,
              e.name AS employer_name
       FROM users u
       JOIN partnerships p ON u.partnership_id = p.id
       JOIN employers e ON p.employer_id = e.id
       WHERE p.team_id = ? AND u.role = 'employee'
       ORDER BY u.id DESC`,
      [teamId]
    );

    res.json(rows);
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to load HBT employees", error: error.message });
  }
};

exports.createPartnership = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const teamId = req.user.team_id;

    if (!teamId) {
      connection.release();
      return res.status(403).json({ status: "error", message: "HBT account is not linked to a team" });
    }

    const {
      employer_name,
      logo_url,
      address,
      phone,
      website,
      brand_primary_color,
      brand_secondary_color,
      slug,
    } = req.body;

    if (!employer_name || !slug) {
      connection.release();
      return res.status(400).json({ status: "error", message: "Employer name and slug are required" });
    }

    await connection.beginTransaction();

    const [employerResult] = await connection.query(
      `INSERT INTO employers
       (name, logo_url, address, phone, website, brand_primary_color, brand_secondary_color, slug)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employer_name,
        logo_url || null,
        address || null,
        phone || null,
        website || null,
        brand_primary_color || "#000000",
        brand_secondary_color || "#ffffff",
        slug,
      ]
    );

    const [partnershipResult] = await connection.query(
      `INSERT INTO partnerships (team_id, employer_id, slug, status)
       VALUES (?, ?, ?, 'active')`,
      [teamId, employerResult.insertId, slug]
    );

    await connection.commit();
    connection.release();

    res.status(201).json({
      status: "success",
      message: "Partnership created successfully",
      partnership_id: partnershipResult.insertId,
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    res.status(500).json({ status: "error", message: "Failed to create partnership", error: error.message });
  }
};
