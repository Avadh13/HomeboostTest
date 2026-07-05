const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");
const { ensureAdvancedLeadTables } = require("../services/readinessService");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const hbtRoles = ["hbt_admin", "hbt_member"];
const allowedStages = ["new_lead", "contacted", "appointment_booked", "docs_requested", "pre_approval", "active_search", "closed", "not_interested"];
const allowedPriorities = ["hot", "warm", "cold"];

const isAdmin = (user) => adminRoles.includes(user?.role);
const isHbt = (user) => hbtRoles.includes(user?.role);

const normalizeLead = (row) => ({
  ...row,
  readiness_score: row.readiness_score === null || row.readiness_score === undefined ? null : Number(row.readiness_score),
  is_overdue: row.follow_up_due_at ? new Date(row.follow_up_due_at).getTime() < Date.now() && row.status === "open" : false,
});

const getAccess = (user) => {
  if (isAdmin(user)) return { where: "", params: [] };
  if (isHbt(user)) return { where: "WHERE p.team_id = ?", params: [user.team_id] };
  return { where: "WHERE p.team_id = -1", params: [] };
};

const canAccessLead = async (leadId, user) => {
  const access = getAccess(user);
  const [rows] = await pool.query(
    `SELECT lp.id, lp.employee_user_id, lp.assigned_team_member_user_id, p.team_id
     FROM lead_pipeline lp
     LEFT JOIN partnerships p ON p.id = lp.partnership_id
     WHERE lp.id = ? ${access.where ? "AND p.team_id = ?" : ""}
     LIMIT 1`,
    [leadId, ...access.params]
  );
  return rows[0] || null;
};

const getLeadList = async (user) => {
  const access = getAccess(user);
  const [rows] = await pool.query(
    `SELECT
      lp.id,
      lp.employee_user_id,
      lp.partnership_id,
      lp.assigned_team_member_user_id,
      lp.readiness_score_id,
      lp.source_type,
      lp.source_id,
      lp.stage,
      lp.priority,
      lp.status,
      lp.next_action,
      lp.follow_up_due_at,
      lp.last_contacted_at,
      lp.created_at,
      lp.updated_at,
      employee.full_name AS employee_name,
      employee.email AS employee_email,
      advisor.full_name AS assigned_advisor_name,
      advisor.email AS assigned_advisor_email,
      e.name AS company_name,
      h.name AS team_name,
      p.slug AS partnership_slug,
      ers.score AS readiness_score,
      ers.level AS readiness_level,
      ers.summary AS readiness_summary,
      (SELECT COUNT(*) FROM lead_notes ln WHERE ln.lead_id = lp.id) AS note_count,
      (SELECT COUNT(*) FROM lead_followups lf WHERE lf.lead_id = lp.id AND lf.status = 'pending') AS pending_followup_count
     FROM lead_pipeline lp
     JOIN users employee ON employee.id = lp.employee_user_id
     LEFT JOIN users advisor ON advisor.id = lp.assigned_team_member_user_id
     LEFT JOIN partnerships p ON p.id = lp.partnership_id
     LEFT JOIN employers e ON e.id = p.employer_id
     LEFT JOIN home_buying_teams h ON h.id = p.team_id
     LEFT JOIN employee_readiness_scores ers ON ers.id = lp.readiness_score_id
     ${access.where}
     ORDER BY
      CASE lp.priority WHEN 'hot' THEN 1 WHEN 'warm' THEN 2 ELSE 3 END,
      CASE WHEN lp.follow_up_due_at IS NOT NULL AND lp.follow_up_due_at < NOW() THEN 0 ELSE 1 END,
      lp.follow_up_due_at ASC,
      lp.updated_at DESC`,
    access.params
  );
  return rows.map(normalizeLead);
};

router.get("/", protect, async (req, res) => {
  try {
    if (!isAdmin(req.user) && !isHbt(req.user)) return res.status(403).json({ status: "error", message: "HBT or Admin access required" });
    await ensureAdvancedLeadTables();
    const leads = await getLeadList(req.user);
    return res.json({ status: "success", leads });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load lead pipeline", error: error.message });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    if (!isAdmin(req.user) && !isHbt(req.user)) return res.status(403).json({ status: "error", message: "HBT or Admin access required" });
    await ensureAdvancedLeadTables();
    const access = await canAccessLead(req.params.id, req.user);
    if (!access) return res.status(404).json({ status: "error", message: "Lead not found" });

    const leads = await getLeadList(req.user);
    const lead = leads.find((item) => Number(item.id) === Number(req.params.id));
    const [notes] = await pool.query(
      `SELECT ln.id, ln.note_text, ln.created_at, u.full_name AS author_name
       FROM lead_notes ln
       LEFT JOIN users u ON u.id = ln.author_user_id
       WHERE ln.lead_id = ?
       ORDER BY ln.created_at DESC, ln.id DESC`,
      [req.params.id]
    );
    const [followups] = await pool.query(
      `SELECT id, assigned_to_user_id, due_at, title, status, completed_at, created_at
       FROM lead_followups
       WHERE lead_id = ?
       ORDER BY due_at ASC, id ASC`,
      [req.params.id]
    );
    return res.json({ status: "success", lead, notes, followups });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load lead detail", error: error.message });
  }
});

router.put("/:id/stage", protect, async (req, res) => {
  try {
    const { stage } = req.body;
    if (!allowedStages.includes(stage)) return res.status(400).json({ status: "error", message: "Invalid lead stage" });
    const access = await canAccessLead(req.params.id, req.user);
    if (!access) return res.status(404).json({ status: "error", message: "Lead not found" });

    const status = stage === "closed" || stage === "not_interested" ? stage : "open";
    const lastContacted = stage === "contacted" ? ", last_contacted_at = NOW()" : "";
    await pool.query(
      `UPDATE lead_pipeline SET stage = ?, status = ?, updated_at = CURRENT_TIMESTAMP ${lastContacted} WHERE id = ?`,
      [stage, status, req.params.id]
    );
    return res.json({ status: "success", message: "Lead stage updated" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update lead stage", error: error.message });
  }
});

router.put("/:id/priority", protect, async (req, res) => {
  try {
    const { priority } = req.body;
    if (!allowedPriorities.includes(priority)) return res.status(400).json({ status: "error", message: "Invalid lead priority" });
    const access = await canAccessLead(req.params.id, req.user);
    if (!access) return res.status(404).json({ status: "error", message: "Lead not found" });
    await pool.query(`UPDATE lead_pipeline SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [priority, req.params.id]);
    return res.json({ status: "success", message: "Lead priority updated" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update lead priority", error: error.message });
  }
});

router.post("/:id/notes", protect, async (req, res) => {
  try {
    const noteText = String(req.body.note_text || "").trim();
    if (!noteText) return res.status(400).json({ status: "error", message: "Note text is required" });
    const access = await canAccessLead(req.params.id, req.user);
    if (!access) return res.status(404).json({ status: "error", message: "Lead not found" });
    await pool.query(`INSERT INTO lead_notes (lead_id, author_user_id, note_text) VALUES (?, ?, ?)`, [req.params.id, req.user.id, noteText]);
    return res.status(201).json({ status: "success", message: "Lead note added" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to add lead note", error: error.message });
  }
});

router.post("/:id/followup", protect, async (req, res) => {
  try {
    const { due_at, title } = req.body;
    if (!due_at) return res.status(400).json({ status: "error", message: "Follow-up due date is required" });
    const access = await canAccessLead(req.params.id, req.user);
    if (!access) return res.status(404).json({ status: "error", message: "Lead not found" });
    await pool.query(
      `INSERT INTO lead_followups (lead_id, assigned_to_user_id, due_at, title, status) VALUES (?, ?, ?, ?, 'pending')`,
      [req.params.id, req.user.id, due_at, title || "Follow up with employee"]
    );
    await pool.query(`UPDATE lead_pipeline SET follow_up_due_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [due_at, req.params.id]);
    return res.status(201).json({ status: "success", message: "Lead follow-up scheduled" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to schedule lead follow-up", error: error.message });
  }
});

module.exports = router;
