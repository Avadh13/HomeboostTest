const pool = require("../config/db");

exports.getUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.team_id,
        u.partnership_id,
        u.is_active,
        u.created_at,

        h1.name AS direct_hbt_name,
        h2.name AS partnership_hbt_name,
        e.name AS employer_name,
        p.slug AS partnership_slug,

        COALESCE(h1.name, h2.name) AS hbt_name

       FROM users u

       LEFT JOIN home_buying_teams h1
        ON u.team_id = h1.id

       LEFT JOIN partnerships p
        ON u.partnership_id = p.id

       LEFT JOIN employers e
        ON p.employer_id = e.id

       LEFT JOIN home_buying_teams h2
        ON p.team_id = h2.id

       ORDER BY u.id DESC`
    );

    res.json(users);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load users",
      error: error.message,
    });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = [
      "super_admin",
      "admin",
      "hbt_admin",
      "hbt_member",
      "employee",
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid role",
      });
    }

    await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);

    res.json({
      status: "success",
      message: "User role updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update user role",
      error: error.message,
    });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const statusValue = Number(is_active) === 1 ? 1 : 0;

    await pool.query("UPDATE users SET is_active = ? WHERE id = ?", [
      statusValue,
      id,
    ]);

    res.json({
      status: "success",
      message: "User status updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update user status",
      error: error.message,
    });
  }
};