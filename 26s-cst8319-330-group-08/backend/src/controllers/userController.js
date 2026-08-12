const pool = require("../config/db");

const getUserById = async (id) => {
  const [[user]] = await pool.query("SELECT id, role, is_active FROM users WHERE id = ? LIMIT 1", [id]);
  return user || null;
};

const getActiveSuperAdminCount = async () => {
  const [[row]] = await pool.query(
    "SELECT COUNT(*) AS count FROM users WHERE role = 'super_admin' AND is_active = 1"
  );
  return Number(row?.count || 0);
};

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
      "company_admin",
      "company",
      "employee",
    ];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid role",
      });
    }

    const targetUser = await getUserById(id);
    if (!targetUser) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    if (Number(req.user?.id) === Number(id) && targetUser.role === "super_admin" && role !== "super_admin") {
      return res.status(403).json({
        status: "error",
        message: "Super Admins cannot demote their own account.",
      });
    }

    if (targetUser.role === "super_admin" && role !== "super_admin" && Number(targetUser.is_active) === 1) {
      const activeSuperAdmins = await getActiveSuperAdminCount();
      if (activeSuperAdmins <= 1) {
        return res.status(403).json({
          status: "error",
          message: "At least one active Super Admin must remain.",
        });
      }
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

    const targetUser = await getUserById(id);
    if (!targetUser) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    if (Number(req.user?.id) === Number(id) && statusValue === 0) {
      return res.status(403).json({
        status: "error",
        message: "You cannot disable your own account.",
      });
    }

    if (targetUser.role === "super_admin" && Number(targetUser.is_active) === 1 && statusValue === 0) {
      const activeSuperAdmins = await getActiveSuperAdminCount();
      if (activeSuperAdmins <= 1) {
        return res.status(403).json({
          status: "error",
          message: "At least one active Super Admin must remain.",
        });
      }
    }

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

exports._private = { getUserById, getActiveSuperAdminCount };
