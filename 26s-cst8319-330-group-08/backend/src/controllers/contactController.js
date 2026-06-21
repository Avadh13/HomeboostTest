const pool = require("../config/db");

exports.createContactMessage = async (req, res) => {
  try {
    const { full_name, email, phone, message } = req.body;

    if (!full_name || !email || !message) {
      return res.status(400).json({
        status: "error",
        message: "Name, email, and message are required",
      });
    }

    await pool.query(
      `INSERT INTO contact_messages
       (full_name, email, phone, message)
       VALUES (?, ?, ?, ?)`,
      [full_name, email, phone, message]
    );

    res.status(201).json({
      status: "success",
      message: "Message sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to send message",
      error: error.message,
    });
  }
};

exports.getContactMessages = async (req, res) => {
  try {
    const [messages] = await pool.query(
      `SELECT * FROM contact_messages
       ORDER BY created_at DESC`
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load messages",
      error: error.message,
    });
  }
};
exports.markMessageRead = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("UPDATE contact_messages SET is_read = TRUE WHERE id = ?", [
      id,
    ]);

    res.json({
      status: "success",
      message: "Message marked as read",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update message",
      error: error.message,
    });
  }
};

exports.deleteContactMessage = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM contact_messages WHERE id = ?", [id]);

    res.json({
      status: "success",
      message: "Message deleted",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete message",
      error: error.message,
    });
  }
};