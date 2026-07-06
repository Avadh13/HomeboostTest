const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const appointmentController = require("../controllers/appointmentController");
const appointmentStatusController = require("../controllers/appointmentStatusController");
const { createAppointmentReminderPlan } = require("../services/appointmentAutomationService");

const createAppointmentWithReminders = async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = async (body) => {
    if (res.statusCode === 201 && body?.appointment_id) {
      try {
        await createAppointmentReminderPlan(body.appointment_id);
        return originalJson({ ...body, reminders_planned: true });
      } catch (error) {
        return originalJson({ ...body, reminders_planned: false, reminder_warning: error.message });
      }
    }

    return originalJson(body);
  };

  return appointmentController.createAppointment(req, res, next);
};

router.use(protect);

router.get("/available-times", appointmentController.getAvailableTimes);
router.post("/", createAppointmentWithReminders);
router.get("/my", appointmentController.getMyAppointments);
router.get("/hbt", appointmentController.getHBTAppointments);
router.get("/admin", appointmentController.getAdminAppointments);
router.put("/:id/reschedule", appointmentStatusController.rescheduleAppointment);
router.put("/:id/cancel", appointmentStatusController.cancelAppointment);
router.put("/:id/status", appointmentStatusController.updateAppointmentStatus);

module.exports = router;
