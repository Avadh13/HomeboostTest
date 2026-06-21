const express = require("express");
const router = express.Router();

const hbtController = require("../controllers/hbtController");
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

router.get("/", protect, adminOnly, hbtController.getHBTs);

router.post("/", protect, adminOnly, hbtController.createHBT);

router.put("/:id", protect, adminOnly, hbtController.updateHBT);

router.delete("/:id", protect, adminOnly, hbtController.deleteHBT);

module.exports = router;