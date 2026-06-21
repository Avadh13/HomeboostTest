const pool = require("../config/db");

exports.getHBTEvents = async (req, res) => {
  try {
    const teamId = req.user?.team_id;
    if (!teamId) {
      return res.status(403).json({ status: "error", message: "HBT account is not linked to a team." });
    }

    const [events] = await pool.query(
      `SELECT * FROM events WHERE team_id = ? AND is_active = 1 ORDER BY event_date ASC, id DESC`,
      [teamId]
    );

    res.json(events);
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to load events", error: error.message });
  }
};

exports.createHBTEvent = async (req, res) => {
  try {
    const teamId = req.user?.team_id;
    if (!teamId) {
      return res.status(403).json({ status: "error", message: "HBT account is not linked to a team." });
    }

    const { title, description, event_date, booking_link } = req.body;
    if (!title) return res.status(400).json({ status: "error", message: "Event title is required" });

    await pool.query(
      `INSERT INTO events (team_id, title, description, event_date, booking_link, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
      [teamId, title, description || null, event_date || null, booking_link || null]
    );

    res.status(201).json({ status: "success", message: "Event created successfully" });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to create event", error: error.message });
  }
};

exports.deleteHBTEvent = async (req, res) => {
  try {
    const teamId = req.user?.team_id;
    const { id } = req.params;
    await pool.query(`UPDATE events SET is_active = 0 WHERE id = ? AND team_id = ?`, [id, teamId]);
    res.json({ status: "success", message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to delete event", error: error.message });
  }
};
