const pool = require("../config/db");
const { createNotification, createAdminNotification } = require("../utils/notificationService");

const VALID_STATUSES = new Set(["pending", "approved", "rejected", "completed"]);

const normalizeDateForMySQL = (value) => {
  if (!value) return null;
  return String(value).trim().replace("T", " ").slice(0, 19);
};

const normalizeOptionalText = (value, maxLength = 1000) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
};

const normalizeMeetingLink = (value) => {
  const link = normalizeOptionalText(value, 500);
  if (!link) return null;
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
};

const canManageAppointment = (user, appointment) => {
  if (!user || !appointment) return false;
  if (user.role === "admin" || user.role === "super_admin") return true;
  if (user.role === "hbt_admin" || user.role === "hbt_member") {
    return Number(user.team_id) === Number(appointment.team_id);
  }
  return false;
};

const canCancelAppointment = (user, appointment) => {
  if (canManageAppointment(user, appointment)) return true;
  return user.role === "employee" && Number(user.id) === Number(appointment.employee_user_id);
};

const getAppointment = async (appointmentId) => {
  const [rows] = await pool.query(
    `SELECT a.*, p.team_id, u.full_name AS employee_name, u.email AS employee_email
     FROM appointments a
     LEFT JOIN partnerships p ON a.partnership_id = p.id
     LEFT JOIN users u ON a.employee_user_id = u.id
     WHERE a.id = ?
     LIMIT 1`,
    [appointmentId]
  );

  return rows[0] || null;
};

const findConflict = async ({ teamMemberId, preferredDate, excludeAppointmentId, statuses }) => {
  const safeStatuses = statuses.filter((status) => VALID_STATUSES.has(status));
  if (safeStatuses.length === 0) return null;

  const placeholders = safeStatuses.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT id, topic, status, preferred_date
     FROM appointments
     WHERE team_member_id = ?
       AND status IN (${placeholders})
       AND preferred_date IS NOT NULL
       AND preferred_date < DATE_ADD(?, INTERVAL 60 MINUTE)
       AND DATE_ADD(preferred_date, INTERVAL 60 MINUTE) > ?
       AND id <> ?
     LIMIT 1`,
    [teamMemberId, ...safeStatuses, preferredDate, preferredDate, excludeAppointmentId]
  );

  return rows[0] || null;
};

const notifyAppointmentUpdated = async ({ appointment, title, message }) => {
  await createNotification({
    user_id: appointment.employee_user_id,
    target_partnership_id: appointment.partnership_id,
    title,
    message,
    link: "/employee/appointments",
    type: "appointment",
  });

  await createAdminNotification({
    title,
    message: `Appointment #${appointment.id}: ${message}`,
    link: "/admin/appointments",
    type: "appointment",
  });
};

const notifyHBTTeam = async ({ appointment, title, message }) => {
  if (!appointment.team_id) return;

  await createNotification({
    target_role: "hbt_admin",
    target_team_id: appointment.team_id,
    title,
    message,
    link: "/hbt/appointments",
    type: "appointment",
  });

  await createNotification({
    target_role: "hbt_member",
    target_team_id: appointment.team_id,
    title,
    message,
    link: "/hbt/appointments",
    type: "appointment",
  });
};

exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const appointmentId = Number(req.params.id);
    const { status } = req.body;

    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ status: "error", message: "Invalid appointment status" });
    }

    const appointment = await getAppointment(appointmentId);

    if (!appointment) {
      return res.status(404).json({ status: "error", message: "Appointment not found" });
    }

    if (!canManageAppointment(req.user, appointment)) {
      return res.status(403).json({ status: "error", message: "You are not allowed to update this appointment" });
    }

    if (status === "approved" && appointment.team_member_id && appointment.preferred_date) {
      const conflict = await findConflict({
        teamMemberId: appointment.team_member_id,
        preferredDate: appointment.preferred_date,
        excludeAppointmentId: appointment.id,
        statuses: ["approved"],
      });

      if (conflict) {
        return res.status(409).json({
          status: "error",
          message: "This advisor already has an approved meeting at that time. Reject or complete the other meeting first.",
        });
      }
    }

    const advisorNote = normalizeOptionalText(req.body.advisor_note);
    const meetingLink = normalizeMeetingLink(req.body.meeting_link);

    await pool.query(
      `UPDATE appointments
       SET status = ?, advisor_note = ?, meeting_link = ?
       WHERE id = ?`,
      [status, advisorNote, meetingLink, appointmentId]
    );

    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    const hasMeetingUpdate = Boolean(meetingLink || advisorNote);

    await notifyAppointmentUpdated({
      appointment,
      title: hasMeetingUpdate ? "Appointment details updated" : `Appointment ${statusText}`,
      message: hasMeetingUpdate
        ? "Your advisor added or updated the meeting details for your appointment."
        : `Your appointment status changed to ${statusText}.`,
    });

    return res.json({ status: "success", message: "Appointment updated successfully" });
  } catch (error) {
    next(error);
  }
};

exports.rescheduleAppointment = async (req, res, next) => {
  try {
    const appointmentId = Number(req.params.id);
    const teamMemberId = Number(req.body.team_member_id);
    const preferredDate = normalizeDateForMySQL(req.body.preferred_date);

    if (!teamMemberId || !preferredDate) {
      return res.status(400).json({ status: "error", message: "Advisor and new appointment time are required" });
    }

    const appointment = await getAppointment(appointmentId);

    if (!appointment) {
      return res.status(404).json({ status: "error", message: "Appointment not found" });
    }

    if (!canManageAppointment(req.user, appointment)) {
      return res.status(403).json({ status: "error", message: "You are not allowed to reschedule this appointment" });
    }

    if (appointment.status === "completed") {
      return res.status(400).json({ status: "error", message: "Completed appointments cannot be rescheduled" });
    }

    const [teamMembers] = await pool.query(
      `SELECT id
       FROM team_members
       WHERE id = ? AND team_id = ? AND is_active = 1
       LIMIT 1`,
      [teamMemberId, appointment.team_id]
    );

    if (teamMembers.length === 0) {
      return res.status(400).json({ status: "error", message: "Selected advisor is not available for this HBT team" });
    }

    const conflict = await findConflict({
      teamMemberId,
      preferredDate,
      excludeAppointmentId: appointmentId,
      statuses: ["pending", "approved"],
    });

    if (conflict) {
      return res.status(409).json({
        status: "error",
        message: "Selected time is no longer available. Please choose another time.",
      });
    }

    const advisorNote = normalizeOptionalText(req.body.advisor_note);
    const meetingLink = normalizeMeetingLink(req.body.meeting_link);

    await pool.query(
      `UPDATE appointments
       SET team_member_id = ?, preferred_date = ?, status = 'pending', advisor_note = ?, meeting_link = ?
       WHERE id = ?`,
      [teamMemberId, preferredDate, advisorNote, meetingLink, appointmentId]
    );

    await notifyAppointmentUpdated({
      appointment,
      title: "Appointment rescheduled",
      message: "Your appointment time was changed. Please review the new appointment details.",
    });

    return res.json({ status: "success", message: "Appointment rescheduled successfully" });
  } catch (error) {
    next(error);
  }
};

exports.cancelAppointment = async (req, res, next) => {
  try {
    const appointmentId = Number(req.params.id);
    const appointment = await getAppointment(appointmentId);

    if (!appointment) {
      return res.status(404).json({ status: "error", message: "Appointment not found" });
    }

    if (!canCancelAppointment(req.user, appointment)) {
      return res.status(403).json({ status: "error", message: "You are not allowed to cancel this appointment" });
    }

    if (appointment.status === "completed") {
      return res.status(400).json({ status: "error", message: "Completed appointments cannot be cancelled" });
    }

    const reason = normalizeOptionalText(req.body.cancel_reason, 500);
    const actor = req.user.role === "employee" ? "Employee" : "Advisor";
    const cancelNote = reason ? `${actor} cancelled: ${reason}` : `${actor} cancelled this appointment.`;

    await pool.query(
      `UPDATE appointments
       SET status = 'rejected', advisor_note = ?
       WHERE id = ?`,
      [cancelNote, appointmentId]
    );

    await notifyAppointmentUpdated({
      appointment,
      title: "Appointment cancelled",
      message: cancelNote,
    });

    if (req.user.role === "employee") {
      const employeeName = appointment.employee_name || req.user.full_name || "An employee";
      await notifyHBTTeam({
        appointment,
        title: "Employee cancelled appointment",
        message: `${employeeName} cancelled ${appointment.topic || "an appointment"}. ${reason ? `Reason: ${reason}` : ""}`.trim(),
      });
    }

    return res.json({ status: "success", message: "Appointment cancelled successfully" });
  } catch (error) {
    next(error);
  }
};
