const express = require("express");
const router = express.Router();

const pageController = require("../controllers/pageController");
const protect = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/roleMiddleware");

router.get("/", pageController.getPages);
router.put("/:id", protect, requireAdmin, pageController.updatePage);
router.get("/:slug", pageController.getPageBySlug);

module.exports = router;
