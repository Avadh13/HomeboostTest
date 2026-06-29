const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const getRedirectPath = (role) => {
  if (role === "admin" || role === "super_admin") return "/admin";
  if (role === "hbt_admin") return "/hbt/dashboard";
  if (role === "hbt_member") return "/hbt/member-dashboard";
  return "/employee-portal";
};

const signAccessToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      team_id: user.team_id,
      partnership_id: user.partnership_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
const normalizeText = (value) => String(value || "").trim();
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

exports.register = async (req, res) => {
  let connection;

  try {
    const { full_name, email, password, partnership_slug } = req.body;
    const cleanName = normalizeText(full_name);
    const cleanEmail = normalizeEmail(email);
    const cleanSlug = normalizeText(partnership_slug).toLowerCase();

    if (!cleanName || !cleanEmail || !password || !cleanSlug) {
      return res.status(400).json({
        status: "error",
        message: "Full name, email, password, and partnership slug are required",
      });
    }

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({ status: "error", message: "Please enter a valid email address" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [partnerships] = await connection.query(
      `SELECT id FROM partnerships WHERE slug = ? AND status = 'active' LIMIT 1`,
      [cleanSlug]
    );

    if (partnerships.length === 0) {
      await connection.rollback();
      return res.status(400).json({ status: "error", message: "Invalid or inactive partnership" });
    }

    const partnershipId = partnerships[0].id;

    const [existingUsers] = await connection.query("SELECT id FROM users WHERE email = ? LIMIT 1", [cleanEmail]);

    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(409).json({ status: "error", message: "Email already exists. Please login instead." });
    }

    const [invites] = await connection.query(
      `SELECT id, status FROM employee_invites WHERE partnership_id = ? AND email = ? LIMIT 1`,
      [partnershipId, cleanEmail]
    );

    if (invites.length === 0) {
      await connection.rollback();
      return res.status(403).json({
        status: "error",
        message: "This email is not approved for this employer portal. Please contact your employer or HomeBoost support.",
      });
    }

    const invite = invites[0];

    if (invite.status === "revoked") {
      await connection.rollback();
      return res.status(403).json({ status: "error", message: "This invite has been revoked." });
    }

    if (invite.status === "registered") {
      await connection.rollback();
      return res.status(409).json({ status: "error", message: "This invite was already used. Please login instead." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await connection.query(
      `INSERT INTO users (full_name, email, password, role, partnership_id, is_active)
       VALUES (?, ?, ?, 'employee', ?, 1)`,
      [cleanName, cleanEmail, passwordHash, partnershipId]
    );

    await connection.query(
      `UPDATE employee_invites SET status = 'registered', registered_user_id = ?, registered_at = NOW() WHERE id = ?`,
      [result.insertId, invite.id]
    );

    await connection.commit();

    res.status(201).json({
      status: "success",
      message: "Employee account created successfully",
      user_id: result.insertId,
      partnership_id: partnershipId,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Registration failed", error);
    res.status(500).json({ status: "error", message: "Registration failed" });
  } finally {
    if (connection) connection.release();
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = normalizeEmail(email);

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
      return res.status(401).json({ status: "error", message: "Invalid email or password" });
    }

    const user = users[0];

    if (Number(user.is_active) !== 1) {
      return res.status(403).json({ status: "error", message: "Account is disabled" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({ status: "error", message: "Invalid email or password" });
    }

    const token = signAccessToken(user);
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
    console.error("Login failed", error);
    res.status(500).json({ status: "error", message: "Login failed" });
  }
};

exports.me = async (req, res) => {
  res.json({ status: "success", user: req.user });
};
