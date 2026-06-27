const pool = require("../config/db");
const { createNotification, createAdminNotification } = require("../utils/notificationService");

const VALID_STATUSES = new Set(["pending", "approved", "rejected", "completed"]);
const MEETING_MINUTES = 60;

const normalizeDateForMySQL = (value) => {
  if (!value) return null;
  return String(value).trim().replace("T", " ").slice(0, 19);
};

const normalizeOptionalText = (value, maxLength = 1000) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

const normalizeMeetingLink = (value) => {
  const link = normalizeOptionalText(value, 500);
  if (!link) return null;

  if (!/^https?:\/\//i.test(link)) {
    return `https://${link}`;
  }

  return link;
};

const pad = (value) => String(value).padStart(2, "0");
const toDateTime = (date, minutes) => `${date} ${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00`;
const toDisplayTime = (dateTime) =>
  new Date(dateTime.replace(" ", "T")).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

const canManageAppointment = (user, appointment) => {
  if (!user || !appointment) return false;

  if (user.role === "admin" || user.role === "super_admin") return true;

  if (user.role === "hbt_admin" || user.role === "hbt_member") {
    return Number(user.team_id) === Number(appointment.team_id);
  }

  return false;
};

const verifyTeamMemberAccess = async ({ user, teamMemberId, partnershipId }) => {
  if (!teamMemberId) return null;

  let query = "SELECT id, team_id FROM team_members WHERE id = ? AND is_active = 1";
  const params = [teamMemberId];

  if (user.role === "employee") {
    query = `SELECT tm.id, tm.team_id
             FROM team_members tm
             JOIN partnerships p ON tm.team_id = p.team_id
             WHERE tm.id = ? AND p.id = ? AND tm.is_active = 1`;
    params.push(partnershipId);
  } else if (user.role === "hbt_admin" || user.role === "hbt_member") {
    query += " AND team_id = ?";
    params.push(user.team_id);
  }

  const [rows] = await pool.query(`${query} LIMIT 1`, params);
  return rows[0] || null;
};

const findAppointmentConflict = async ({ teamMemberId, startDateTime, excludeAppointmentId = null }) => {
  const params = [teamMemberId, startDateTime, startDateTime];
  let excludeClause = "";

  if (excludeAppointmentId) {
    excludeClause = "AND id <> ?";
    params.push(excludeAppointmentId);
  }

  const [rows] = await pool.query(
    `SELECT id, topic, status, preferred_date
     FROM appointments
     WHERE team_member_id = ?
       AND status IN ('pending', 'approved')
       AND preferred_date IS NOT NULL
       AND preferred_date < DATE_ADD(?, INTERVAL 60 MINUTE)
       AND DATE_ADD(preferred_date, INTERVAL 60 MINUTE) > ?
       ${excludeClause}
     LIMIT 1`,
    params
  );

  return rows[0] || null;
};

const notifyAppointmentCreated = async ({ employee, partnershipId, teamId, topic }) => {
  await createNotification({
    target_role: "hbt_admin",
    target_team_id: teamId,
    title: "New appointment request",
    message: `${employee.full_name} requested an appointment: ${topic}`,
    link: "/hbt/appointments",
    type: "appointment",
  });

  await createNotification({
    target_role: "hbt_member",
    target_team_id: teamId,
    title: "New appointment request",
    message: `${employee.full_name} requested an appointment: ${topic}`,
    link: "/hbt/appointments",
    type: "appointment",
  });

  await createAdminNotification({
    title: "New employee appointment request",
    message: `${employee.full_name} submitted a new appointment request.`,
    link: "/admin/appointments",
    type: "appointment",
  });

  await createNotification({
    user_id: employee.id,
    target_partnership_id: partnershipId,
    title: "Appointment request submitted",
    message: "Your appointment request was sent to your Home Buying Team.",
    link: "/employee/appointments",
    type: "success",
  });
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

exports.getAvailableTimes = async (req, res, next) => {
  try {
    const teamMemberId = Number(req.query.team_member_id);
    const date = String(req.query.date || "").trim();

    if (!teamMemberId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ status: "error", message: "Advisor and date are required" });
    }

    const teamMember = await verifyTeamMemberAccess({
      user: req.user,
      teamMemberId,
      partnershipId: req.user.partnership_id,
    });

    if (!teamMember) {
      return res.status(403).json({ status: "error", message: "Advisor is not available for this account" });
    }

    const dayOfWeek = new Date(`${date}T00:00:00`).getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.json({ duration_minutes: MEETING_MINUTES, available_times: [] });
    }

    const availableTimes = [];

    for (let minutes = 9 * 60; minutes < 17 * 60; minutes += MEETING_MINUTES) {
      const value = toDateTime(date, minutes);
      const conflict = await findAppointmentConflict({ teamMemberId, startDateTime: value });

      if (!conflict) {
        availableTimes.push({ value, label: toDisplayTime(value) });
      }
    }

    res.json({ duration_minutes: MEETING_MINUTES, available_times: availableTimes });
  } catch (error) {
    next(error);
  }
};

exports.createAppointment = async (req, res, next) => {
  try {
    if (req.user.role !== "employee") {
      return res.status(403).json({ status: "error", message: "Only employees can request appointments" });
    }

    const { team_member_id, topic, preferred_date, message } = req.body;
    const teamMemberId = Number(team_member_id);
    const normalizedPreferredDate = normalizeDateForMySQL(preferred_date);

    if (!teamMemberId) {
      return res.status(400).json({ status: "error", message: "Please select an advisor" });
    }

    if (!normalizedPreferredDate) {
      return res.status(400).json({ status: "error", message: "Please select an available appointment time" });
    }

    if (!topic || String(topic).trim().length < 3) {
      return res.status(400).json({ status: "error", message: "Appointment topic is required" });
    }

    const partnershipId = req.user.partnership_id || null;

    if (!partnershipId) {
      return res.status(400).json({ status: "error", message: "Employee account is not linked to a partnership" });
    }

    const [partnershipRows] = await pool.query(
      "SELECT team_id FROM partnerships WHERE id = ? LIMIT 1",
      [partnershipId]
    );

    if (partnershipRows.length === 0) {
      return res.status(400).json({ status: "error", message: "Partnership not found" });
    }

    const teamId = partnershipRows[0].team_id;
    const teamMember = await verifyTeamMemberAccess({ user: req.user, teamMemberId, partnershipId });

    if (!teamMember) {
      return res.status(400).json({ status: "error", message: "Selected advisor is not available for this partnership" });
    }

    const conflict = await findAppointmentConflict({
      teamMemberId,
      startDateTime: normalizedPreferredDate,
    });

    if (conflict) {
      return res.status(409).json({
        status: "error",
        message: "This advisor already has a meeting at that time. Please select another time.",
      });
    }

    const normalizedTopic = String(topic).trim();

    const [result] = await pool.query(
      `INSERT INTO appointments
       (employee_user_id, team_member_id, partnership_id, topic, preferred_date, message, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.user.id,
        teamMemberId,
        partnershipId,
        normalizedTopic,
        normalizedPreferredDate,
        message ? String(message).trim() : null,
      ]
    );

    await notifyAppointmentCreated({ employee: req.user, partnershipId, teamId, topic: normalizedTopic });

    res.status(201).json({
      status: "success",
      message: "Appointment request submitted successfully",
      appointment_id: result.insertId,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyAppointments = async (req, res, next) => {
  try {
    if (req.user.role !== "employee") {
      return res.status(403).json({ status: "error", message: "Only employees can view their appointment requests" });
    }

    const [appointments] = await pool.query(
      `SELECT
        a.id,
        a.topic,
        a.preferred_date,
        a.message,
        a.advisor_note,
        a.meeting_link,
        a.status,
        a.created_at,
        a.updated_at,
        tm.full_name AS team_member_name,
        tm.title AS team_member_title,
        tm.email AS team_member_email,
        e.name AS employer_name,
        h.name AS hbt_name
       FROM appointments a
       LEFT JOIN team_members tm ON a.team_member_id = tm.id
       LEFT JOIN partnerships p ON a.partnership_id = p.id
       LEFT JOIN employers e ON p.employer_id = e.id
       LEFT JOIN home_buying_teams h ON p.team_id = h.id
       WHERE a.employee_user_id = ?
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );

    res.json(appointments);
  } catch (error) {
    next(error);
  }
};

exports.getHBTAppointments = async (req, res, next) => {
  try {
    if (req.user.role !== "hbt_admin" && req.user.role !== "hbt_member") {
      return res.status(403).json({ status: "error", message: "Only HBT users can view team appointments" });
    }

    const [appointments] = await pool.query(
      `SELECT
        a.id,
        a.topic,
        a.preferred_date,
        a.message,
        a.advisor_note,
        a.meeting_link,
        a.status,
        a.created_at,
        a.updated_at,
        a.employee_user_id,
        u.full_name AS employee_name,
        u.email AS employee_email,
        tm.full_name AS team_member_name,
        tm.title AS team_member_title,
        e.name AS employer_name,
        p.slug AS partnership_slug,
        p.team_id
       FROM appointments a
       JOIN users u ON a.employee_user_id = u.id
       LEFT JOIN team_members tm ON a.team_member_id = tm.id
       LEFT JOIN partnerships p ON a.partnership_id = p.id
       LEFT JOIN employers e ON p.employer_id = e.id
       WHERE p.team_id = ?
       ORDER BY
        CASE a.status
          WHEN 'pending' THEN 1
          WHEN 'approved' THEN 2
          WHEN 'completed' THEN 3
          WHEN 'rejected' THEN 4
          ELSE 5
        END,
        a.created_at DESC`,
      [req.user.team_id]
    );

    res.json(appointments);
  } catch (error) {
    next(error);
  }
};

exports.getAdminAppointments = async (req, res, next) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "super_admin") {
      return res.status(403).json({ status: "error", message: "Only admins can view all appointments" });
    }

    const [appointments] = await pool.query(
      `SELECT
        a.id,
        a.topic,
        a.preferred_date,
        a.message,
        a.advisor_note,
        a.meeting_link,
        a.status,
        a.created_at,
        a.updated_at,
        u.full_name AS employee_name,
        u.email AS employee_email,
        tm.full_name AS team_member_name,
        tm.title AS team_member_title,
        e.name AS employer_name,
        p.slug AS partnership_slug,
        h.name AS hbt_name,
        p.team_id
       FROM appointments a
       JOIN users u ON a.employee_user_id = u.id
       LEFT JOIN team_members tm ON a.team_member_id = tm.id
       LEFT JOIN partnerships p ON a.partnership_id = p.id
       LEFT JOIN employers e ON p.employer_id = e.id
       LEFT JOIN home_buying_teams h ON p.team_id = h.id
       ORDER BY a.created_at DESC`
    );

    res.json(appointments);
  } catch (error) {
    next(error);
  }
};

exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({ status: "error", message: "Invalid appointment status" });
    }

    const [appointments] = await pool.query(
      `SELECT a.*, p.team_id
       FROM appointments a
       LEFT JOIN partnerships p ON a.partnership_id = p.id
       WHERE a.id = ?
       LIMIT 1`,
      [id]
    );

    if (appointments.length === 0) {
      return res.status(404).json({ status: "error", message: "Appointment not found" });
    }

    const appointment = appointments[0];

    if (!canManageAppointment(req.user, appointment)) {
      return res.status(403).json({ status: "error", message: "You are not allowed to update this appointment" });
    }

    if (status === "approved" && appointment.team_member_id && appointment.preferred_date) {
      const conflict = await findAppointmentConflict({
        teamMemberId: appointment.team_member_id,
        startDateTime: normalizeDateForMySQL(appointment.preferred_date),
        excludeAppointmentId: appointment.id,
      });

      if (conflict) {
        return res.status(409).json({
          status: "error",
          message: "This advisor already has another active meeting at that time.",
        });
      }
    }

    const advisorNote = normalizeOptionalText(req.body.advisor_note);
    const meetingLink = normalizeMeetingLink(req.body.meeting_link);

    await pool.query(
      `UPDATE appointments
       SET status = ?, advisor_note = ?, meeting_link = ?
       WHERE id = ?`,
      [status, advisorNote, meetingLink, id]
    );

    await notifyAppointmentUpdated({ appointment, status, meetingLink, advisorNote });

    res.json({ status: "success", message: "Appointment updated successfully" });
  } catch (error) {
    next(error);
  }
};
