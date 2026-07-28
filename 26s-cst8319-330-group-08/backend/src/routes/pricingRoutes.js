const express = require("express");
const router = express.Router();

const pricingController = require("../controllers/pricingController");
const protect = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/roleMiddleware");

router.get("/", pricingController.getPricingPlans);
router.post("/", protect, requireAdmin, pricingController.createPricingPlan);
router.put("/:id", protect, requireAdmin, pricingController.updatePricingPlan);
router.delete("/:id", protect, requireAdmin, pricingController.deletePricingPlan);

module.exports = router;
