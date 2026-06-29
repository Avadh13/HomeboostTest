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

const threadSelectSql = `
  SELECT
    mt.id,
    mt.subject,
    mt.employee_id,
    mt.hbt_team_id,
    mt.partnership_id,
    mt.assigned_member_id,
    mt.recipient_id,
    mt.status,
    mt.created_by,
    mt.created_at,
    mt.updated_at,

    employee.full_name AS employee_name,
    employee.email AS employee_email,

    creator.full_name AS created_by_name,
    creator.email AS created_by_email,
    creator.role AS created_by_role,

    recipient.full_name AS recipient_name,
    recipient.email AS recipient_email,
    recipient.role AS recipient_role,

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
  LEFT JOIN users recipient ON mt.recipient_id = recipient.id
  LEFT JOIN users assigned ON mt.assigned_member_id = assigned.id
  LEFT JOIN home_buying_teams h ON mt.hbt_team_id = h.id
  LEFT JOIN partnerships p ON mt.partnership_id = p.id
  LEFT JOIN employers e ON p.employer_id = e.id
`;

const getCompanyPartnership = async (partnershipId) => {
  if (!partnershipId) return null;

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

const getThreadAccessWhere = () => ({
  where: "WHERE (mt.created_by = ? OR mt.recipient_id = ?)",
});

const getThreadForAccess = async (threadId, user) => {
  const access = getThreadAccessWhere();
  const [rows] = await pool.query(
    `SELECT mt.*
     FROM message_threads mt
     ${access.where}
     AND mt.id = ?
     LIMIT 1`,
    [user.id, user.id, threadId]
  );

  return rows[0] || null;
};

const normalizeContacts = (contacts) => ({
  quick_actions: [],
  users: contacts.users.map((contact) => ({
    id: contact.id,
    full_name: contact.full_name,
    email: contact.email,
    role: contact.role,
    team_id: contact.team_id,
    partnership_id: contact.partnership_id,
    title: contact.title,
    hbt_team_name: contact.hbt_team_name,
    company_name: contact.company_name,
    partnership_slug: contact.partnership_slug,
    is_online: Number(contact.is_online_now) === 1,
    status_label: Number(contact.is_online_now) === 1 ? "Online" : "Offline",
    last_seen_at: contact.last_seen_at,
  })),
});

const getContacts = async (req, res) => {
  try {
    const user = req.user;
    const contacts = { users: [] };

    if (user.role === "employee") {
      if (!user.partnership_id) return res.json(normalizeContacts(contacts));

      const partnership = await getCompanyPartnership(user.partnership_id);
      if (!partnership) return res.json(normalizeContacts(contacts));

      const [users] = await pool.query(
        `SELECT u.id, u.full_name, u.email, u.role, u.team_id, u.partnership_id, u.last_seen_at,
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
           (u.team_id = ? AND u.role IN ('hbt_admin', 'hbt_member'))
           OR (u.partnership_id = ? AND u.role IN ('company_admin', 'company'))
           OR u.role IN ('admin', 'super_admin')
         )
         ORDER BY is_online_now DESC, FIELD(u.role, 'hbt_member', 'hbt_admin', 'company_admin', 'company', 'admin', 'super_admin'), u.full_name ASC`,
        [user.id, partnership.team_id, user.partnership_id]
      );

      contacts.users = users;
      return res.json(normalizeContacts(contacts));
    }

    if (isHbtUser(user)) {
      const [users] = await pool.query(
        `SELECT u.id, u.full_name, u.email, u.role, u.team_id, u.partnership_id, u.last_seen_at,
          ${isRecentlyOnlineSql} AS is_online_now,
          e.name AS company_name,
          p.slug AS partnership_slug
         FROM users u
         LEFT JOIN partnerships p ON u.partnership_id = p.id
         LEFT JOIN employers e ON p.employer_id = e.id
         WHERE u.id != ?
         AND u.is_active = 1
         AND (
           (u.team_id = ? AND u.role IN ('hbt_admin', 'hbt_member'))
           OR (p.team_id = ? AND u.role IN ('employee', 'company_admin', 'company'))
           OR u.role IN ('admin', 'super_admin')
         )
         ORDER BY is_online_now DESC, FIELD(u.role, 'employee', 'company_admin', 'company', 'hbt_member', 'hbt_admin', 'admin', 'super_admin'), u.full_name ASC`,
        [user.id, user.team_id, user.team_id]
      );

      contacts.users = users;
      return res.json(normalizeContacts(contacts));
    }

    if (isCompanyManager(user)) {
      const partnership = await getCompanyPartnership(user.partnership_id);
      if (!partnership) return res.json(normalizeContacts(contacts));

      const [users] = await pool.query(
        `SELECT u.id, u.full_name, u.email, u.role, u.team_id, u.partnership_id, u.last_seen_at,
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

      contacts.users = users;
      return res.json(normalizeContacts(contacts));
    }

    if (isAdmin(user)) {
      const [users] = await pool.query(
        `SELECT u.id, u.full_name, u.email, u.role, u.team_id, u.partnership_id, u.last_seen_at,
          ${isRecentlyOnlineSql} AS is_online_now,
          h.name AS hbt_team_name,
          e.name AS company_name,
          p.slug AS partnership_slug
         FROM users u
         LEFT JOIN home_buying_teams h ON u.team_id = h.id
         LEFT JOIN partnerships p ON u.partnership_id = p.id
         LEFT JOIN employers e ON p.employer_id = e.id
         WHERE u.id != ?
         AND u.is_active = 1
         ORDER BY is_online_now DESC, u.role ASC, u.full_name ASC`,
        [user.id]
      );

      contacts.users = users;
      return res.json(normalizeContacts(contacts));
    }

    return res.status(403).json({ status: "error", message: "Invalid role for contacts" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load contacts", error: error.message });
  }
};

const getThreads = async (req, res) => {
  try {
    const user = req.user;
    const access = getThreadAccessWhere();
    const [threads] = await pool.query(
      `${threadSelectSql}
       ${access.where}
       ORDER BY COALESCE(last_message_at, mt.updated_at) DESC, mt.id DESC`,
      [user.id, user.id, user.id]
    );

    return res.json(threads);
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load message threads", error: error.message });
  }
};

const getThreadDetails = async (req, res) => {
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
      `${threadSelectSql}
       WHERE mt.id = ?`,
      [user.id, id]
    );

    const [messages] = await pool.query(
      `SELECT m.id, m.thread_id, m.sender_id, m.message_body, m.is_read, m.created_at,
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
    return res.status(500).json({ status: "error", message: "Failed to load thread details", error: error.message });
  }
};

const getRecipient = async (recipientId) => {
  const [[recipient]] = await pool.query(
    `SELECT id, full_name, email, role, team_id, partnership_id
     FROM users
     WHERE id = ? AND is_active = 1
     LIMIT 1`,
    [recipientId]
  );

  return recipient || null;
};

const canMessageRecipient = async (sender, recipient) => {
  if (!recipient || Number(sender.id) === Number(recipient.id)) return { allowed: false, message: "Invalid recipient" };
  if (isAdmin(sender) || isAdmin(recipient)) return { allowed: true };

  if (sender.role === "employee") {
    const partnership = await getCompanyPartnership(sender.partnership_id);
    if (!partnership) return { allowed: false, message: "Employee is not linked to a partnership" };

    if (isHbtUser(recipient) && Number(recipient.team_id) === Number(partnership.team_id)) return { allowed: true };
    if (isCompanyManager(recipient) && Number(recipient.partnership_id) === Number(sender.partnership_id)) return { allowed: true };
    return { allowed: false, message: "Recipient is not connected to your employer partnership" };
  }

  if (isCompanyManager(sender)) {
    const partnership = await getCompanyPartnership(sender.partnership_id);
    if (!partnership) return { allowed: false, message: "Company account is not linked to a partnership" };

    if (recipient.role === "employee" && Number(recipient.partnership_id) === Number(sender.partnership_id)) return { allowed: true };
    if (isHbtUser(recipient) && Number(recipient.team_id) === Number(partnership.team_id)) return { allowed: true };
    return { allowed: false, message: "Recipient is not connected to your company partnership" };
  }

  if (isHbtUser(sender)) {
    if (isHbtUser(recipient) && Number(recipient.team_id) === Number(sender.team_id)) return { allowed: true };

    if (recipient.role === "employee") {
      const partnership = await getCompanyPartnership(recipient.partnership_id);
      if (partnership && Number(partnership.team_id) === Number(sender.team_id)) return { allowed: true };
    }

    if (isCompanyManager(recipient)) {
      const partnership = await getCompanyPartnership(recipient.partnership_id);
      if (partnership && Number(partnership.team_id) === Number(sender.team_id)) return { allowed: true };
    }

    return { allowed: false, message: "Recipient is not connected to your HBT team" };
  }

  return { allowed: false, message: "You are not allowed to message this recipient" };
};

const buildThreadMetadata = async (sender, recipient) => {
  let employeeId = null;
  let partnershipId = null;
  let hbtTeamId = null;
  let assignedMemberId = null;

  if (sender.role === "employee") {
    employeeId = sender.id;
    partnershipId = sender.partnership_id;
  }

  if (recipient.role === "employee") {
    employeeId = recipient.id;
    partnershipId = recipient.partnership_id;
  }

  if (isCompanyManager(sender)) partnershipId = sender.partnership_id;
  if (isCompanyManager(recipient)) partnershipId = recipient.partnership_id;

  if (isHbtUser(sender)) {
    hbtTeamId = sender.team_id;
    assignedMemberId = sender.id;
  }

  if (isHbtUser(recipient)) {
    hbtTeamId = recipient.team_id;
    assignedMemberId = recipient.id;
  }

  if (!hbtTeamId && partnershipId) {
    const partnership = await getCompanyPartnership(partnershipId);
    hbtTeamId = partnership?.team_id || null;
  }

  if (isAdmin(sender) || isAdmin(recipient)) {
    hbtTeamId = null;
    assignedMemberId = isHbtUser(sender) ? sender.id : isHbtUser(recipient) ? recipient.id : null;
  }

  return { employeeId, partnershipId, hbtTeamId, assignedMemberId };
};

const createThread = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const user = req.user;
    const { subject, message_body, recipient_id } = req.body;

    if (!subject || !message_body || !recipient_id) {
      return res.status(400).json({ status: "error", message: "Subject, message, and recipient are required for one-to-one conversations" });
    }

    const recipient = await getRecipient(recipient_id);
    const access = await canMessageRecipient(user, recipient);

    if (!access.allowed) {
      return res.status(403).json({ status: "error", message: access.message || "You cannot message this recipient" });
    }

    const metadata = await buildThreadMetadata(user, recipient);

    await connection.beginTransaction();

    const [threadResult] = await connection.query(
      `INSERT INTO message_threads
       (subject, employee_id, hbt_team_id, partnership_id, assigned_member_id, recipient_id, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`,
      [
        subject.trim(),
        metadata.employeeId,
        metadata.hbtTeamId,
        metadata.partnershipId,
        metadata.assignedMemberId,
        recipient.id,
        user.id,
      ]
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
    return res.status(500).json({ status: "error", message: "Failed to create message thread", error: error.message });
  } finally {
    connection.release();
  }
};

const replyToThread = async (req, res) => {
  try {
    const { id } = req.params;
    const { message_body } = req.body;
    const user = req.user;

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
    return res.status(500).json({ status: "error", message: "Failed to send reply", error: error.message });
  }
};

const updateThreadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user;
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
    return res.status(500).json({ status: "error", message: "Failed to update thread status", error: error.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const user = req.user;

    const [[message]] = await pool.query(
      `SELECT m.id, m.thread_id, m.sender_id
       FROM messages m
       WHERE m.id = ?
       LIMIT 1`,
      [messageId]
    );

    if (!message) {
      return res.status(404).json({ status: "error", message: "Message not found" });
    }

    const thread = await getThreadForAccess(message.thread_id, user);
    const canDelete = thread && (Number(message.sender_id) === Number(user.id) || isAdmin(user));

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

const deleteThread = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;
    const user = req.user;
    const thread = await getThreadForAccess(id, user);

    if (!thread) {
      return res.status(404).json({ status: "error", message: "Thread not found or access denied" });
    }

    const canDelete = Number(thread.created_by) === Number(user.id) || isAdmin(user);

    if (!canDelete) {
      return res.status(403).json({ status: "error", message: "Only the conversation creator can delete the full conversation" });
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
router.delete("/messages/:messageId", protect, deleteMessage);
router.delete("/threads/:id", protect, deleteThread);

module.exports = router;
