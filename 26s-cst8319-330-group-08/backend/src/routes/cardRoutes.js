const express = require("express");
const router = express.Router();

const cardController = require("../controllers/cardController");
const protect = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/roleMiddleware");

router.get("/", cardController.getCards);
router.post("/", protect, requireAdmin, cardController.createCard);
router.put("/:id", protect, requireAdmin, cardController.updateCard);
router.delete("/:id", protect, requireAdmin, cardController.deleteCard);

module.exports = router;
