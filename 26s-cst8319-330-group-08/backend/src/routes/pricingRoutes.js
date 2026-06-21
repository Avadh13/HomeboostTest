const express = require("express");
const router = express.Router();

const pricingController = require("../controllers/pricingController");

router.get("/", pricingController.getPricingPlans);
router.post("/", pricingController.createPricingPlan);
router.put("/:id", pricingController.updatePricingPlan);
router.delete("/:id", pricingController.deletePricingPlan);

module.exports = router;