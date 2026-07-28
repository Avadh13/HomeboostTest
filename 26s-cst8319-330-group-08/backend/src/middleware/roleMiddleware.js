const requireRoles = (...allowedRoles) => {
  const allowed = new Set(allowedRoles.flat().filter(Boolean));

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: "error", message: "Authentication required" });
    }

    if (!allowed.has(req.user.role)) {
      return res.status(403).json({ status: "error", message: "Insufficient permissions" });
    }

    return next();
  };
};

const requireAdmin = requireRoles("admin", "super_admin");

module.exports = { requireRoles, requireAdmin };
