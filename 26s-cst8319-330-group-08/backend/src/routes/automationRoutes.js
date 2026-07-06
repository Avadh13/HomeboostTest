const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");
const {
  ensureAutomationTables,
  createAppointmentReminderPlan,
  runAppointmentAutomation,
} = require("../services/appointmentAutomationService");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const hbtRoles = ["hbt_admin", "hbt_member"];
const canRunAutomation = (user) => adminRoles.includes(user?.role) || hbtRoles.includes(user?.role);

router.use(protect);

router.get("/appointment-reminders", async (req, res) => {
  try {
    if (!canRunAutomation(req.user)) return res.status(403).json({ status: "error", message: "Admin or HBT access required" });
    await ensureAutomationTables();

    const params = [];
    let teamClause = "";
    if (hbtRoles.includes(req.user.role)) {
      teamClause = "AND p.team_id = ?";
      params.push(req.user.team_id);
    }

    const [reminders] = await pool.query(
      `SELECT ar.*, a.topic, a.status AS appointment_status, a.preferred_date, u.full_name AS employee_name
       FROM appointment_reminders ar
       JOIN appointments a ON a.id = ar.appointment_id
       LEFT JOIN partnerships p ON p.id = a.partnership_id
       LEFT JOIN users u ON u.id = a.employee_user_id
       WHERE 1=1 ${teamClause}
       ORDER BY ar.due_at ASC, ar.id DESC
       LIMIT 200`,
      params
    );

    return res.json({ status: "success", reminders });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load appointment reminders", error: error.message });
  }
});

router.post("/appointment-reminders/plan/:appointmentId", async (req, res) => {
  try {
    if (!canRunAutomation(req.user)) return res.status(403).json({ status: "error", message: "Admin or HBT access required" });
    const appointment = await createAppointmentReminderPlan(Number(req.params.appointmentId));
    if (!appointment) return res.status(404).json({ status: "error", message: "Appointment not found or missing preferred date" });
    return res.json({ status: "success", message: "Appointment reminders planned" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to plan appointment reminders", error: error.message });
  }
});

router.post("/appointment-reminders/run", async (req, res) => {
  try {
    if (!canRunAutomation(req.user)) return res.status(403).json({ status: "error", message: "Admin or HBT access required" });
    const results = await runAppointmentAutomation();
    return res.json({ status: "success", processed: results.length, results });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to run appointment automation", error: error.message });
  }
});

router.get("/logs", async (req, res) => {
  try {
    if (!canRunAutomation(req.user)) return res.status(403).json({ status: "error", message: "Admin or HBT access required" });
    await ensureAutomationTables();
    const [logs] = await pool.query(
      `SELECT id, automation_type, entity_type, entity_id, status, message, created_at
       FROM automation_logs
       ORDER BY id DESC
       LIMIT 100`
    );
    return res.json({ status: "success", logs });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load automation logs", error: error.message });
  }
});

router.get("/notification-preferences", async (req, res) => {
  try {
    await ensureAutomationTables();
    await pool.query(
      `INSERT IGNORE INTO notification_preferences (user_id) VALUES (?)`,
      [req.user.id]
    );
    const [[preferences]] = await pool.query(
      `SELECT user_id, appointment_confirmations, appointment_reminders, document_notifications, task_notifications
       FROM notification_preferences
       WHERE user_id = ?
       LIMIT 1`,
      [req.user.id]
    );
    return res.json({ status: "success", preferences });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load notification preferences", error: error.message });
  }
});

router.put("/notification-preferences", async (req, res) => {
  try {
    await ensureAutomationTables();
    const bool = (value) => (value === false || value === 0 || value === "0" ? 0 : 1);
    await pool.query(
      `INSERT INTO notification_preferences
       (user_id, appointment_confirmations, appointment_reminders, document_notifications, task_notifications)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         appointment_confirmations = VALUES(appointment_confirmations),
         appointment_reminders = VALUES(appointment_reminders),
         document_notifications = VALUES(document_notifications),
         task_notifications = VALUES(task_notifications)`,
      [
        req.user.id,
        bool(req.body.appointment_confirmations),
        bool(req.body.appointment_reminders),
        bool(req.body.document_notifications),
        bool(req.body.task_notifications),
      ]
    );
    return res.json({ status: "success", message: "Notification preferences updated" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update notification preferences", error: error.message });
  }
});

module.exports = router;
