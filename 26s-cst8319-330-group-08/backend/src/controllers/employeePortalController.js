const pool = require("../config/db");
const { ensurePortalSettingsTable } = require("../routes/portalBrandingRoutes");

exports.getEmployeePortalData = async (req, res) => {
  try {
    await ensurePortalSettingsTable();
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
         COALESCE(pps.logo_url, e.logo_url) AS employer_logo_url,
         COALESCE(pps.primary_color, e.brand_primary_color) AS brand_primary_color,
         COALESCE(pps.secondary_color, e.brand_secondary_color) AS brand_secondary_color,
         COALESCE(pps.portal_title, CONCAT(e.name, ' Home Buying Portal')) AS portal_title,
         pps.welcome_message,
         pps.prompt_text,
         pps.footer_text,
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
       LEFT JOIN partnership_portal_settings pps ON pps.partnership_id = p.id AND pps.is_published = 1
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
       FROM quizzes q
       WHERE q.is_active = 1
         AND (
          q.is_global = 1
          OR (
            q.team_id = ?
            AND (
              NOT EXISTS (SELECT 1 FROM quiz_partnerships qp_all WHERE qp_all.quiz_id = q.id)
              OR EXISTS (
                SELECT 1 FROM quiz_partnerships qp
                WHERE qp.quiz_id = q.id AND qp.partnership_id = ?
              )
            )
          )
         )
       ORDER BY id DESC`,
      [employee.team_id, employee.partnership_id]
    );

    const [resources] = await pool.query(
      `SELECT id, title, description, category, image_url, resource_url
       FROM resources r
       WHERE r.is_active = 1
         AND (
          r.is_global = 1
          OR (
            r.team_id = ?
            AND (
              NOT EXISTS (SELECT 1 FROM resource_partnerships rp_all WHERE rp_all.resource_id = r.id)
              OR EXISTS (
                SELECT 1 FROM resource_partnerships rp
                WHERE rp.resource_id = r.id AND rp.partnership_id = ?
              )
            )
          )
         )
       ORDER BY id DESC
       LIMIT 6`,
      [employee.team_id, employee.partnership_id]
    );

    res.json({ status: "success", employee, team_members: teamMembers, quizzes, resources });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to load employee portal data", error: error.message });
  }
};
