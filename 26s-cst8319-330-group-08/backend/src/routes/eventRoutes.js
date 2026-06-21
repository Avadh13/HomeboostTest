const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const eventController = require("../controllers/eventController");

router.get("/hbt", protect, eventController.getHBTEvents);
router.post("/hbt", protect, eventController.createHBTEvent);
router.delete("/hbt/:id", protect, eventController.deleteHBTEvent);

module.exports = router;
