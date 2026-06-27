const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const notificationController = require("../controllers/notificationController");

router.use(protect);

router.get("/", notificationController.getNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.put("/mark-all-read", notificationController.markAllRead);
router.put("/:id/read", notificationController.markNotificationRead);

module.exports = router;
