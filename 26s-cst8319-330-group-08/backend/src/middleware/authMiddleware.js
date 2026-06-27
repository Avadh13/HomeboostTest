const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "Not authorized. No token provided.",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [users] = await pool.query(
      `SELECT id, full_name, email, role, team_id, partnership_id, is_active
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({ status: "error", message: "User not found." });
    }

    const user = users[0];

    if (Number(user.is_active) !== 1) {
      return res.status(403).json({ status: "error", message: "Account is disabled." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Not authorized. Invalid or expired token.",
    });
  }
};

module.exports = protect;
