const pool = require("../config/db");

const isAdmin = (user) =>
  user.role === "admin" || user.role === "super_admin";

const isHbtUser = (user) =>
  user.role === "hbt_admin" || user.role === "hbt_member";

const isRecentlyOnlineSql = `
  CASE
    WHEN u.last_seen_at IS NOT NULL
    AND u.last_seen_at >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    THEN 1
    ELSE 0
  END
`;

const getThreadAccessClause = (user) => {
  if (isAdmin(user)) {
    return {
      where: "",
      params: [],
    };
  }

  if (isHbtUser(user)) {
    return {
      where: "WHERE mt.hbt_team_id = ?",
      params: [user.team_id],
    };
  }

  return {
    where: "WHERE mt.employee_id = ?",
    params: [user.id],
  };
};

const verifyThreadAccess = async (threadId, user) => {
  let sql = `
    SELECT mt.*
    FROM message_threads mt
    WHERE mt.id = ?
  `;

  const params = [threadId];

  if (isHbtUser(user)) {
    sql += " AND mt.hbt_team_id = ?";
    params.push(user.team_id);
  }

  if (user.role === "employee") {
    sql += " AND mt.employee_id = ?";
    params.push(user.id);
  }

  const [threads] = await pool.query(sql, params);

  return threads[0] || null;
};

exports.updatePresence = async (req, res) => {
  try {
    const user = req.user;

    await pool.query(
      `
      UPDATE users
      SET last_seen_at = NOW(),
          is_online = 1
      WHERE id = ?
      `,
      [user.id]
    );

    res.json({
      status: "success",
      message: "Presence updated",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update presence",
      error: error.message,
    });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const user = req.user;

    const contacts = {
      quick_actions: [],
      users: [],
    };

    if (user.role === "employee") {
      if (!user.partnership_id) {
        return res.json({
          quick_actions: [
            {
              type: "admin",
              label: "Contact Admin Support",
              description: "Ask HomeBoost admin for help.",
            },
          ],
          users: [],
        });
      }

      const [partnerships] = await pool.query(
        `
        SELECT 
          p.id AS partnership_id,
          p.team_id,
          p.slug,
          e.name AS company_name,
          h.name AS hbt_team_name
        FROM partnerships p
        LEFT JOIN employers e ON p.employer_id = e.id
        LEFT JOIN home_buying_teams h ON p.team_id = h.id
        WHERE p.id = ?
        LIMIT 1
        `,
        [user.partnership_id]
      );

      const partnership = partnerships[0];

      contacts.quick_actions.push({
        type: "hbt_team",
        label: "Contact My HBT Team",
        description: partnership
          ? `Send a message to ${partnership.hbt_team_name || "your HBT team"}.`
          : "Send a message to your assigned HBT team.",
        partnership_id: user.partnership_id,
        hbt_team_id: partnership?.team_id || null,
      });

      contacts.quick_actions.push({
        type: "admin",
        label: "Contact Admin Support",
        description: "Ask HomeBoost admin for help.",
      });

      if (partnership?.team_id) {
        const [members] = await pool.query(
          `
          SELECT
            u.id,
            u.full_name,
            u.email,
            u.role,
            u.team_id,
            u.last_seen_at,
            ${isRecentlyOnlineSql} AS is_online_now,
            tm.title,
            tm.phone,
            tm.photo_url
          FROM users u
          LEFT JOIN team_members tm ON tm.user_id = u.id
          WHERE u.team_id = ?
          AND u.role IN ('hbt_admin', 'hbt_member')
          AND u.is_active = 1
          ORDER BY is_online_now DESC, u.full_name ASC
          `,
          [partnership.team_id]
        );

        contacts.users = members.map((member) => ({
          id: member.id,
          full_name: member.full_name,
          email: member.email,
          role: member.role,
          team_id: member.team_id,
          title: member.title,
          phone: member.phone,
          photo_url: member.photo_url,
          is_online: Number(member.is_online_now) === 1,
          status_label: Number(member.is_online_now) === 1 ? "Online" : "Offline",
          last_seen_at: member.last_seen_at,
        }));
      }

      return res.json(contacts);
    }

    if (isHbtUser(user)) {
      contacts.quick_actions.push({
        type: "hbt_team",
        label: "Message My HBT Team",
        description: "Start a team conversation.",
        hbt_team_id: user.team_id,
      });

      contacts.quick_actions.push({
        type: "admin",
        label: "Contact Admin Support",
        description: "Ask HomeBoost admin for help.",
      });

      const [teamUsers] = await pool.query(
        `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.role,
          u.team_id,
          u.partnership_id,
          u.last_seen_at,
          ${isRecentlyOnlineSql} AS is_online_now,
          e.name AS company_name,
          p.slug AS partnership_slug
        FROM users u
        LEFT JOIN partnerships p ON u.partnership_id = p.id
        LEFT JOIN employers e ON p.employer_id = e.id
        WHERE (
          u.team_id = ?
          OR p.team_id = ?
        )
        AND u.id != ?
        AND u.is_active = 1
        AND u.role IN ('employee', 'hbt_admin', 'hbt_member')
        ORDER BY is_online_now DESC, u.role ASC, u.full_name ASC
        `,
        [user.team_id, user.team_id, user.id]
      );

      contacts.users = teamUsers.map((contact) => ({
        id: contact.id,
        full_name: contact.full_name,
        email: contact.email,
        role: contact.role,
        team_id: contact.team_id,
        partnership_id: contact.partnership_id,
        company_name: contact.company_name,
        partnership_slug: contact.partnership_slug,
        is_online: Number(contact.is_online_now) === 1,
        status_label: Number(contact.is_online_now) === 1 ? "Online" : "Offline",
        last_seen_at: contact.last_seen_at,
      }));

      return res.json(contacts);
    }

    if (isAdmin(user)) {
      contacts.quick_actions.push({
        type: "admin",
        label: "Admin Support",
        description: "Internal admin communication.",
      });

      const [allUsers] = await pool.query(
        `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.role,
          u.team_id,
          u.partnership_id,
          u.last_seen_at,
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
        ORDER BY is_online_now DESC, u.role ASC, u.full_name ASC
        `,
        [user.id]
      );

      contacts.users = allUsers.map((contact) => ({
        id: contact.id,
        full_name: contact.full_name,
        email: contact.email,
        role: contact.role,
        team_id: contact.team_id,
        partnership_id: contact.partnership_id,
        hbt_team_name: contact.hbt_team_name,
        company_name: contact.company_name,
        partnership_slug: contact.partnership_slug,
        is_online: Number(contact.is_online_now) === 1,
        status_label: Number(contact.is_online_now) === 1 ? "Online" : "Offline",
        last_seen_at: contact.last_seen_at,
      }));

      return res.json(contacts);
    }

    res.status(403).json({
      status: "error",
      message: "Invalid role for contacts",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load contacts",
      error: error.message,
    });
  }
};

exports.getThreads = async (req, res) => {
  try {
    const user = req.user;
    const access = getThreadAccessClause(user);

    const [threads] = await pool.query(
      `
      SELECT
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
      ${access.where}
      ORDER BY COALESCE(last_message_at, mt.updated_at) DESC, mt.id DESC
      `,
      [user.id, ...access.params]
    );

    res.json(threads);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load message threads",
      error: error.message,
    });
  }
};

exports.getThreadDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const thread = await verifyThreadAccess(id, user);

    if (!thread) {
      return res.status(404).json({
        status: "error",
        message: "Thread not found or access denied",
      });
    }

    await pool.query(
      `
      UPDATE messages
      SET is_read = 1
      WHERE thread_id = ?
      AND sender_id != ?
      `,
      [id, user.id]
    );

    const [threadRows] = await pool.query(
      `
      SELECT
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
      WHERE mt.id = ?
      `,
      [id]
    );

    const [messages] = await pool.query(
      `
      SELECT
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
      ORDER BY m.id ASC
      `,
      [id]
    );

    res.json({
      thread: threadRows[0],
      messages,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load thread details",
      error: error.message,
    });
  }
};

exports.createThread = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const user = req.user;
    const {
      subject,
      message_body,
      employee_id,
      partnership_id,
      assigned_member_id,
      contact_type,
      recipient_id,
    } = req.body;

    if (!subject || !message_body) {
      return res.status(400).json({
        status: "error",
        message: "Subject and message are required",
      });
    }

    let finalEmployeeId = null;
    let finalPartnershipId = null;
    let finalTeamId = null;
    let finalAssignedMemberId = assigned_member_id || null;

    if (recipient_id && !finalAssignedMemberId) {
      finalAssignedMemberId = recipient_id;
    }

    if (user.role === "employee") {
      finalEmployeeId = user.id;
      finalPartnershipId = user.partnership_id;

      if (!finalPartnershipId) {
        return res.status(400).json({
          status: "error",
          message: "Employee is not connected to a partnership",
        });
      }

      const [partnerships] = await connection.query(
        `
        SELECT id, team_id
        FROM partnerships
        WHERE id = ?
        LIMIT 1
        `,
        [finalPartnershipId]
      );

      if (partnerships.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Partnership not found",
        });
      }

      finalTeamId = partnerships[0].team_id;

      if (contact_type === "admin") {
        finalTeamId = null;
        finalAssignedMemberId = null;
      }

      if (finalAssignedMemberId) {
        const [members] = await connection.query(
          `
          SELECT id
          FROM users
          WHERE id = ?
          AND role IN ('hbt_admin', 'hbt_member')
          AND team_id = ?
          AND is_active = 1
          LIMIT 1
          `,
          [finalAssignedMemberId, partnerships[0].team_id]
        );

        if (members.length === 0) {
          return res.status(403).json({
            status: "error",
            message: "Selected member is not assigned to your HBT team",
          });
        }
      }
    } else if (isHbtUser(user)) {
      finalTeamId = user.team_id;
      finalEmployeeId = employee_id || null;
      finalPartnershipId = partnership_id || null;

      if (finalAssignedMemberId && Number(finalAssignedMemberId) === Number(user.id)) {
        finalAssignedMemberId = user.id;
      }

      if (finalEmployeeId) {
        const [employees] = await connection.query(
          `
          SELECT u.id, u.partnership_id, p.team_id
          FROM users u
          LEFT JOIN partnerships p ON u.partnership_id = p.id
          WHERE u.id = ?
          AND u.role = 'employee'
          LIMIT 1
          `,
          [finalEmployeeId]
        );

        if (
          employees.length === 0 ||
          Number(employees[0].team_id) !== Number(user.team_id)
        ) {
          return res.status(403).json({
            status: "error",
            message: "Employee is not assigned to your HBT team",
          });
        }

        finalPartnershipId = employees[0].partnership_id;
      }
    } else if (isAdmin(user)) {
      finalEmployeeId = employee_id || null;
      finalPartnershipId = partnership_id || null;

      if (finalPartnershipId) {
        const [partnerships] = await connection.query(
          `
          SELECT id, team_id
          FROM partnerships
          WHERE id = ?
          LIMIT 1
          `,
          [finalPartnershipId]
        );

        finalTeamId = partnerships[0]?.team_id || null;
      }
    } else {
      return res.status(403).json({
        status: "error",
        message: "You are not allowed to create messages",
      });
    }

    await connection.beginTransaction();

    const [threadResult] = await connection.query(
      `
      INSERT INTO message_threads
      (subject, employee_id, hbt_team_id, partnership_id, assigned_member_id, status, created_by)
      VALUES (?, ?, ?, ?, ?, 'open', ?)
      `,
      [
        subject,
        finalEmployeeId,
        finalTeamId,
        finalPartnershipId,
        finalAssignedMemberId || null,
        user.id,
      ]
    );

    const threadId = threadResult.insertId;

    await connection.query(
      `
      INSERT INTO messages
      (thread_id, sender_id, message_body, is_read)
      VALUES (?, ?, ?, 0)
      `,
      [threadId, user.id, message_body]
    );

    await connection.commit();

    res.status(201).json({
      status: "success",
      message: "Message thread created successfully",
      thread_id: threadId,
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      status: "error",
      message: "Failed to create message thread",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

exports.replyToThread = async (req, res) => {
  try {
    const { id } = req.params;
    const { message_body } = req.body;
    const user = req.user;

    if (!message_body || !message_body.trim()) {
      return res.status(400).json({
        status: "error",
        message: "Message body is required",
      });
    }

    const thread = await verifyThreadAccess(id, user);

    if (!thread) {
      return res.status(404).json({
        status: "error",
        message: "Thread not found or access denied",
      });
    }

    await pool.query(
      `
      INSERT INTO messages
      (thread_id, sender_id, message_body, is_read)
      VALUES (?, ?, ?, 0)
      `,
      [id, user.id, message_body.trim()]
    );

    await pool.query(
      `
      UPDATE message_threads
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [id]
    );

    res.status(201).json({
      status: "success",
      message: "Reply sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to send reply",
      error: error.message,
    });
  }
};

exports.updateThreadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = req.user;

    const allowedStatuses = ["open", "pending", "closed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid status",
      });
    }

    const thread = await verifyThreadAccess(id, user);

    if (!thread) {
      return res.status(404).json({
        status: "error",
        message: "Thread not found or access denied",
      });
    }

    await pool.query(
      `
      UPDATE message_threads
      SET status = ?
      WHERE id = ?
      `,
      [status, id]
    );

    res.json({
      status: "success",
      message: "Thread status updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update thread status",
      error: error.message,
    });
  }
};

exports.assignThread = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_member_id } = req.body;
    const user = req.user;

    if (!isAdmin(user) && user.role !== "hbt_admin") {
      return res.status(403).json({
        status: "error",
        message: "Only Admin or HBT Admin can assign conversations",
      });
    }

    const thread = await verifyThreadAccess(id, user);

    if (!thread) {
      return res.status(404).json({
        status: "error",
        message: "Thread not found or access denied",
      });
    }

    if (assigned_member_id) {
      const [members] = await pool.query(
        `
        SELECT id
        FROM users
        WHERE id = ?
        AND role = 'hbt_member'
        AND team_id = ?
        LIMIT 1
        `,
        [assigned_member_id, thread.hbt_team_id]
      );

      if (members.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "Assigned member must belong to this HBT team",
        });
      }
    }

    await pool.query(
      `
      UPDATE message_threads
      SET assigned_member_id = ?
      WHERE id = ?
      `,
      [assigned_member_id || null, id]
    );

    res.json({
      status: "success",
      message: "Thread assigned successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to assign thread",
      error: error.message,
    });
  }
};