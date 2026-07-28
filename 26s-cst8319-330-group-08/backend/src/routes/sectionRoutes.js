const express = require("express");
const router = express.Router();

const sectionController = require("../controllers/sectionController");
const protect = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/roleMiddleware");

router.get("/", sectionController.getSections);
router.post("/", protect, requireAdmin, sectionController.createSection);
router.put("/:id", protect, requireAdmin, sectionController.updateSection);
router.delete("/:id", protect, requireAdmin, sectionController.deleteSection);

module.exports = router;
