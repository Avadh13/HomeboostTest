const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const getRedirectPath = (role) => {
  if (role === "admin" || role === "super_admin") {
    return "/admin";
  }

  if (role === "hbt_admin") {
    return "/hbt/dashboard";
  }

  if (role === "hbt_member") {
    return "/hbt/member-dashboard";
  }

  return "/employee-portal";
};

exports.register = async (req, res) => {
  try {
    const { full_name, email, password, partnership_slug } = req.body;

    if (!full_name || !email || !password || !partnership_slug) {
      return res.status(400).json({
        status: "error",
        message: "Full name, email, password, and partnership slug are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Email already exists",
      });
    }

    const [partnerships] = await pool.query(
      `SELECT id 
       FROM partnerships 
       WHERE slug = ? 
       AND status = 'active' 
       LIMIT 1`,
      [partnership_slug.trim()]
    );

    if (partnerships.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or inactive partnership",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users 
       (full_name, email, password, role, partnership_id, is_active)
       VALUES (?, ?, ?, 'employee', ?, 1)`,
      [full_name.trim(), cleanEmail, passwordHash, partnerships[0].id]
    );

    res.status(201).json({
      status: "success",
      message: "Employee account created successfully",
      user_id: result.insertId,
      partnership_id: partnerships[0].id,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Registration failed",
      error: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const [users] = await pool.query(
      `SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.password, 
        u.role, 
        u.team_id, 
        u.partnership_id, 
        u.is_active,
        h.name AS team_name,
        e.name AS employer_name,
        p.slug AS partnership_slug
       FROM users u
       LEFT JOIN home_buying_teams h ON u.team_id = h.id
       LEFT JOIN partnerships p ON u.partnership_id = p.id
       LEFT JOIN employers e ON p.employer_id = e.id
       WHERE u.email = ?
       LIMIT 1`,
      [cleanEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    if (Number(user.is_active) !== 1) {
      return res.status(403).json({
        status: "error",
        message: "Account is disabled",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        team_id: user.team_id,
        partnership_id: user.partnership_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const redirectTo = getRedirectPath(user.role);

    res.json({
      status: "success",
      message: "Login successful",
      token,
      redirect_to: redirectTo,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        team_id: user.team_id,
        partnership_id: user.partnership_id,
        is_active: user.is_active,
        team_name: user.team_name,
        employer_name: user.employer_name,
        partnership_slug: user.partnership_slug,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Login failed",
      error: error.message,
    });
  }
};

exports.me = async (req, res) => {
  res.json({
    status: "success",
    user: req.user,
  });
};