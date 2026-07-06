const pool = require("../config/db");
const { createNotification, createAdminNotification } = require("../utils/notificationService");

const ensureAutomationTables = async (connection = pool) => {
  await connection.query(`CREATE TABLE IF NOT EXISTS appointment_reminders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id INT NOT NULL,
    reminder_type VARCHAR(50) NOT NULL,
    due_at DATETIME NOT NULL,
    status VARCHAR(30) DEFAULT 'pending',
    sent_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_appointment_reminder (appointment_id, reminder_type),
    INDEX idx_appointment_reminders_due (due_at),
    INDEX idx_appointment_reminders_status (status)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS automation_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    automation_type VARCHAR(80) NOT NULL,
    entity_type VARCHAR(80) NULL,
    entity_id INT NULL,
    status VARCHAR(40) NOT NULL,
    message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_automation_logs_type (automation_type),
    INDEX idx_automation_logs_status (status),
    INDEX idx_automation_logs_created (created_at)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS notification_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    appointment_confirmations TINYINT(1) DEFAULT 1,
    appointment_reminders TINYINT(1) DEFAULT 1,
    document_notifications TINYINT(1) DEFAULT 1,
    task_notifications TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_notification_preferences_user (user_id)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS hbt_member_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    team_id INT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    task_date DATE NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(30) DEFAULT 'todo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hbt_member_tasks_user (user_id),
    INDEX idx_hbt_member_tasks_team (team_id),
    INDEX idx_hbt_member_tasks_status (status),
    INDEX idx_hbt_member_tasks_date (task_date)
  )`);
};

const logAutomation = async ({ type, entityType = null, entityId = null, status = "success", message = null }) => {
  await ensureAutomationTables();
  await pool.query(
    `INSERT INTO automation_logs (automation_type, entity_type, entity_id, status, message)
     VALUES (?, ?, ?, ?, ?)`,
    [type, entityType, entityId, status, message]
  );
};

const getAppointmentForAutomation = async (appointmentId) => {
  const [[appointment]] = await pool.query(
    `SELECT
       a.*,
       p.team_id,
       u.full_name AS employee_name,
       u.email AS employee_email,
       tm.full_name AS advisor_name,
       tm.user_id AS advisor_user_id
     FROM appointments a
     LEFT JOIN partnerships p ON p.id = a.partnership_id
     LEFT JOIN users u ON u.id = a.employee_user_id
     LEFT JOIN team_members tm ON tm.id = a.team_member_id
     WHERE a.id = ?
     LIMIT 1`,
    [appointmentId]
  );
  return appointment || null;
};

const createAppointmentReminderPlan = async (appointmentId) => {
  await ensureAutomationTables();
  const appointment = await getAppointmentForAutomation(appointmentId);
  if (!appointment || !appointment.preferred_date) return null;

  await pool.query("DELETE FROM appointment_reminders WHERE appointment_id = ? AND status = 'pending'", [appointmentId]);

  const reminders = [
    [appointmentId, "confirmation", new Date()],
    [appointmentId, "reminder_24h", new Date(new Date(appointment.preferred_date).getTime() - 24 * 60 * 60 * 1000)],
    [appointmentId, "reminder_1h", new Date(new Date(appointment.preferred_date).getTime() - 60 * 60 * 1000)],
    [appointmentId, "missed_followup", new Date(new Date(appointment.preferred_date).getTime() + 75 * 60 * 1000)],
  ];

  for (const [apptId, type, due] of reminders) {
    await pool.query(
      `INSERT INTO appointment_reminders (appointment_id, reminder_type, due_at, status)
       VALUES (?, ?, ?, 'pending')
       ON DUPLICATE KEY UPDATE due_at = VALUES(due_at), status = 'pending', sent_at = NULL`,
      [apptId, type, due]
    );
  }

  await logAutomation({
    type: "appointment_reminder_plan",
    entityType: "appointment",
    entityId: appointmentId,
    status: "success",
    message: "Appointment reminders planned",
  });

  return appointment;
};

const createAdvisorTask = async ({ appointment, title, description, taskDate = null, priority = "high" }) => {
  if (!appointment?.team_id) return null;

  let assigneeUserId = appointment.advisor_user_id || null;
  if (!assigneeUserId) {
    const [[fallbackUser]] = await pool.query(
      `SELECT id FROM users WHERE role IN ('hbt_member', 'hbt_admin') AND team_id = ? AND is_active = 1 ORDER BY FIELD(role, 'hbt_member', 'hbt_admin'), id ASC LIMIT 1`,
      [appointment.team_id]
    );
    assigneeUserId = fallbackUser?.id || null;
  }

  if (!assigneeUserId) return null;

  const [result] = await pool.query(
    `INSERT INTO hbt_member_tasks (user_id, team_id, title, description, task_date, priority, status)
     VALUES (?, ?, ?, ?, ?, ?, 'todo')`,
    [assigneeUserId, appointment.team_id, title.slice(0, 180), description || null, taskDate, priority]
  );

  return result.insertId;
};

const sendReminderNotification = async (reminder, appointment) => {
  const employeeName = appointment.employee_name || "Employee";
  const topic = appointment.topic || "appointment";

  if (reminder.reminder_type === "confirmation") {
    await createNotification({
      user_id: appointment.employee_user_id,
      target_partnership_id: appointment.partnership_id,
      title: "Appointment reminder scheduled",
      message: `Your ${topic} appointment reminder has been scheduled with HomeBoost.`,
      link: "/employee/appointments",
      type: "appointment",
    });
    return "Confirmation sent";
  }

  if (reminder.reminder_type === "reminder_24h" || reminder.reminder_type === "reminder_1h") {
    const label = reminder.reminder_type === "reminder_24h" ? "24 hours" : "1 hour";
    await createNotification({
      user_id: appointment.employee_user_id,
      target_partnership_id: appointment.partnership_id,
      title: `Appointment reminder: ${label}`,
      message: `Your HomeBoost appointment for ${topic} is coming up in about ${label}.`,
      link: "/employee/appointments",
      type: "appointment",
    });
    return `${label} reminder sent`;
  }

  if (reminder.reminder_type === "missed_followup") {
    if (!["pending", "approved"].includes(appointment.status)) return "Skipped missed follow-up; appointment is not active";

    await createNotification({
      target_role: "hbt_admin",
      target_team_id: appointment.team_id,
      title: "Appointment follow-up needed",
      message: `${employeeName}'s ${topic} appointment time has passed. Review status and follow up if needed.`,
      link: "/hbt/appointments",
      type: "appointment",
    });
    await createNotification({
      target_role: "hbt_member",
      target_team_id: appointment.team_id,
      title: "Appointment follow-up needed",
      message: `${employeeName}'s ${topic} appointment time has passed. Review status and follow up if needed.`,
      link: "/hbt/appointments",
      type: "appointment",
    });

    await createAdvisorTask({
      appointment,
      title: `Follow up: ${employeeName}`,
      description: `Appointment "${topic}" time passed. Confirm if completed, missed, or needs reschedule.`,
      taskDate: new Date().toISOString().slice(0, 10),
      priority: "high",
    });
    return "Missed appointment follow-up created";
  }

  return "No action for reminder type";
};

const runAppointmentAutomation = async () => {
  await ensureAutomationTables();

  const [reminders] = await pool.query(
    `SELECT ar.*
     FROM appointment_reminders ar
     WHERE ar.status = 'pending' AND ar.due_at <= NOW()
     ORDER BY ar.due_at ASC
     LIMIT 50`
  );

  const results = [];

  for (const reminder of reminders) {
    try {
      const appointment = await getAppointmentForAutomation(reminder.appointment_id);
      if (!appointment) {
        await pool.query("UPDATE appointment_reminders SET status = 'skipped', sent_at = NOW() WHERE id = ?", [reminder.id]);
        results.push({ reminder_id: reminder.id, status: "skipped", message: "Appointment not found" });
        continue;
      }

      if (["rejected", "cancelled"].includes(appointment.status)) {
        await pool.query("UPDATE appointment_reminders SET status = 'skipped', sent_at = NOW() WHERE id = ?", [reminder.id]);
        results.push({ reminder_id: reminder.id, status: "skipped", message: "Appointment cancelled/rejected" });
        continue;
      }

      const message = await sendReminderNotification(reminder, appointment);
      await pool.query("UPDATE appointment_reminders SET status = 'sent', sent_at = NOW() WHERE id = ?", [reminder.id]);
      await logAutomation({ type: "appointment_reminder", entityType: "appointment", entityId: appointment.id, status: "success", message });
      results.push({ reminder_id: reminder.id, status: "sent", message });
    } catch (error) {
      await pool.query("UPDATE appointment_reminders SET status = 'failed' WHERE id = ?", [reminder.id]);
      await logAutomation({ type: "appointment_reminder", entityType: "appointment", entityId: reminder.appointment_id, status: "failed", message: error.message });
      results.push({ reminder_id: reminder.id, status: "failed", message: error.message });
    }
  }

  return results;
};

const createCompletionFollowUpTask = async (appointmentId) => {
  await ensureAutomationTables();
  const appointment = await getAppointmentForAutomation(appointmentId);
  if (!appointment) return null;

  const taskId = await createAdvisorTask({
    appointment,
    title: `Post-meeting follow-up: ${appointment.employee_name || "Employee"}`,
    description: `Create notes and next steps after appointment "${appointment.topic || "Appointment"}".`,
    taskDate: new Date().toISOString().slice(0, 10),
    priority: "normal",
  });

  if (taskId) {
    await logAutomation({ type: "appointment_completion_task", entityType: "appointment", entityId: appointmentId, status: "success", message: "Advisor follow-up task created" });
  }

  return taskId;
};

module.exports = {
  ensureAutomationTables,
  createAppointmentReminderPlan,
  runAppointmentAutomation,
  createCompletionFollowUpTask,
};
