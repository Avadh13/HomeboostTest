const express = require("express");
const router = express.Router();

const {
  getPartnershipBySlug,
  createPartnership,
  getHBTPartnerships,
  getHBTEmployees,
} = require("../controllers/partnershipController");

const protect = require("../middleware/authMiddleware");

router.get("/public/:slug", getPartnershipBySlug);
router.get("/hbt", protect, getHBTPartnerships);
router.get("/hbt/employees", protect, getHBTEmployees);
router.post("/", protect, createPartnership);

module.exports = router;
