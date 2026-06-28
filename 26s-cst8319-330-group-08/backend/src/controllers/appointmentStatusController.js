const pool = require("../config/db");
const { createNotification, createAdminNotification } = require("../utils/notificationService");

const VALID_STATUSES = new Set(["pending", "approved", "rejected", "completed"]);

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

const findApprovedConflict = async ({ teamMemberId, preferredDate, excludeAppointmentId }) => {
  const [rows] = await pool.query(
    `SELECT id, topic, preferred_date
     FROM appointments
     WHERE team_member_id = ?
       AND status = 'approved'
       AND preferred_date IS NOT NULL
       AND preferred_date < DATE_ADD(?, INTERVAL 60 MINUTE)
       AND DATE_ADD(preferred_date, INTERVAL 60 MINUTE) > ?
       AND id <> ?
     LIMIT 1`,
    [teamMemberId, preferredDate, preferredDate, excludeAppointmentId]
  );

  return rows[0] || null;
};

const notifyAppointmentUpdated = async ({ appointment, status, meetingLink, advisorNote }) => {
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);
  const hasMeetingUpdate = Boolean(meetingLink || advisorNote);

  await createNotification({
    user_id: appointment.employee_user_id,
    target_partnership_id: appointment.partnership_id,
    title: hasMeetingUpdate ? "Appointment details updated" : `Appointment ${statusText}`,
    message: hasMeetingUpdate
      ? "Your advisor added or updated the meeting details for your appointment."
      : `Your appointment status changed to ${statusText}.`,
    link: "/employee/appointments",
    type: "appointment",
  });

  await createAdminNotification({
    title: "Appointment updated",
    message: `Appointment #${appointment.id} was updated to ${statusText}.`,
    link: "/admin/appointments",
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

    const [rows] = await pool.query(
      `SELECT a.*, p.team_id
       FROM appointments a
       LEFT JOIN partnerships p ON a.partnership_id = p.id
       WHERE a.id = ?
       LIMIT 1`,
      [appointmentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Appointment not found" });
    }

    const appointment = rows[0];

    if (!canManageAppointment(req.user, appointment)) {
      return res.status(403).json({ status: "error", message: "You are not allowed to update this appointment" });
    }

    if (status === "approved" && appointment.team_member_id && appointment.preferred_date) {
      const conflict = await findApprovedConflict({
        teamMemberId: appointment.team_member_id,
        preferredDate: appointment.preferred_date,
        excludeAppointmentId: appointment.id,
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

    await notifyAppointmentUpdated({ appointment, status, meetingLink, advisorNote });

    return res.json({ status: "success", message: "Appointment updated successfully" });
  } catch (error) {
    next(error);
  }
};
