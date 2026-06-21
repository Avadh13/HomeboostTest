const adminOnly = (req, res, next) => {
  if (!req.user || !["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({ status: "error", message: "Admin access only." });
  }
  next();
};

module.exports = adminOnly;
