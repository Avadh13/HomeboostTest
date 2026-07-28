const express = require("express");
const router = express.Router();

const faqController = require("../controllers/faqController");
const protect = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/roleMiddleware");

router.get("/", faqController.getFAQs);
router.post("/", protect, requireAdmin, faqController.createFAQ);
router.put("/:id", protect, requireAdmin, faqController.updateFAQ);
router.delete("/:id", protect, requireAdmin, faqController.deleteFAQ);

module.exports = router;
