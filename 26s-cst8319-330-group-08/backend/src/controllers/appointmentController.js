const pool = require("../config/db");

const VALID_STATUSES = new Set(["pending", "approved", "rejected", "completed"]);

const canManageAppointment = (user, appointment) => {
  if (!user || !appointment) return false;

  if (user.role === "admin" || user.role === "super_admin") return true;

  if (user.role === "hbt_admin" || user.role === "hbt_member") {
    return Number(user.team_id) === Number(appointment.team_id);
  }

  return false;
};

exports.createAppointment = async (req, res, next) => {
  try {
    if (req.user.role !== "employee") {
      return res.status(403).json({ status: "error", message: "Only employees can request appointments" });
    }

    const { team_member_id, topic, preferred_date, message } = req.body;

    if (!topic || String(topic).trim().length < 3) {
      return res.status(400).json({ status: "error", message: "Appointment topic is required" });
    }

    const partnershipId = req.user.partnership_id || null;

    if (!partnershipId) {
      return res.status(400).json({ status: "error", message: "Employee account is not linked to a partnership" });
    }

    let teamMemberId = team_member_id || null;

    if (teamMemberId) {
      const [members] = await pool.query(
        `SELECT tm.id
         FROM team_members tm
         JOIN partnerships p ON tm.team_id = p.team_id
         WHERE tm.id = ?
           AND p.id = ?
           AND tm.is_active = 1
         LIMIT 1`,
        [teamMemberId, partnershipId]
      );

      if (members.length === 0) {
        return res.status(400).json({ status: "error", message: "Selected team member is not available for this partnership" });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO appointments
       (employee_user_id, team_member_id, partnership_id, topic, preferred_date, message, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.user.id,
        teamMemberId,
        partnershipId,
        String(topic).trim(),
        preferred_date || null,
        message ? String(message).trim() : null,
      ]
    );

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

    if (!canManageAppointment(req.user, appointments[0])) {
      return res.status(403).json({ status: "error", message: "You are not allowed to update this appointment" });
    }

    await pool.query("UPDATE appointments SET status = ? WHERE id = ?", [status, id]);

    res.json({ status: "success", message: "Appointment status updated successfully" });
  } catch (error) {
    next(error);
  }
};
