const bcrypt = require("bcryptjs");
const pool = require("../config/db");

const canManageTeam = (req, targetTeamId) => {
  if (!req.user) return false;

  if (req.user.role === "admin" || req.user.role === "super_admin") {
    return true;
  }

  if (req.user.role === "hbt_admin") {
    return Number(req.user.team_id) === Number(targetTeamId);
  }

  return false;
};

const generateDefaultPassword = (fullName) => {
  const firstName = String(fullName || "")
    .trim()
    .split(" ")[0]
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, 4)
    .padEnd(4, "x");

  const randomFiveNumbers = Math.floor(10000 + Math.random() * 90000);

  return `${firstName}@${randomFiveNumbers}`;
};

exports.getTeamMembers = async (req, res) => {
  try {
    let teamId = null;

    if (req.user.role === "hbt_admin" || req.user.role === "hbt_member") {
      teamId = req.user.team_id;
    } else {
      teamId = req.query.team_id || null;
    }

    const sql = teamId
      ? `SELECT 
          tm.*, 
          h.name AS team_name,
          u.email AS login_email,
          u.role AS login_role,
          u.is_active AS login_active
         FROM team_members tm 
         LEFT JOIN home_buying_teams h ON tm.team_id = h.id 
         LEFT JOIN users u ON tm.user_id = u.id
         WHERE tm.team_id = ? 
         ORDER BY tm.id DESC`
      : `SELECT 
          tm.*, 
          h.name AS team_name,
          u.email AS login_email,
          u.role AS login_role,
          u.is_active AS login_active
         FROM team_members tm 
         LEFT JOIN home_buying_teams h ON tm.team_id = h.id
         LEFT JOIN users u ON tm.user_id = u.id
         ORDER BY tm.id DESC`;

    const params = teamId ? [teamId] : [];

    const [members] = await pool.query(sql, params);

    res.json(members);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load team members",
      error: error.message,
    });
  }
};

exports.createTeamMember = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const teamId = req.user?.team_id || req.body.team_id;

    const {
      full_name,
      title,
      role_title,
      email,
      phone,
      photo_url,
      booking_link,
      booking_url,
      bio,
      is_active,
      password,
    } = req.body;

    if (!teamId || !full_name || !email) {
      return res.status(400).json({
        status: "error",
        message: "Team, full name, and email are required",
      });
    }

    if (!canManageTeam(req, teamId)) {
      return res.status(403).json({
        status: "error",
        message: "You are not allowed to create members for this team",
      });
    }

    await connection.beginTransaction();

    const [existingUsers] = await connection.query(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();

      return res.status(400).json({
        status: "error",
        message: "A user with this email already exists",
      });
    }

    const temporaryPassword = password || generateDefaultPassword(full_name);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const [userResult] = await connection.query(
      `INSERT INTO users
       (full_name, email, password, role, team_id, is_active)
       VALUES (?, ?, ?, 'hbt_member', ?, ?)`,
      [full_name, email, hashedPassword, teamId, is_active ?? 1]
    );

    const userId = userResult.insertId;

    await connection.query(
      `INSERT INTO team_members
       (user_id, team_id, full_name, title, email, phone, photo_url, booking_link, bio, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        teamId,
        full_name,
        title || role_title || "HBT Team Member",
        email,
        phone || null,
        photo_url || null,
        booking_link || booking_url || null,
        bio || null,
        is_active ?? 1,
      ]
    );

    await connection.commit();

    res.status(201).json({
      status: "success",
      message: "Team member created successfully",
      login: {
        email,
        temporary_password: temporaryPassword,
        role: "hbt_member",
      },
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      status: "error",
      message: "Failed to create team member",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.updateTeamMember = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const {
      full_name,
      title,
      role_title,
      email,
      phone,
      photo_url,
      booking_link,
      booking_url,
      bio,
      is_active,
      team_id,
      password,
    } = req.body;

    const [existingMembers] = await connection.query(
      `SELECT * FROM team_members WHERE id = ? LIMIT 1`,
      [id]
    );

    if (existingMembers.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Team member not found",
      });
    }

    const existingMember = existingMembers[0];
    const finalTeamId = req.user?.team_id || team_id || existingMember.team_id;

    if (!canManageTeam(req, finalTeamId)) {
      return res.status(403).json({
        status: "error",
        message: "You are not allowed to update this team member",
      });
    }

    await connection.beginTransaction();

    await connection.query(
      `UPDATE team_members
       SET team_id = ?, 
           full_name = ?, 
           title = ?, 
           email = ?, 
           phone = ?, 
           photo_url = ?, 
           booking_link = ?, 
           bio = ?, 
           is_active = ?
       WHERE id = ?`,
      [
        finalTeamId,
        full_name,
        title || role_title || null,
        email || null,
        phone || null,
        photo_url || null,
        booking_link || booking_url || null,
        bio || null,
        is_active ?? 1,
        id,
      ]
    );

    if (existingMember.user_id) {
      if (password && password.trim() !== "") {
        const hashedPassword = await bcrypt.hash(password, 10);

        await connection.query(
          `UPDATE users
           SET full_name = ?,
               email = ?,
               password = ?,
               team_id = ?,
               is_active = ?
           WHERE id = ?`,
          [
            full_name,
            email || existingMember.email,
            hashedPassword,
            finalTeamId,
            is_active ?? 1,
            existingMember.user_id,
          ]
        );
      } else {
        await connection.query(
          `UPDATE users
           SET full_name = ?,
               email = ?,
               team_id = ?,
               is_active = ?
           WHERE id = ?`,
          [
            full_name,
            email || existingMember.email,
            finalTeamId,
            is_active ?? 1,
            existingMember.user_id,
          ]
        );
      }
    }

    await connection.commit();

    res.json({
      status: "success",
      message:
        password && password.trim() !== ""
          ? "Team member updated and password changed successfully"
          : "Team member updated successfully",
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      status: "error",
      message: "Failed to update team member",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.deleteTeamMember = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    const [members] = await connection.query(
      `SELECT * FROM team_members WHERE id = ? LIMIT 1`,
      [id]
    );

    if (members.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Team member not found",
      });
    }

    const member = members[0];

    if (!canManageTeam(req, member.team_id)) {
      return res.status(403).json({
        status: "error",
        message: "You are not allowed to disable this team member",
      });
    }

    await connection.beginTransaction();

    await connection.query(
      "UPDATE team_members SET is_active = 0 WHERE id = ?",
      [id]
    );

    if (member.user_id) {
      await connection.query("UPDATE users SET is_active = 0 WHERE id = ?", [
        member.user_id,
      ]);
    }

    await connection.commit();

    res.json({
      status: "success",
      message: "Team member disabled successfully",
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      status: "error",
      message: "Failed to disable team member",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.getTeamMembersByTeam = async (req, res) => {
  try {
    const { teamId } = req.params;

    if (
      (req.user.role === "hbt_admin" || req.user.role === "hbt_member") &&
      Number(req.user.team_id) !== Number(teamId)
    ) {
      return res.status(403).json({
        status: "error",
        message: "You can only view your own team members",
      });
    }

    const [members] = await pool.query(
      `SELECT 
        tm.*, 
        h.name AS team_name,
        u.email AS login_email,
        u.role AS login_role,
        u.is_active AS login_active
       FROM team_members tm
       LEFT JOIN home_buying_teams h ON tm.team_id = h.id
       LEFT JOIN users u ON tm.user_id = u.id
       WHERE tm.team_id = ? 
       AND tm.is_active = 1 
       ORDER BY tm.id DESC`,
      [teamId]
    );

    res.json(members);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load team members",
      error: error.message,
    });
  }
};