const pool = require("../config/db");

const DAYS = [0, 1, 2, 3, 4, 5, 6];

const ensureHBTUser = (req, res) => {
  if (req.user.role !== "hbt_admin" && req.user.role !== "hbt_member") {
    res.status(403).json({ status: "error", message: "Only HBT users can manage advisor availability" });
    return false;
  }

  if (!req.user.team_id) {
    res.status(400).json({ status: "error", message: "HBT user is not linked to a team" });
    return false;
  }

  return true;
};

const assertTeamMember = async (teamMemberId, teamId) => {
  const [rows] = await pool.query(
    "SELECT id, full_name, title FROM team_members WHERE id = ? AND team_id = ? AND is_active = 1 LIMIT 1",
    [teamMemberId, teamId]
  );

  return rows[0] || null;
};

exports.getTeamAvailability = async (req, res, next) => {
  try {
    if (!ensureHBTUser(req, res)) return;

    const [teamMembers] = await pool.query(
      `SELECT id, full_name, title, email
       FROM team_members
       WHERE team_id = ? AND is_active = 1
       ORDER BY full_name ASC`,
      [req.user.team_id]
    );

    const [availability] = await pool.query(
      `SELECT id, team_member_id, day_of_week, start_time, end_time, is_available
       FROM advisor_availability
       WHERE team_member_id IN (
         SELECT id FROM team_members WHERE team_id = ?
       )
       ORDER BY team_member_id ASC, day_of_week ASC`,
      [req.user.team_id]
    );

    const [timeOff] = await pool.query(
      `SELECT id, team_member_id, start_datetime, end_datetime, reason, created_at
       FROM advisor_time_off
       WHERE team_member_id IN (
         SELECT id FROM team_members WHERE team_id = ?
       )
       ORDER BY start_datetime DESC`,
      [req.user.team_id]
    );

    res.json({ status: "success", team_members: teamMembers, availability, time_off: timeOff });
  } catch (error) {
    next(error);
  }
};

exports.saveAvailability = async (req, res, next) => {
  try {
    if (!ensureHBTUser(req, res)) return;

    const teamMemberId = Number(req.params.teamMemberId);
    const { availability } = req.body;

    if (!teamMemberId || !Array.isArray(availability)) {
      return res.status(400).json({ status: "error", message: "Advisor and availability rows are required" });
    }

    const teamMember = await assertTeamMember(teamMemberId, req.user.team_id);

    if (!teamMember) {
      return res.status(404).json({ status: "error", message: "Advisor not found for this team" });
    }

    for (const row of availability) {
      const day = Number(row.day_of_week);
      const startTime = String(row.start_time || "09:00:00").slice(0, 8);
      const endTime = String(row.end_time || "17:00:00").slice(0, 8);
      const isAvailable = row.is_available ? 1 : 0;

      if (!DAYS.includes(day)) continue;

      await pool.query(
        `INSERT INTO advisor_availability
         (team_member_id, day_of_week, start_time, end_time, is_available)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          start_time = VALUES(start_time),
          end_time = VALUES(end_time),
          is_available = VALUES(is_available)`,
        [teamMemberId, day, startTime, endTime, isAvailable]
      );
    }

    res.json({ status: "success", message: "Advisor availability saved successfully" });
  } catch (error) {
    next(error);
  }
};

exports.addTimeOff = async (req, res, next) => {
  try {
    if (!ensureHBTUser(req, res)) return;

    const { team_member_id, start_datetime, end_datetime, reason } = req.body;
    const teamMemberId = Number(team_member_id);

    if (!teamMemberId || !start_datetime || !end_datetime) {
      return res.status(400).json({ status: "error", message: "Advisor, start time, and end time are required" });
    }

    const teamMember = await assertTeamMember(teamMemberId, req.user.team_id);

    if (!teamMember) {
      return res.status(404).json({ status: "error", message: "Advisor not found for this team" });
    }

    await pool.query(
      `INSERT INTO advisor_time_off (team_member_id, start_datetime, end_datetime, reason)
       VALUES (?, ?, ?, ?)`,
      [
        teamMemberId,
        String(start_datetime).replace("T", " "),
        String(end_datetime).replace("T", " "),
        reason ? String(reason).trim() : null,
      ]
    );

    res.status(201).json({ status: "success", message: "Advisor time off added successfully" });
  } catch (error) {
    next(error);
  }
};

exports.deleteTimeOff = async (req, res, next) => {
  try {
    if (!ensureHBTUser(req, res)) return;

    const timeOffId = Number(req.params.id);

    const [result] = await pool.query(
      `DELETE ato
       FROM advisor_time_off ato
       JOIN team_members tm ON ato.team_member_id = tm.id
       WHERE ato.id = ? AND tm.team_id = ?`,
      [timeOffId, req.user.team_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: "error", message: "Time off entry not found" });
    }

    res.json({ status: "success", message: "Time off entry removed" });
  } catch (error) {
    next(error);
  }
};
