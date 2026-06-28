const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const appointmentController = require("../controllers/appointmentController");
const appointmentStatusController = require("../controllers/appointmentStatusController");

router.use(protect);

router.get("/available-times", appointmentController.getAvailableTimes);
router.post("/", appointmentController.createAppointment);
router.get("/my", appointmentController.getMyAppointments);
router.get("/hbt", appointmentController.getHBTAppointments);
router.get("/admin", appointmentController.getAdminAppointments);
router.put("/:id/status", appointmentStatusController.updateAppointmentStatus);

module.exports = router;
