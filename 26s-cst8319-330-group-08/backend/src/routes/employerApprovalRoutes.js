const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");
const { createNotification } = require("../utils/notificationService");
const {
  createInviteCredentials,
  publicInvitePayload,
  deliveryPayload,
} = require("../services/inviteSecurityService");
const { createActivationInvitation } = require("../services/accountActivationService");
const { recordAuditEvent } = require("../services/auditLogService");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const companyRoles = ["company", "company_admin"];
const hbtRoles = ["hbt_admin", "hbt_member"];
const clean = (value, max = 255) => String(value || "").trim().slice(0, max);
const emailClean = (value) => clean(value, 255).toLowerCase();
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const canReview = (user) => adminRoles.includes(user?.role);
const canUseCompanyFlow = (user) => canReview(user) || user?.role === "hbt_admin" || companyRoles.includes(user?.role);
const ensureEmployerApprovalTables = async () => undefined;

const getPartnershipContext = async (partnershipId, connection = pool, options = {}) => {
  const lock = options.forUpdate ? " FOR UPDATE" : "";
  const [[row]] = await connection.query(
    `SELECT
       p.id AS partnership_id,
       p.team_id,
       p.employer_id,
       p.slug,
       p.status AS partnership_status,
       e.name AS employer_name,
       h.name AS team_name
     FROM partnerships p
     LEFT JOIN employers e ON e.id = p.employer_id
     LEFT JOIN home_buying_teams h ON h.id = p.team_id
     WHERE p.id = ?
     LIMIT 1${lock}`,
    [partnershipId],
  );
  return row || null;
};

const canAccessPartnership = async (user, partnershipId, connection = pool) => {
  if (adminRoles.includes(user?.role)) return true;
  if (companyRoles.includes(user?.role)) return Number(user.partnership_id) === Number(partnershipId);
  if (hbtRoles.includes(user?.role) && user?.team_id) {
    const context = await getPartnershipContext(partnershipId, connection);
    return Number(context?.team_id) === Number(user.team_id);
  }
  return false;
};

const notifyRequester = async (request, status, reviewNote) => {
  const labels = {
    approved: "Employer request approved",
    needs_info: "More employer information is required",
    rejected: "Employer request rejected",
  };
  const messages = {
    approved: `${request.requested_company_name} was approved. The employer contact can now activate the Company Manager account.`,
    needs_info: reviewNote || `More information is required for ${request.requested_company_name}.`,
    rejected: reviewNote || `${request.requested_company_name} was not approved.`,
  };
  const type = status === "approved" ? "success" : status === "needs_info" ? "warning" : "system";

  if (request.requested_by_user_id) {
    await createNotification({
      user_id: request.requested_by_user_id,
      title: labels[status] || "Employer request updated",
      message: messages[status] || reviewNote || null,
      link: "/hbt/employer-approvals",
      type,
    });
  }
};

const notifyAdminsOfRequest = async (companyName) => {
  await Promise.allSettled([
    createNotification({
      target_role: "admin",
      title: "New employer approval request",
      message: `${companyName} was submitted for review.`,
      link: "/admin/employer-approvals",
      type: "system",
    }),
    createNotification({
      target_role: "super_admin",
      title: "New employer approval request",
      message: `${companyName} was submitted for review.`,
      link: "/admin/employer-approvals",
      type: "system",
    }),
  ]);
};

router.use(protect);

router.get("/requests", async (req, res) => {
  try {
    if (!canUseCompanyFlow(req.user)) {
      return res.status(403).json({ status: "error", message: "Employer approval access required" });
    }

    const params = [];
    let clause = "WHERE 1=1";
    if (req.user.role === "hbt_admin") {
      if (!req.user.team_id) {
        return res.status(403).json({ status: "error", message: "HBT account is not linked to a team" });
      }
      clause += " AND ear.team_id = ?";
      params.push(req.user.team_id);
    } else if (companyRoles.includes(req.user.role)) {
      clause += " AND ear.partnership_id = ?";
      params.push(req.user.partnership_id);
    }

    const [requests] = await pool.query(
      `SELECT
         ear.*,
         e.name AS employer_name,
         h.name AS team_name,
         u.full_name AS requested_by_name,
         reviewer.full_name AS reviewed_by_name
       FROM employer_approval_requests ear
       LEFT JOIN employers e ON e.id = ear.employer_id
       LEFT JOIN home_buying_teams h ON h.id = ear.team_id
       LEFT JOIN users u ON u.id = ear.requested_by_user_id
       LEFT JOIN users reviewer ON reviewer.id = ear.reviewed_by_user_id
       ${clause}
       ORDER BY ear.requested_at DESC, ear.id DESC
       LIMIT 250`,
      params,
    );

    return res.json({ status: "success", requests });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load employer approval requests" });
  }
});

router.post("/requests", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (!canUseCompanyFlow(req.user)) {
      return res.status(403).json({ status: "error", message: "Employer approval access required" });
    }

    const partnershipId = Number(req.body.partnership_id || req.user.partnership_id);
    if (!partnershipId) {
      return res.status(400).json({ status: "error", message: "partnership_id is required" });
    }
    if (!(await canAccessPartnership(req.user, partnershipId, connection))) {
      return res.status(404).json({ status: "error", message: "Partnership not found" });
    }

    const context = await getPartnershipContext(partnershipId, connection);
    if (!context) return res.status(404).json({ status: "error", message: "Partnership not found" });

    const companyName = clean(req.body.requested_company_name || context.employer_name, 180);
    const contactName = clean(req.body.contact_name || req.user.full_name, 180);
    const contactEmail = emailClean(req.body.contact_email || req.user.email);
    const contactPhone = clean(req.body.contact_phone, 80) || null;
    const contactTitle = clean(req.body.contact_title, 120) || null;
    if (!companyName || !contactName || !isEmail(contactEmail)) {
      return res.status(400).json({
        status: "error",
        message: "Company name, contact name, and valid contact email are required",
      });
    }

    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO employer_approval_requests
       (partnership_id, employer_id, team_id, requested_by_user_id,
        requested_company_name, contact_name, contact_email, contact_phone,
        contact_title, approval_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        partnershipId,
        context.employer_id,
        context.team_id,
        req.user.id,
        companyName,
        contactName,
        contactEmail,
        contactPhone,
        contactTitle,
      ],
    );

    await connection.query(
      `INSERT INTO company_points_of_contact
       (partnership_id, full_name, email, phone, title, is_primary, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE
         full_name = VALUES(full_name),
         phone = VALUES(phone),
         title = VALUES(title),
         is_active = 1`,
      [partnershipId, contactName, contactEmail, contactPhone, contactTitle, req.user.id],
    );

    await recordAuditEvent({
      connection,
      req,
      action: "employer_approval.requested",
      entityType: "employer_approval_request",
      entityId: result.insertId,
      teamId: context.team_id,
      partnershipId,
      metadata: { requested_company_name: companyName },
    });
    await connection.commit();
    await notifyAdminsOfRequest(companyName);

    return res.status(201).json({
      status: "success",
      message: "Employer approval request created",
      request_id: result.insertId,
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to create employer approval request" });
  } finally {
    connection.release();
  }
});

router.put("/requests/:id/status", async (req, res) => {
  if (!canReview(req.user)) {
    return res.status(403).json({ status: "error", message: "Admin approval permission required" });
  }

  const connection = await pool.getConnection();
  try {
    const status = clean(req.body.approval_status, 40);
    const reviewNote = clean(req.body.review_note, 2000);
    if (!["pending", "approved", "rejected", "needs_info"].includes(status)) {
      return res.status(400).json({ status: "error", message: "Invalid approval status" });
    }
    if (["rejected", "needs_info"].includes(status) && !reviewNote) {
      return res.status(400).json({ status: "error", message: "A review note is required for this decision" });
    }

    await connection.beginTransaction();
    const [[request]] = await connection.query(
      "SELECT * FROM employer_approval_requests WHERE id = ? LIMIT 1 FOR UPDATE",
      [req.params.id],
    );
    if (!request) {
      await connection.rollback();
      return res.status(404).json({ status: "error", message: "Approval request not found" });
    }

    let activationInvite = null;
    let reusedExistingUser = false;

    if (status === "approved") {
      const context = await getPartnershipContext(request.partnership_id, connection, { forUpdate: true });
      if (!context) {
        await connection.rollback();
        return res.status(409).json({ status: "error", message: "The request partnership is no longer available" });
      }

      await connection.query(
        `UPDATE employers
         SET is_active = 1,
             contact_email = COALESCE(NULLIF(?, ''), contact_email)
         WHERE id = ?`,
        [request.contact_email || "", context.employer_id],
      );
      await connection.query(
        "UPDATE partnerships SET status = 'active' WHERE id = ?",
        [context.partnership_id],
      );

      const [[existingUser]] = await connection.query(
        `SELECT id, role, partnership_id, is_active
         FROM users
         WHERE email = ?
         LIMIT 1 FOR UPDATE`,
        [request.contact_email],
      );

      if (existingUser) {
        if (!["company", "company_admin"].includes(existingUser.role)) {
          await connection.rollback();
          return res.status(409).json({
            status: "error",
            message: "The employer contact email already belongs to a different portal role",
          });
        }
        if (
          existingUser.partnership_id &&
          Number(existingUser.partnership_id) !== Number(request.partnership_id)
        ) {
          await connection.rollback();
          return res.status(409).json({
            status: "error",
            message: "The Company Manager account is already linked to a different employer",
          });
        }

        await connection.query(
          `UPDATE users
           SET full_name = ?, partnership_id = ?
           WHERE id = ? AND role IN ('company', 'company_admin')`,
          [request.contact_name || request.requested_company_name, request.partnership_id, existingUser.id],
        );
        await connection.query(
          `UPDATE company_points_of_contact
           SET user_id = ?, is_active = 1
           WHERE partnership_id = ? AND email = ?`,
          [existingUser.id, request.partnership_id, request.contact_email],
        );

        if (Number(existingUser.is_active) === 0) {
          const activation = await createActivationInvitation(connection, {
            userId: existingUser.id,
            email: request.contact_email,
            targetRole: existingUser.role,
            partnershipId: request.partnership_id,
            createdByUserId: req.user.id,
          });
          activationInvite = {
            type: "account_activation",
            activation_link: activation.activation_url,
            expires_in_hours: activation.expires_in_hours,
          };
        } else {
          reusedExistingUser = true;
        }
      } else {
        const credentials = createInviteCredentials();
        const fullName = request.contact_name || request.requested_company_name;

        await connection.query(
          `INSERT INTO employee_invites
           (partnership_id, invited_by_user_id, full_name, email, status,
            invite_role, invite_token, invite_code, invite_token_hash,
            invite_code_hash, expires_at, last_sent_at, revoked_at)
           VALUES (?, ?, ?, ?, 'invited', 'company_admin', NULL, NULL, ?, ?, DATE_ADD(NOW(), INTERVAL 14 DAY), NOW(), NULL)
           ON DUPLICATE KEY UPDATE
             full_name = VALUES(full_name),
             invited_by_user_id = VALUES(invited_by_user_id),
             status = IF(status = 'registered', 'registered', 'invited'),
             invite_role = IF(status = 'registered', invite_role, 'company_admin'),
             invite_token = NULL,
             invite_code = NULL,
             invite_token_hash = IF(status = 'registered', invite_token_hash, VALUES(invite_token_hash)),
             invite_code_hash = IF(status = 'registered', invite_code_hash, VALUES(invite_code_hash)),
             expires_at = IF(status = 'registered', expires_at, VALUES(expires_at)),
             last_sent_at = IF(status = 'registered', last_sent_at, NOW()),
             revoked_at = IF(status = 'registered', revoked_at, NULL)`,
          [
            request.partnership_id,
            req.user.id,
            fullName,
            request.contact_email,
            credentials.tokenHash,
            credentials.codeHash,
          ],
        );

        const [[invite]] = await connection.query(
          `SELECT
             ei.*,
             p.team_id,
             p.status AS partnership_status,
             p.slug AS partnership_slug,
             e.name AS employer_name
           FROM employee_invites ei
           JOIN partnerships p ON p.id = ei.partnership_id
           LEFT JOIN employers e ON e.id = p.employer_id
           WHERE ei.partnership_id = ? AND ei.email = ?
           LIMIT 1`,
          [request.partnership_id, request.contact_email],
        );
        if (invite?.status === "invited") {
          activationInvite = {
            type: "company_manager_invite",
            ...deliveryPayload(invite, credentials),
          };
          await connection.query(
            `INSERT INTO invite_logs (invite_id, action, actor_user_id, message)
             VALUES (?, 'created', ?, 'Company Manager invite generated after employer approval')`,
            [invite.id, req.user.id],
          );
        }
      }
    }

    const [updateResult] = await connection.query(
      `UPDATE employer_approval_requests
       SET approval_status = ?,
           review_note = ?,
           reviewed_by_user_id = ?,
           reviewed_at = NOW(),
           approved_at = IF(? = 'approved', NOW(), approved_at)
       WHERE id = ?`,
      [status, reviewNote || null, req.user.id, status, request.id],
    );
    if (Number(updateResult.affectedRows || 0) !== 1) {
      throw new Error("Employer approval update failed");
    }

    await recordAuditEvent({
      connection,
      req,
      action: `employer_approval.${status}`,
      entityType: "employer_approval_request",
      entityId: request.id,
      teamId: request.team_id,
      partnershipId: request.partnership_id,
      metadata: {
        previous_status: request.approval_status,
        new_status: status,
        review_note_present: Boolean(reviewNote),
        activation_type: activationInvite?.type || null,
        reused_existing_user: reusedExistingUser,
      },
    });
    await connection.commit();
    await notifyRequester(request, status, reviewNote).catch(() => undefined);

    return res.json({
      status: "success",
      message: status === "approved"
        ? "Employer approved and Company Manager activation prepared"
        : "Employer approval status updated",
      activation_invite: activationInvite,
      reused_existing_user: reusedExistingUser,
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to update employer approval status" });
  } finally {
    connection.release();
  }
});

router.get("/contacts", async (req, res) => {
  try {
    if (!canUseCompanyFlow(req.user)) {
      return res.status(403).json({ status: "error", message: "Company contact access required" });
    }
    const partnershipId = Number(req.query.partnership_id || req.user.partnership_id);
    if (!partnershipId) {
      return res.status(400).json({ status: "error", message: "partnership_id is required" });
    }
    if (!(await canAccessPartnership(req.user, partnershipId))) {
      return res.status(404).json({ status: "error", message: "Partnership not found" });
    }
    const [contacts] = await pool.query(
      `SELECT id, partnership_id, user_id, full_name, email, phone, title,
              is_primary, is_active, created_at, updated_at
       FROM company_points_of_contact
       WHERE partnership_id = ? AND is_active = 1
       ORDER BY is_primary DESC, id DESC`,
      [partnershipId],
    );
    return res.json({ status: "success", contacts });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load company contacts" });
  }
});

router.post("/contacts", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (!canUseCompanyFlow(req.user)) {
      return res.status(403).json({ status: "error", message: "Company contact access required" });
    }
    const partnershipId = Number(req.body.partnership_id || req.user.partnership_id);
    if (!partnershipId) {
      return res.status(400).json({ status: "error", message: "partnership_id is required" });
    }
    if (!(await canAccessPartnership(req.user, partnershipId, connection))) {
      return res.status(404).json({ status: "error", message: "Partnership not found" });
    }

    const fullName = clean(req.body.full_name, 180);
    const email = emailClean(req.body.email);
    if (!fullName || !isEmail(email)) {
      return res.status(400).json({ status: "error", message: "Full name and valid email are required" });
    }
    const isPrimary = req.body.is_primary ? 1 : 0;

    await connection.beginTransaction();
    if (isPrimary) {
      await connection.query(
        "UPDATE company_points_of_contact SET is_primary = 0 WHERE partnership_id = ?",
        [partnershipId],
      );
    }
    await connection.query(
      `INSERT INTO company_points_of_contact
       (partnership_id, full_name, email, phone, title, is_primary, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         full_name = VALUES(full_name),
         phone = VALUES(phone),
         title = VALUES(title),
         is_primary = VALUES(is_primary),
         is_active = 1`,
      [
        partnershipId,
        fullName,
        email,
        clean(req.body.phone, 80) || null,
        clean(req.body.title, 120) || null,
        isPrimary,
        req.user.id,
      ],
    );
    await recordAuditEvent({
      connection,
      req,
      action: "company_contact.saved",
      entityType: "company_point_of_contact",
      entityId: `${partnershipId}:${email}`,
      partnershipId,
      metadata: { is_primary: Boolean(isPrimary) },
    });
    await connection.commit();

    return res.status(201).json({ status: "success", message: "Company contact saved" });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to save company contact" });
  } finally {
    connection.release();
  }
});

router.delete("/contacts/:id", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (!canUseCompanyFlow(req.user)) {
      return res.status(403).json({ status: "error", message: "Company contact access required" });
    }

    await connection.beginTransaction();
    const [[contact]] = await connection.query(
      "SELECT * FROM company_points_of_contact WHERE id = ? LIMIT 1 FOR UPDATE",
      [req.params.id],
    );
    if (!contact || !(await canAccessPartnership(req.user, contact.partnership_id, connection))) {
      await connection.rollback();
      return res.status(404).json({ status: "error", message: "Contact not found" });
    }

    const [result] = await connection.query(
      "UPDATE company_points_of_contact SET is_active = 0, is_primary = 0 WHERE id = ?",
      [contact.id],
    );
    if (Number(result.affectedRows || 0) !== 1) {
      throw new Error("Company contact archive failed");
    }
    await recordAuditEvent({
      connection,
      req,
      action: "company_contact.archived",
      entityType: "company_point_of_contact",
      entityId: contact.id,
      partnershipId: contact.partnership_id,
      metadata: { was_primary: Boolean(contact.is_primary) },
    });
    await connection.commit();

    return res.json({ status: "success", message: "Company contact removed" });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to remove company contact" });
  } finally {
    connection.release();
  }
});

module.exports = router;
module.exports.ensureEmployerApprovalTables = ensureEmployerApprovalTables;
module.exports.canAccessPartnership = canAccessPartnership;
