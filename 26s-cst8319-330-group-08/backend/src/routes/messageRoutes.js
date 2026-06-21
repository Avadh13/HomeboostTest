const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const messageController = require("../controllers/messageController");

router.post("/presence", protect, messageController.updatePresence);

router.get("/contacts", protect, messageController.getContacts);

router.get("/threads", protect, messageController.getThreads);

router.get("/threads/:id", protect, messageController.getThreadDetails);

router.post("/threads", protect, messageController.createThread);

router.post("/threads/:id/reply", protect, messageController.replyToThread);

router.put("/threads/:id/status", protect, messageController.updateThreadStatus);

router.put("/threads/:id/assign", protect, messageController.assignThread);

module.exports = router;