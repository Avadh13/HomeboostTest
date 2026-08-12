const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const getRedirectPath = (role) => {
  if (role === "admin" || role === "super_admin") return "/admin";
  if (role === "hbt_admin") return "/hbt/dashboard";
  if (role === "hbt_member") return "/hbt/member-dashboard";
  if (role === "company_admin" || role === "company") return "/company/dashboard";
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
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" },
  );
};

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

exports.register = async (_req, res) => {
  return res.status(410).json({
    status: "error",
    code: "INVITATION_REQUIRED",
    message: "Employee registration now requires a secure invitation link or code. Open the invitation sent by your employer or Home Buying Team.",
  });
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
      [cleanEmail],
    );

    if (users.length === 0) {
      return res.status(401).json({ status: "error", message: "Invalid email or password" });
    }

    const user = users[0];
    if (Number(user.is_active) !== 1) {
      return res.status(403).json({ status: "error", message: "Account is disabled or pending activation" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ status: "error", message: "Invalid email or password" });
    }

    const token = signAccessToken(user);
    const redirectTo = getRedirectPath(user.role);

    return res.json({
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
    return res.status(500).json({ status: "error", message: "Login failed" });
  }
};

exports.me = async (req, res) => {
  return res.json({ status: "success", user: req.user });
};
