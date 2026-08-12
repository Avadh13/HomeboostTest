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
      [slug],
    );

    if (rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Partnership not found" });
    }

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load partnership" });
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
      [teamId],
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load HBT partnerships" });
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
      [teamId],
    );

    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load HBT employees" });
  }
};

exports.createPartnership = async (req, res) => {
  if (req.user?.role === "hbt_admin") {
    return res.status(409).json({
      status: "error",
      code: "EMPLOYER_APPROVAL_REQUIRED",
      message: "HBT Admins must submit the employer through Employer Approvals. A partnership becomes active only after Admin or Super Admin approval.",
      approval_path: "/hbt/employer-approvals",
    });
  }

  if (req.user?.role === "admin" || req.user?.role === "super_admin") {
    return res.status(409).json({
      status: "error",
      code: "USE_ADMIN_PARTNERSHIP_WORKFLOW",
      message: "Use the Admin partnership or Employer Approval workflow for direct platform administration.",
      admin_path: "/admin/partnerships",
    });
  }

  return res.status(403).json({
    status: "error",
    code: "PARTNERSHIP_CREATE_FORBIDDEN",
    message: "Only the approved employer-onboarding workflow can create partnerships.",
  });
};
