const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const pool = require("../config/db");
const messageController = require("../controllers/messageController");

const isAdmin = (user) => user.role === "admin" || user.role === "super_admin";
const isHbtUser = (user) => user.role === "hbt_admin" || user.role === "hbt_member";

const getThreadForAccess = async (threadId, user) => {
  let sql = `SELECT mt.* FROM message_threads mt WHERE mt.id = ?`;
  const params = [threadId];

  if (isHbtUser(user)) {
    sql += " AND mt.hbt_team_id = ?";
    params.push(user.team_id);
  }

  if (user.role === "employee") {
    sql += " AND mt.employee_id = ?";
    params.push(user.id);
  }

  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const user = req.user;

    const [rows] = await pool.query(
      `SELECT m.id, m.thread_id, m.sender_id, mt.employee_id, mt.hbt_team_id
       FROM messages m
       JOIN message_threads mt ON m.thread_id = mt.id
       WHERE m.id = ?
       LIMIT 1`,
      [messageId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ status: "error", message: "Message not found" });
    }

    const message = rows[0];
    const canDelete =
      isAdmin(user) ||
      Number(message.sender_id) === Number(user.id) ||
      (user.role === "hbt_admin" && Number(message.hbt_team_id) === Number(user.team_id));

    if (!canDelete) {
      return res.status(403).json({ status: "error", message: "You cannot delete this message" });
    }

    await pool.query(`DELETE FROM messages WHERE id = ?`, [messageId]);
    await pool.query(`UPDATE message_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [message.thread_id]);

    return res.json({ status: "success", message: "Message deleted" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to delete message", error: error.message });
  }
};

router.post("/presence", protect, messageController.updatePresence);

router.get("/contacts", protect, messageController.getContacts);

router.get("/threads", protect, messageController.getThreads);

router.get("/threads/:id", protect, messageController.getThreadDetails);

router.post("/threads", protect, messageController.createThread);

router.post("/threads/:id/reply", protect, messageController.replyToThread);

router.put("/threads/:id/status", protect, messageController.updateThreadStatus);

router.put("/threads/:id/assign", protect, messageController.assignThread);

router.delete("/:messageId", protect, deleteMessage);

// Backward compatibility for the previous /api/messages/messages/:messageId URL.
router.delete("/messages/:messageId", protect, deleteMessage);

router.delete("/threads/:id", protect, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const user = req.user;
    const thread = await getThreadForAccess(id, user);

    if (!thread) {
      return res.status(404).json({ status: "error", message: "Thread not found or access denied" });
    }

    const canDelete =
      isAdmin(user) ||
      (user.role === "hbt_admin" && Number(thread.hbt_team_id) === Number(user.team_id)) ||
      Number(thread.created_by) === Number(user.id) ||
      (user.role === "employee" && Number(thread.employee_id) === Number(user.id));

    if (!canDelete) {
      return res.status(403).json({ status: "error", message: "You cannot delete this conversation" });
    }

    await connection.beginTransaction();
    await connection.query(`DELETE FROM messages WHERE thread_id = ?`, [id]);
    await connection.query(`DELETE FROM message_threads WHERE id = ?`, [id]);
    await connection.commit();

    return res.json({ status: "success", message: "Conversation deleted" });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to delete conversation", error: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
