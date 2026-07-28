const express = require("express");
const router = express.Router();

const contactController = require("../controllers/contactController");
const protect = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/roleMiddleware");

router.post("/", contactController.createContactMessage);
router.get("/", protect, requireAdmin, contactController.getContactMessages);
router.put("/:id/read", protect, requireAdmin, contactController.markMessageRead);
router.delete("/:id", protect, requireAdmin, contactController.deleteContactMessage);

module.exports = router;
