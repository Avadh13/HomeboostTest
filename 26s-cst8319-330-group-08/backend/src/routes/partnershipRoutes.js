const express = require("express");
const router = express.Router();

const {
  getPartnershipBySlug,
  createPartnership,
  getHBTPartnerships,
  getHBTEmployees,
} = require("../controllers/partnershipController");

const protect = require("../middleware/authMiddleware");

const hbtAdminOrPlatformAdmin = (req, res, next) => {
  if (["admin", "super_admin", "hbt_admin"].includes(req.user?.role)) return next();
  return res.status(403).json({ status: "error", message: "HBT Admin access required" });
};

router.get("/public/:slug", getPartnershipBySlug);
router.get("/hbt", protect, getHBTPartnerships);
router.get("/hbt/employees", protect, getHBTEmployees);
router.post("/", protect, hbtAdminOrPlatformAdmin, createPartnership);

module.exports = router;
