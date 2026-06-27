const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const appointmentController = require("../controllers/appointmentController");

router.use(protect);

router.post("/", appointmentController.createAppointment);
router.get("/my", appointmentController.getMyAppointments);
router.get("/hbt", appointmentController.getHBTAppointments);
router.get("/admin", appointmentController.getAdminAppointments);
router.put("/:id/status", appointmentController.updateAppointmentStatus);

module.exports = router;
