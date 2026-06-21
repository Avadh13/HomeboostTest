const pool = require("../config/db");

exports.getEmployeePortalData = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.query(
      `SELECT
         u.id,
         u.full_name,
         u.email,
         u.role,
         u.partnership_id,
         p.slug AS partnership_slug,
         e.name AS employer_name,
         e.logo_url AS employer_logo_url,
         e.brand_primary_color,
         e.brand_secondary_color,
         h.id AS team_id,
         h.name AS team_name,
         h.description AS team_description,
         h.logo_url AS team_logo_url,
         h.email AS team_email,
         h.phone AS team_phone,
         h.website AS team_website
       FROM users u
       JOIN partnerships p ON u.partnership_id = p.id
       JOIN employers e ON p.employer_id = e.id
       JOIN home_buying_teams h ON p.team_id = h.id
       WHERE u.id = ?
       LIMIT 1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ status: "error", message: "Employee portal data not found" });
    }

    const employee = users[0];

    const [teamMembers] = await pool.query(
      `SELECT id, full_name, title, email, phone, photo_url, booking_link, bio
       FROM team_members
       WHERE team_id = ? AND is_active = 1
       ORDER BY id DESC`,
      [employee.team_id]
    );

    const [quizzes] = await pool.query(
      `SELECT id, title, description
       FROM quizzes
       WHERE is_active = 1 AND (is_global = 1 OR team_id = ?)
       ORDER BY id DESC`,
      [employee.team_id]
    );

    const [resources] = await pool.query(
      `SELECT id, title, description, category, image_url, resource_url
       FROM resources
       WHERE is_active = 1 AND (is_global = 1 OR team_id = ?)
       ORDER BY id DESC
       LIMIT 6`,
      [employee.team_id]
    );

    res.json({ status: "success", employee, team_members: teamMembers, quizzes, resources });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to load employee portal data", error: error.message });
  }
};
