const pool = require("../config/db");
const { recordAuditEvent } = require("../services/auditLogService");

const clean = (value, max = 255) => String(value || "").trim().slice(0, max);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.createContactMessage = async (req, res) => {
  try {
    const fullName = clean(req.body.full_name, 180);
    const email = clean(req.body.email, 180).toLowerCase();
    const phone = clean(req.body.phone, 60) || null;
    const message = clean(req.body.message, 5000);

    if (!fullName || !email || !message) {
      return res.status(400).json({
        status: "error",
        message: "Name, email, and message are required",
      });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ status: "error", message: "Enter a valid email address" });
    }

    await pool.query(
      `INSERT INTO contact_messages
       (full_name, email, phone, message)
       VALUES (?, ?, ?, ?)`,
      [fullName, email, phone, message],
    );

    return res.status(201).json({
      status: "success",
      message: "Message sent successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Failed to send message",
    });
  }
};

exports.getContactMessages = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 300);
    const offset = Math.max(Number(req.query.offset || 0), 0);
    const [messages] = await pool.query(
      `SELECT id, full_name, email, phone, message, is_read, created_at
       FROM contact_messages
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    );

    return res.json(messages);
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Failed to load messages",
    });
  }
};

exports.markMessageRead = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: "error", message: "Invalid message ID" });

    const [result] = await pool.query(
      "UPDATE contact_messages SET is_read = TRUE WHERE id = ?",
      [id],
    );
    if (Number(result.affectedRows || 0) !== 1) {
      return res.status(404).json({ status: "error", message: "Message not found" });
    }

    return res.json({
      status: "success",
      message: "Message marked as read",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Failed to update message",
    });
  }
};

exports.deleteContactMessage = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ status: "error", message: "Invalid message ID" });

    await connection.beginTransaction();
    const [[message]] = await connection.query(
      "SELECT id, is_read, created_at FROM contact_messages WHERE id = ? LIMIT 1 FOR UPDATE",
      [id],
    );
    if (!message) {
      await connection.rollback();
      return res.status(404).json({ status: "error", message: "Message not found" });
    }

    const [result] = await connection.query(
      "DELETE FROM contact_messages WHERE id = ?",
      [id],
    );
    if (Number(result.affectedRows || 0) !== 1) {
      throw new Error("Contact message delete failed");
    }

    await recordAuditEvent({
      connection,
      req,
      action: "contact_message.deleted",
      entityType: "contact_message",
      entityId: id,
      metadata: {
        was_read: Boolean(message.is_read),
        original_created_at: message.created_at,
      },
    });
    await connection.commit();

    return res.json({
      status: "success",
      message: "Message deleted",
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({
      status: "error",
      message: "Failed to delete message",
    });
  } finally {
    connection.release();
  }
};
