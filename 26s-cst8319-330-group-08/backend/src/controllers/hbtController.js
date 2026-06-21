const bcrypt = require("bcryptjs");
const pool = require("../config/db");

exports.getHBTs = async (req, res) => {
  try {
    const [teams] = await pool.query(
      `SELECT 
        hbt.*,
        u.full_name AS admin_name,
        u.email AS admin_email
       FROM home_buying_teams hbt
       LEFT JOIN users u 
        ON u.team_id = hbt.id 
        AND u.role = 'hbt_admin'
       ORDER BY hbt.id DESC`
    );

    res.json(teams);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load Home Buying Teams",
      error: error.message,
    });
  }
};

exports.createHBT = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      name,
      team_name,
      description,
      logo_url,
      email,
      contact_email,
      phone,
      contact_phone,
      website,
      website_url,
      is_active,
      admin_name,
      admin_email,
      admin_password,
    } = req.body;

    const finalName = name || team_name;
    const finalEmail = email || contact_email || null;
    const finalPhone = phone || contact_phone || null;
    const finalWebsite = website || website_url || null;

    if (!finalName) {
      return res.status(400).json({
        status: "error",
        message: "Team name is required",
      });
    }

    if (!admin_name || !admin_email || !admin_password) {
      return res.status(400).json({
        status: "error",
        message:
          "HBT admin name, email, and password are required to create team login",
      });
    }

    await connection.beginTransaction();

    const [existingAdmin] = await connection.query(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [admin_email]
    );

    if (existingAdmin.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        status: "error",
        message: "This HBT admin email already exists",
      });
    }

    const [teamResult] = await connection.query(
      `INSERT INTO home_buying_teams
       (name, description, logo_url, email, phone, website, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        finalName,
        description || null,
        logo_url || null,
        finalEmail || admin_email,
        finalPhone,
        finalWebsite,
        is_active ?? 1,
      ]
    );

    const teamId = teamResult.insertId;
    const hashedPassword = await bcrypt.hash(admin_password, 10);

    await connection.query(
      `INSERT INTO users
       (full_name, email, password, role, team_id, partnership_id, is_active)
       VALUES (?, ?, ?, 'hbt_admin', ?, NULL, 1)`,
      [admin_name, admin_email, hashedPassword, teamId]
    );

    await connection.commit();

    res.status(201).json({
      status: "success",
      message: "Home Buying Team and HBT Admin login created successfully",
      team_id: teamId,
      admin_email,
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      status: "error",
      message: "Failed to create Home Buying Team",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.updateHBT = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      team_name,
      description,
      logo_url,
      email,
      contact_email,
      phone,
      contact_phone,
      website,
      website_url,
      is_active,
    } = req.body;

    const finalName = name || team_name;
    const finalEmail = email || contact_email || null;
    const finalPhone = phone || contact_phone || null;
    const finalWebsite = website || website_url || null;

    if (!finalName) {
      return res.status(400).json({
        status: "error",
        message: "Team name is required",
      });
    }

    await pool.query(
      `UPDATE home_buying_teams
       SET name = ?, description = ?, logo_url = ?, email = ?, phone = ?, website = ?, is_active = ?
       WHERE id = ?`,
      [
        finalName,
        description || null,
        logo_url || null,
        finalEmail,
        finalPhone,
        finalWebsite,
        is_active ?? 1,
        id,
      ]
    );

    res.json({
      status: "success",
      message: "Home Buying Team updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update Home Buying Team",
      error: error.message,
    });
  }
};

exports.deleteHBT = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("UPDATE home_buying_teams SET is_active = 0 WHERE id = ?", [
      id,
    ]);

    await pool.query(
      `UPDATE users 
       SET is_active = 0 
       WHERE team_id = ? AND role = 'hbt_admin'`,
      [id]
    );

    res.json({
      status: "success",
      message: "Home Buying Team and related HBT Admin disabled successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to disable Home Buying Team",
      error: error.message,
    });
  }
};