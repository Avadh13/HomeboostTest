const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const eventController = require("../controllers/eventController");

const hbtAdminOrPlatformAdmin = (req, res, next) => {
  if (["admin", "super_admin", "hbt_admin"].includes(req.user?.role)) return next();
  return res.status(403).json({ status: "error", message: "HBT Admin access required" });
};

router.get("/hbt", protect, eventController.getHBTEvents);
router.post("/hbt", protect, hbtAdminOrPlatformAdmin, eventController.createHBTEvent);
router.delete("/hbt/:id", protect, hbtAdminOrPlatformAdmin, eventController.deleteHBTEvent);

module.exports = router;
