const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const protect = require("../middleware/authMiddleware");

const adminOnly = (req, res, next) => {
  if (
    !req.user ||
    (req.user.role !== "admin" && req.user.role !== "super_admin")
  ) {
    return res.status(403).json({
      message: "Admin access required",
    });
  }

  next();
};

router.get("/", protect, adminOnly, userController.getUsers);

router.put("/:id/role", protect, adminOnly, userController.updateUserRole);

router.put("/:id/status", protect, adminOnly, userController.updateUserStatus);

module.exports = router;