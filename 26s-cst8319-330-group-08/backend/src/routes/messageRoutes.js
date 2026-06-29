const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const pool = require("../config/db");
const messageController = require("../controllers/messageController");

const isAdmin = (user) => user.role === "admin" || user.role === "super_admin";
const isHbtUser = (user) => user.role === "hbt_admin" || user.role === "hbt_member";
const isCompanyManager = (user) => user.role === "company_admin" || user.role === "company";

const isRecentlyOnlineSql = `
  CASE
    WHEN u.last_seen_at IS NOT NULL
    AND u.last_seen_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    THEN 1
    ELSE 0
  END
`;

const getCompanyPartnership = async (partnershipId) => {
  const [[partnership]] = await pool.query(
    `SELECT
      p.id,
      p.team_id,
      p.slug,
      e.name AS company_name,
      h.name AS hbt_team_name
     FROM partnerships p
     JOIN employers e ON p.employer_id = e.id
     JOIN home_buying_teams h ON p.team_id = h.id
     WHERE p.id = ?
     LIMIT 1`,
    [partnershipId]
  );

  return partnership || null;
};

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

  if (isCompanyManager(user)) {
    sql += " AND mt.partnership_id = ? AND (mt.created_by = ? OR mt.employee_id IS NULL)";
    params.push(user.partnership_id, user.id);
  }

  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
};

const getCompanyContacts = async (req, res) => {
  try {
    const user = req.user;
    const partnership = await getCompanyPartnership(user.partnership_id);

    if (!partnership) {
      return res.status(400).json({ status: "error", message: "Company account is not linked to a valid partnership" });
    }

    const [contacts] = await pool.query(
      `SELECT
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.team_id,
        u.partnership_id,
        u.last_seen_at,
        ${isRecentlyOnlineSql} AS is_online_now,
        tm.title,
        e.name AS company_name,
        p.slug AS partnership_slug
       FROM users u
       LEFT JOIN team_members tm ON tm.user_id = u.id
       LEFT JOIN partnerships p ON u.partnership_id = p.id
       LEFT JOIN employers e ON p.employer_id = e.id
       WHERE u.is_active = 1
       AND u.id != ?
       AND (
         (u.role IN ('hbt_admin', 'hbt_member') AND u.team_id = ?)
         OR (u.role = 'employee' AND u.partnership_id = ?)
         OR u.role IN ('admin', 'super_admin')
       )
       ORDER BY is_online_now DESC, FIELD(u.role, 'hbt_admin', 'hbt_member', 'employee', 'admin', 'super_admin'), u.full_name ASC`,
      [user.id, partnership.team_id, user.partnership_id]
    );

    return res.json({
      quick_actions: [
        {
          type: "hbt_team",
          label: "Message Assigned HBT Team",
          description: `Send a message to ${partnership.hbt_team_name || "the assigned HBT team"}.`,
          partnership_id: partnership.id,
          hbt_team_id: partnership.team_id,
        },
        {
          type: "admin",
          label: "Contact Admin Support",
          description: "Ask HomeBoost admin for help.",
          partnership_id: partnership.id,
        },
      ],
      users: contacts.map((contact) => ({
        id: contact.id,
        full_name: contact.full_name,
        email: contact.email,
        role: contact.role,
        team_id: contact.team_id,
        partnership_id: contact.partnership_id,
        title: contact.title,
        company_name: contact.company_name || partnership.company_name,
        partnership_slug: contact.partnership_slug || partnership.slug,
        is_online: Number(contact.is_online_now) === 1,
        status_label: Number(contact.is_online_now) === 1 ? "Online" : "Offline",
        last_seen_at: contact.last_seen_at,
      })),
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load company contacts", error: error.message });
  }
};

const getCompanyThreads = async (req, res) => {
  try {
    const user = req.user;

    const [threads] = await pool.query(
      `SELECT
        mt.id,
        mt.subject,
        mt.employee_id,
        mt.hbt_team_id,
        mt.partnership_id,
        mt.assigned_member_id,
        mt.status,
        mt.created_by,
        mt.created_at,
        mt.updated_at,
        employee.full_name AS employee_name,
        employee.email AS employee_email,
        creator.full_name AS created_by_name,
        creator.role AS created_by_role,
        assigned.full_name AS assigned_member_name,
        assigned.email AS assigned_member_email,
        h.name AS hbt_team_name,
        e.name AS company_name,
        p.slug AS partnership_slug,
        (
          SELECT message_body
          FROM messages
          WHERE thread_id = mt.id
          ORDER BY id DESC
          LIMIT 1
        ) AS last_message,
        (
          SELECT created_at
          FROM messages
          WHERE thread_id = mt.id
          ORDER BY id DESC
          LIMIT 1
        ) AS last_message_at,
        (
          SELECT COUNT(*)
          FROM messages
          WHERE thread_id = mt.id
          AND sender_id != ?
          AND is_read = 0
        ) AS unread_count
       FROM message_threads mt
       LEFT JOIN users employee ON mt.employee_id = employee.id
       LEFT JOIN users creator ON mt.created_by = creator.id
       LEFT JOIN users assigned ON mt.assigned_member_id = assigned.id
       LEFT JOIN home_buying_teams h ON mt.hbt_team_id = h.id
       LEFT JOIN partnerships p ON mt.partnership_id = p.id
       LEFT JOIN employers e ON p.employer_id = e.id
       WHERE mt.partnership_id = ?
       AND (mt.created_by = ? OR mt.employee_id IS NULL)
       ORDER BY COALESCE(last_message_at, mt.updated_at) DESC, mt.id DESC`,
      [user.id, user.partnership_id, user.id]
    );

    return res.json(threads);
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load company message threads", error: error.message });
  }
};

const getCompanyThreadDetails = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const thread = await getThreadForAccess(id, user);

    if (!thread) {
      return res.status(404).json({ status: "error", message: "Thread not found or access denied" });
    }

    await pool.query(
      `UPDATE messages
       SET is_read = 1
       WHERE thread_id = ?
       AND sender_id != ?`,
      [id, user.id]
    );

    const [[threadDetails]] = await pool.query(
      `SELECT
        mt.*,
        employee.full_name AS employee_name,
        employee.email AS employee_email,
        assigned.full_name AS assigned_member_name,
        assigned.email AS assigned_member_email,
        h.name AS hbt_team_name,
        e.name AS company_name,
        p.slug AS partnership_slug
       FROM message_threads mt
       LEFT JOIN users employee ON mt.employee_id = employee.id
       LEFT JOIN users assigned ON mt.assigned_member_id = assigned.id
       LEFT JOIN home_buying_teams h ON mt.hbt_team_id = h.id
       LEFT JOIN partnerships p ON mt.partnership_id = p.id
       LEFT JOIN employers e ON p.employer_id = e.id
       WHERE mt.id = ?`,
      [id]
    );

    const [messages] = await pool.query(
      `SELECT
        m.id,
        m.thread_id,
        m.sender_id,
        m.message_body,
        m.is_read,
        m.created_at,
        u.full_name AS sender_name,
        u.email AS sender_email,
        u.role AS sender_role
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.thread_id = ?
       ORDER BY m.id ASC`,
      [id]
    );

    return res.json({ thread: threadDetails, messages });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load company thread details", error: error.message });
  }
};

const createCompanyThread = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const user = req.user;
    const { subject, message_body, recipient_id, contact_type } = req.body;

    if (!subject || !message_body) {
      return res.status(400).json({ status: "error", message: "Subject and message are required" });
    }

    const partnership = await getCompanyPartnership(user.partnership_id);
    if (!partnership) {
      return res.status(400).json({ status: "error", message: "Company account is not linked to a valid partnership" });
    }

    let finalEmployeeId = null;
    let finalTeamId = partnership.team_id;
    let finalAssignedMemberId = null;

    if (contact_type === "admin") {
      finalTeamId = null;
    }

    if (recipient_id) {
      const [[recipient]] = await connection.query(
        `SELECT id, role, team_id, partnership_id
         FROM users
         WHERE id = ? AND is_active = 1
         LIMIT 1`,
        [recipient_id]
      );

      if (!recipient) {
        return res.status(404).json({ status: "error", message: "Recipient not found" });
      }

      if (recipient.role === "employee") {
        if (Number(recipient.partnership_id) !== Number(user.partnership_id)) {
          return res.status(403).json({ status: "error", message: "Employee is not part of your company partnership" });
        }
        finalEmployeeId = recipient.id;
        finalTeamId = partnership.team_id;
      } else if (recipient.role === "hbt_admin" || recipient.role === "hbt_member") {
        if (Number(recipient.team_id) !== Number(partnership.team_id)) {
          return res.status(403).json({ status: "error", message: "HBT contact is not assigned to your partnership" });
        }
        finalAssignedMemberId = recipient.id;
        finalTeamId = partnership.team_id;
      } else if (recipient.role === "admin" || recipient.role === "super_admin") {
        finalTeamId = null;
        finalAssignedMemberId = null;
      } else {
        return res.status(403).json({ status: "error", message: "Recipient role is not supported for company messaging" });
      }
    }

    await connection.beginTransaction();

    const [threadResult] = await connection.query(
      `INSERT INTO message_threads
       (subject, employee_id, hbt_team_id, partnership_id, assigned_member_id, status, created_by)
       VALUES (?, ?, ?, ?, ?, 'open', ?)`,
      [subject.trim(), finalEmployeeId, finalTeamId, user.partnership_id, finalAssignedMemberId, user.id]
    );

    const threadId = threadResult.insertId;

    await connection.query(
      `INSERT INTO messages (thread_id, sender_id, message_body, is_read)
       VALUES (?, ?, ?, 0)`,
      [threadId, user.id, message_body.trim()]
    );

    await connection.commit();

    return res.status(201).json({ status: "success", message: "Message thread created successfully", thread_id: threadId });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to create company message thread", error: error.message });
  } finally {
    connection.release();
  }
};

const replyCompanyThread = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { message_body } = req.body;

    if (!message_body || !message_body.trim()) {
      return res.status(400).json({ status: "error", message: "Message body is required" });
    }

    const thread = await getThreadForAccess(id, user);
    if (!thread) {
      return res.status(404).json({ status: "error", message: "Thread not found or access denied" });
    }

    await pool.query(
      `INSERT INTO messages (thread_id, sender_id, message_body, is_read)
       VALUES (?, ?, ?, 0)`,
      [id, user.id, message_body.trim()]
    );

    await pool.query(`UPDATE message_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);

    return res.status(201).json({ status: "success", message: "Reply sent successfully" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to send company reply", error: error.message });
  }
};

const updateCompanyThreadStatus = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatuses = ["open", "pending", "closed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ status: "error", message: "Invalid status" });
    }

    const thread = await getThreadForAccess(id, user);
    if (!thread) {
      return res.status(404).json({ status: "error", message: "Thread not found or access denied" });
    }

    await pool.query(`UPDATE message_threads SET status = ? WHERE id = ?`, [status, id]);

    return res.json({ status: "success", message: "Thread status updated successfully" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update company thread status", error: error.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const user = req.user;

    const [rows] = await pool.query(
      `SELECT m.id, m.thread_id, m.sender_id, mt.employee_id, mt.hbt_team_id, mt.partnership_id, mt.created_by
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
      (user.role === "hbt_admin" && Number(message.hbt_team_id) === Number(user.team_id)) ||
      (isCompanyManager(user) && Number(message.partnership_id) === Number(user.partnership_id) && Number(message.created_by) === Number(user.id));

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

const getContacts = (req, res) => {
  if (isCompanyManager(req.user)) return getCompanyContacts(req, res);
  return messageController.getContacts(req, res);
};

const getThreads = (req, res) => {
  if (isCompanyManager(req.user)) return getCompanyThreads(req, res);
  return messageController.getThreads(req, res);
};

const getThreadDetails = (req, res) => {
  if (isCompanyManager(req.user)) return getCompanyThreadDetails(req, res);
  return messageController.getThreadDetails(req, res);
};

const createThread = (req, res) => {
  if (isCompanyManager(req.user)) return createCompanyThread(req, res);
  return messageController.createThread(req, res);
};

const replyToThread = (req, res) => {
  if (isCompanyManager(req.user)) return replyCompanyThread(req, res);
  return messageController.replyToThread(req, res);
};

const updateThreadStatus = (req, res) => {
  if (isCompanyManager(req.user)) return updateCompanyThreadStatus(req, res);
  return messageController.updateThreadStatus(req, res);
};

router.post("/presence", protect, messageController.updatePresence);

router.get("/contacts", protect, getContacts);

router.get("/threads", protect, getThreads);

router.get("/threads/:id", protect, getThreadDetails);

router.post("/threads", protect, createThread);

router.post("/threads/:id/reply", protect, replyToThread);

router.put("/threads/:id/status", protect, updateThreadStatus);

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
      (user.role === "employee" && Number(thread.employee_id) === Number(user.id)) ||
      (isCompanyManager(user) && Number(thread.partnership_id) === Number(user.partnership_id) && Number(thread.created_by) === Number(user.id));

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
