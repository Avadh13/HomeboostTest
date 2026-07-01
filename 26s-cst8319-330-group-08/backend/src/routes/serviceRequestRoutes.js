const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");
const { createNotification, createAdminNotification } = require("../utils/notificationService");

const router = express.Router();

const statuses = ["new", "contacted", "in_review", "appointment_booked", "documents_requested", "completed", "closed"];
const contactMethods = ["email", "phone", "text", "no_preference"];
const isAdmin = (user) => user?.role === "admin" || user?.role === "super_admin";
const isHbtUser = (user) => user?.role === "hbt_admin" || user?.role === "hbt_member";

const normalizeText = (value, max = 255) => String(value || "").trim().slice(0, max);
const normalizeEmail = (value) => normalizeText(value, 255).toLowerCase();
const toBool = (value) => (value === true || value === 1 || value === "1" || value === "true" ? 1 : 0);
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

let schemaReady = false;
let schemaPromise = null;

const addColumnIfMissing = async (table, column, definition) => {
  const [rows] = await pool.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  if (rows.length === 0) await pool.query(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
};

const ensureSchema = async () => {
  if (schemaReady) return;
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mortgage_services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_key VARCHAR(160) NOT NULL UNIQUE,
        title VARCHAR(180) NOT NULL,
        short_title VARCHAR(80) NULL,
        description TEXT NULL,
        icon VARCHAR(20) DEFAULT '🏡',
        color_class VARCHAR(120) DEFAULT 'from-blue-500 to-violet-500',
        display_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS mortgage_service_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        service_id INT NULL,
        service_key VARCHAR(160) NULL,
        service_title VARCHAR(180) NULL,
        requester_user_id INT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NULL,
        preferred_contact_method ENUM('email','phone','text','no_preference') DEFAULT 'no_preference',
        preferred_time VARCHAR(120) NULL,
        message TEXT NULL,
        consent TINYINT(1) DEFAULT 0,
        status ENUM('new','contacted','in_review','appointment_booked','documents_requested','completed','closed') DEFAULT 'new',
        partnership_id INT NULL,
        hbt_team_id INT NULL,
        assigned_member_id INT NULL,
        message_thread_id INT NULL,
        source VARCHAR(80) DEFAULT 'website',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_msr_status (status),
        INDEX idx_msr_requester (requester_user_id),
        INDEX idx_msr_partnership (partnership_id),
        INDEX idx_msr_hbt_team (hbt_team_id),
        INDEX idx_msr_assigned_member (assigned_member_id),
        INDEX idx_msr_message_thread (message_thread_id),
        CONSTRAINT fk_msr_service FOREIGN KEY (service_id) REFERENCES mortgage_services(id) ON DELETE SET NULL
      )
    `);

    await addColumnIfMissing("mortgage_service_requests", "message_thread_id", "message_thread_id INT NULL AFTER assigned_member_id");

    schemaReady = true;
  })();

  try {
    await schemaPromise;
  } finally {
    schemaPromise = null;
  }
};

const optionalUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ") || !process.env.JWT_SECRET) return next();

    const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    const [users] = await pool.query(
      `SELECT id, full_name, email, role, team_id, partnership_id, phone, is_active FROM users WHERE id = ? LIMIT 1`,
      [decoded.id]
    );

    if (users[0] && Number(users[0].is_active) === 1) req.user = users[0];
  } catch {
    // Keep public intake available if optional token is missing or expired.
  }
  next();
};

const getPartnershipContext = async (user, partnershipSlug) => {
  if (user?.partnership_id) {
    const [[row]] = await pool.query(`SELECT id, team_id FROM partnerships WHERE id = ? LIMIT 1`, [user.partnership_id]);
    return row ? { partnership_id: row.id, hbt_team_id: row.team_id } : { partnership_id: user.partnership_id, hbt_team_id: null };
  }

  const slug = normalizeText(partnershipSlug, 120).toLowerCase();
  if (!slug) return { partnership_id: null, hbt_team_id: null };

  const [[row]] = await pool.query(`SELECT id, team_id FROM partnerships WHERE slug = ? LIMIT 1`, [slug]);
  return row ? { partnership_id: row.id, hbt_team_id: row.team_id } : { partnership_id: null, hbt_team_id: null };
};

const getService = async ({ serviceId, serviceKey }) => {
  if (serviceId) {
    const [[service]] = await pool.query(`SELECT id, service_key, title FROM mortgage_services WHERE id = ? LIMIT 1`, [serviceId]);
    if (service) return service;
  }

  const key = normalizeText(serviceKey, 160);
  if (key) {
    const [[service]] = await pool.query(`SELECT id, service_key, title FROM mortgage_services WHERE service_key = ? LIMIT 1`, [key]);
    if (service) return service;
  }

  return null;
};

const findAdvisorForRequest = async ({ hbtTeamId }) => {
  if (!hbtTeamId) return null;

  const [[advisor]] = await pool.query(
    `SELECT u.id, u.full_name, u.email, u.role, u.team_id, u.partnership_id
     FROM users u
     WHERE u.is_active = 1
       AND u.team_id = ?
       AND u.role IN ('hbt_member', 'hbt_admin')
     ORDER BY FIELD(u.role, 'hbt_member', 'hbt_admin'), u.id ASC
     LIMIT 1`,
    [hbtTeamId]
  );

  return advisor || null;
};

const createAdvisorThread = async ({ connection, requestId, requester, advisor, context, service, message }) => {
  if (!requester?.id || !advisor?.id) return null;

  const subject = `Mortgage Request #${requestId}: ${service.title}`;
  const body = [
    `Hi, I submitted a mortgage support request for: ${service.title}.`,
    message ? `Details: ${message}` : null,
    "Please let me know the next step.",
  ].filter(Boolean).join("\n\n");

  const [threadResult] = await connection.query(
    `INSERT INTO message_threads
     (subject, employee_id, hbt_team_id, partnership_id, assigned_member_id, recipient_id, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, 'open', ?)`,
    [subject, requester.id, context.hbt_team_id, context.partnership_id, advisor.id, advisor.id, requester.id]
  );

  const threadId = threadResult.insertId;
  await connection.query(`INSERT INTO messages (thread_id, sender_id, message_body, is_read) VALUES (?, ?, ?, 0)`, [threadId, requester.id, body]);
  await connection.query(`UPDATE mortgage_service_requests SET message_thread_id = ? WHERE id = ?`, [threadId, requestId]);
  return threadId;
};

const notifyRequestCreated = async ({ requestId, requester, advisor, context, service, threadId, isPublicRequest }) => {
  const requestLink = "/admin/service-requests";
  const hbtLink = threadId ? "/hbt/messages" : "/hbt/dashboard";
  const employeeLink = threadId ? "/employee/messages" : "/mortgage-request";
  const personName = requester?.full_name || "A client";

  if (advisor?.id) {
    await createNotification({
      user_id: advisor.id,
      title: "New mortgage request assigned",
      message: `${personName} requested help with ${service.title}.`,
      link: hbtLink,
      type: "info",
    });
  }

  if (context.hbt_team_id) {
    await createNotification({
      target_role: "hbt_admin",
      target_team_id: context.hbt_team_id,
      title: "New mortgage request",
      message: `${personName} submitted a ${service.title} request.`,
      link: "/hbt/dashboard",
      type: "info",
    });
  }

  await createAdminNotification({
    title: "New mortgage service request",
    message: `${personName} submitted request #${requestId}: ${service.title}.`,
    link: requestLink,
    type: "system",
  });

  if (requester?.id && !isPublicRequest) {
    await createNotification({
      user_id: requester.id,
      target_partnership_id: context.partnership_id,
      title: "Mortgage request submitted",
      message: advisor?.full_name ? `Your request was sent to ${advisor.full_name}.` : "Your request was submitted for advisor review.",
      link: employeeLink,
      type: "success",
    });
  }
};

const requestSelectSql = `
  SELECT
    r.*,
    s.icon AS service_icon,
    s.color_class AS service_color_class,
    u.full_name AS requester_name,
    u.email AS requester_email,
    assigned.full_name AS assigned_member_name,
    assigned.email AS assigned_member_email,
    p.slug AS partnership_slug,
    e.name AS employer_name,
    h.name AS hbt_team_name
  FROM mortgage_service_requests r
  LEFT JOIN mortgage_services s ON r.service_id = s.id
  LEFT JOIN users u ON r.requester_user_id = u.id
  LEFT JOIN users assigned ON r.assigned_member_id = assigned.id
  LEFT JOIN partnerships p ON r.partnership_id = p.id
  LEFT JOIN employers e ON p.employer_id = e.id
  LEFT JOIN home_buying_teams h ON r.hbt_team_id = h.id
`;

router.post("/", optionalUser, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await ensureSchema();

    const service = await getService({ serviceId: req.body.service_id, serviceKey: req.body.service_key });
    if (!service) return res.status(400).json({ status: "error", message: "Please choose a valid mortgage service" });

    const fullName = normalizeText(req.body.full_name || req.user?.full_name, 255);
    const email = normalizeEmail(req.body.email || req.user?.email);
    const phone = normalizeText(req.body.phone || req.user?.phone, 50) || null;
    const preferredContactMethod = contactMethods.includes(req.body.preferred_contact_method) ? req.body.preferred_contact_method : "no_preference";
    const preferredTime = normalizeText(req.body.preferred_time, 120) || null;
    const message = normalizeText(req.body.message, 3000) || null;
    const consent = toBool(req.body.consent);

    if (!fullName || !email) return res.status(400).json({ status: "error", message: "Name and email are required" });
    if (!isValidEmail(email)) return res.status(400).json({ status: "error", message: "Please enter a valid email" });
    if (!consent) return res.status(400).json({ status: "error", message: "Please confirm before submitting this request" });

    const context = await getPartnershipContext(req.user, req.body.partnership_slug);
    const advisor = await findAdvisorForRequest({ hbtTeamId: context.hbt_team_id });

    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO mortgage_service_requests
       (service_id, service_key, service_title, requester_user_id, full_name, email, phone, preferred_contact_method, preferred_time, message, consent, partnership_id, hbt_team_id, assigned_member_id, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        service.id,
        service.service_key,
        service.title,
        req.user?.id || null,
        fullName,
        email,
        phone,
        preferredContactMethod,
        preferredTime,
        message,
        consent,
        context.partnership_id,
        context.hbt_team_id,
        advisor?.id || null,
        normalizeText(req.body.source, 80) || (req.user ? "employee_portal" : "website"),
      ]
    );

    const requestId = result.insertId;
    const threadId = await createAdvisorThread({ connection, requestId, requester: req.user, advisor, context, service, message });
    await connection.commit();

    await notifyRequestCreated({
      requestId,
      requester: req.user || { full_name: fullName, email },
      advisor,
      context,
      service,
      threadId,
      isPublicRequest: !req.user,
    });

    return res.status(201).json({
      status: "success",
      message: "Mortgage request submitted successfully",
      request_id: requestId,
      assigned_member_id: advisor?.id || null,
      assigned_member_name: advisor?.full_name || null,
      thread_id: threadId,
      next_step: threadId ? "A private advisor conversation was created in Messages." : "An advisor will review this request and follow up.",
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to submit mortgage request", error: error.message });
  } finally {
    connection.release();
  }
});

router.get("/my", protect, async (req, res) => {
  try {
    await ensureSchema();
    const [requests] = await pool.query(`${requestSelectSql} WHERE r.requester_user_id = ? ORDER BY r.created_at DESC`, [req.user.id]);
    return res.json({ status: "success", requests });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load your mortgage requests", error: error.message });
  }
});

router.get("/hbt", protect, async (req, res) => {
  try {
    await ensureSchema();
    if (!isHbtUser(req.user)) return res.status(403).json({ status: "error", message: "HBT access required" });

    const [requests] = await pool.query(
      `${requestSelectSql}
       WHERE r.hbt_team_id = ? OR r.assigned_member_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.team_id, req.user.id]
    );
    return res.json({ status: "success", requests });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load HBT mortgage requests", error: error.message });
  }
});

router.get("/admin", protect, async (req, res) => {
  try {
    await ensureSchema();
    if (!isAdmin(req.user)) return res.status(403).json({ status: "error", message: "Admin access required" });

    const [requests] = await pool.query(`${requestSelectSql} ORDER BY r.created_at DESC LIMIT 500`);
    return res.json({ status: "success", requests });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load admin mortgage requests", error: error.message });
  }
});

router.put("/:id/status", protect, async (req, res) => {
  try {
    await ensureSchema();
    const status = statuses.includes(req.body.status) ? req.body.status : null;
    if (!status) return res.status(400).json({ status: "error", message: "Invalid request status" });

    const [[request]] = await pool.query(`SELECT * FROM mortgage_service_requests WHERE id = ? LIMIT 1`, [req.params.id]);
    if (!request) return res.status(404).json({ status: "error", message: "Mortgage request not found" });

    const canUpdate = isAdmin(req.user) || (isHbtUser(req.user) && (Number(request.hbt_team_id) === Number(req.user.team_id) || Number(request.assigned_member_id) === Number(req.user.id)));
    if (!canUpdate) return res.status(403).json({ status: "error", message: "You cannot update this mortgage request" });

    await pool.query(
      `UPDATE mortgage_service_requests SET status = ?, assigned_member_id = COALESCE(?, assigned_member_id) WHERE id = ?`,
      [status, req.body.assigned_member_id || null, req.params.id]
    );

    if (request.requester_user_id) {
      await createNotification({
        user_id: request.requester_user_id,
        target_partnership_id: request.partnership_id,
        title: "Mortgage request updated",
        message: `Your ${request.service_title || "mortgage"} request status changed to ${status.replace(/_/g, " ")}.`,
        link: request.message_thread_id ? "/employee/messages" : "/mortgage-request",
        type: "info",
      });
    }

    return res.json({ status: "success", message: "Mortgage request status updated" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update mortgage request status", error: error.message });
  }
});

module.exports = router;
