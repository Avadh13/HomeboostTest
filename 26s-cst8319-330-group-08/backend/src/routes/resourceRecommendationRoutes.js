const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const isAdmin = (user) => adminRoles.includes(user?.role);
const isHbtAdmin = (user) => user?.role === "hbt_admin";
const isHbtMember = (user) => user?.role === "hbt_member";
const isHbt = (user) => isHbtAdmin(user) || isHbtMember(user);

const ensureRecommendationTables = async (connection = pool) => {
  await connection.query(`CREATE TABLE IF NOT EXISTS employee_readiness_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    partnership_id INT NULL,
    quiz_id INT NULL,
    latest_submission_id INT NULL,
    score INT NOT NULL DEFAULT 0,
    level VARCHAR(60) NOT NULL DEFAULT 'Needs Preparation',
    priority VARCHAR(20) NOT NULL DEFAULT 'warm',
    summary TEXT NULL,
    risk_factors JSON NULL,
    recommendations JSON NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_employee_readiness_user (user_id),
    INDEX idx_employee_readiness_partnership (partnership_id),
    INDEX idx_employee_readiness_submission (latest_submission_id),
    INDEX idx_employee_readiness_level (level),
    INDEX idx_employee_readiness_priority (priority)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS employee_activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    partnership_id INT NULL,
    activity_type VARCHAR(80) NOT NULL,
    activity_label VARCHAR(255) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_partnership (partnership_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_activity_created (created_at)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS resource_recommendation_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT NOT NULL,
    team_id INT NULL,
    readiness_level VARCHAR(60) NULL,
    priority VARCHAR(20) NULL,
    keyword VARCHAR(120) NULL,
    rule_label VARCHAR(255) NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_resource_rule_resource (resource_id),
    INDEX idx_resource_rule_team (team_id),
    INDEX idx_resource_rule_level (readiness_level),
    INDEX idx_resource_rule_priority (priority),
    INDEX idx_resource_rule_keyword (keyword)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS resource_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT NOT NULL,
    user_id INT NOT NULL,
    partnership_id INT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_resource_views_resource (resource_id),
    INDEX idx_resource_views_user (user_id),
    INDEX idx_resource_views_partnership (partnership_id),
    INDEX idx_resource_views_viewed_at (viewed_at)
  )`);
};

const parseJson = (value, fallback = []) => {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
};

const lower = (value = "") => String(value || "").toLowerCase();

const getEmployeeScope = async (user) => {
  if (!user?.partnership_id) return { partnershipId: null, teamId: user?.team_id || null };
  const [[partnership]] = await pool.query(
    "SELECT id, team_id FROM partnerships WHERE id = ? AND status = 'active' LIMIT 1",
    [user.partnership_id],
  );
  return { partnershipId: partnership?.id || null, teamId: partnership?.team_id || null };
};

const accessibleResourceSql = `
  SELECT DISTINCT r.*
  FROM resources r
  LEFT JOIN resource_partnerships rp ON rp.resource_id = r.id
  WHERE r.is_active = 1
    AND (
      r.is_global = 1
      OR (
        r.team_id = ?
        AND (
          NOT EXISTS (SELECT 1 FROM resource_partnerships rpx WHERE rpx.resource_id = r.id)
          OR EXISTS (SELECT 1 FROM resource_partnerships rpe WHERE rpe.resource_id = r.id AND rpe.partnership_id = ?)
        )
      )
    )
`;

const scoreResource = (resource, readiness, rules) => {
  const searchText = [resource.title, resource.description, resource.category, resource.resource_type].map(lower).join(" ");
  const riskText = [readiness?.summary, ...(readiness?.risk_factors || [])].map(lower).join(" ");
  let score = 0;
  const reasons = [];

  const matchingRules = rules.filter((rule) => Number(rule.resource_id) === Number(resource.id));
  for (const rule of matchingRules) {
    const levelMatch = !rule.readiness_level || lower(rule.readiness_level) === lower(readiness?.level);
    const priorityMatch = !rule.priority || lower(rule.priority) === lower(readiness?.priority);
    const keyword = lower(rule.keyword);
    const keywordMatch = !keyword || riskText.includes(keyword) || searchText.includes(keyword);

    if (levelMatch && priorityMatch && keywordMatch) {
      score += 35;
      reasons.push(rule.rule_label || "Matched your readiness profile");
    }
  }

  if (readiness?.level && searchText.includes(lower(readiness.level))) {
    score += 12;
    reasons.push(`Matches ${readiness.level} readiness`);
  }

  const priority = lower(readiness?.priority);
  if (priority === "hot" && /pre.?approval|checklist|buyer|buying/.test(searchText)) {
    score += 18;
    reasons.push("Useful for active buyers");
  }
  if (priority === "warm" && /prepare|planning|saving|budget|credit/.test(searchText)) {
    score += 18;
    reasons.push("Helps close preparation gaps");
  }
  if (priority === "cold" && /credit|saving|budget|first.?time|guide/.test(searchText)) {
    score += 18;
    reasons.push("Good starting point");
  }
  if (riskText.includes("credit") && /credit|score|debt/.test(searchText)) {
    score += 20;
    reasons.push("Based on credit readiness signals");
  }
  if (riskText.includes("down payment") && /down.?payment|saving|closing|cost/.test(searchText)) {
    score += 20;
    reasons.push("Based on savings/down-payment signals");
  }
  if (riskText.includes("employment") && /income|document|employment|pay/.test(searchText)) {
    score += 20;
    reasons.push("Based on income documentation needs");
  }

  return { ...resource, recommendation_score: score, recommendation_reason: reasons[0] || "Recommended HomeBoost resource" };
};

const requireRuleViewer = (req, res) => {
  if (!isAdmin(req.user) && !isHbt(req.user)) {
    res.status(403).json({ status: "error", message: "Admin or HBT access required" });
    return false;
  }
  if (isHbt(req.user) && !req.user.team_id) {
    res.status(403).json({ status: "error", message: "HBT account is not linked to a team" });
    return false;
  }
  return true;
};

const requireRuleManager = (req, res) => {
  if (!isAdmin(req.user) && !isHbtAdmin(req.user)) {
    res.status(403).json({ status: "error", message: "Admin or HBT Admin access required" });
    return false;
  }
  if (isHbtAdmin(req.user) && !req.user.team_id) {
    res.status(403).json({ status: "error", message: "HBT Admin account is not linked to a team" });
    return false;
  }
  return true;
};

const resolveRuleTeamId = async (user, requestedTeamId, connection = pool) => {
  if (isHbtAdmin(user)) return Number(user.team_id);
  if (!requestedTeamId) return null;
  const teamId = Number(requestedTeamId);
  if (!teamId) return undefined;
  const [[team]] = await connection.query(
    "SELECT id FROM home_buying_teams WHERE id = ? AND is_active = 1 LIMIT 1",
    [teamId],
  );
  return team ? teamId : undefined;
};

const canUseResourceForRule = async (user, resourceId, connection = pool) => {
  const id = Number(resourceId);
  if (!id) return false;
  if (isAdmin(user)) {
    const [[resource]] = await connection.query("SELECT id FROM resources WHERE id = ? AND is_active = 1 LIMIT 1", [id]);
    return Boolean(resource);
  }
  const [[resource]] = await connection.query(
    `SELECT id FROM resources
     WHERE id = ? AND is_active = 1 AND (is_global = 1 OR team_id = ?)
     LIMIT 1`,
    [id, user.team_id],
  );
  return Boolean(resource);
};

router.get("/me", protect, async (req, res) => {
  try {
    if (req.user.role !== "employee") return res.status(403).json({ status: "error", message: "Employee access required" });
    await ensureRecommendationTables();

    const { partnershipId, teamId } = await getEmployeeScope(req.user);
    const [[readinessRow]] = await pool.query(
      `SELECT score, level, priority, summary, risk_factors, recommendations
       FROM employee_readiness_scores
       WHERE user_id = ?
       LIMIT 1`,
      [req.user.id],
    );

    const readiness = readinessRow
      ? { ...readinessRow, risk_factors: parseJson(readinessRow.risk_factors, []), recommendations: parseJson(readinessRow.recommendations, []) }
      : null;

    const [resources] = await pool.query(
      `${accessibleResourceSql} ORDER BY r.display_order ASC, r.id DESC`,
      [teamId, partnershipId],
    );

    const [rules] = await pool.query(
      `SELECT * FROM resource_recommendation_rules
       WHERE is_active = 1 AND (team_id IS NULL OR team_id = ?)`,
      [teamId],
    );

    const scored = resources
      .map((resource) => scoreResource(resource, readiness, rules))
      .sort((a, b) => b.recommendation_score - a.recommendation_score || Number(a.display_order || 0) - Number(b.display_order || 0));

    const recommended = scored.filter((resource) => Number(resource.recommendation_score || 0) > 0).slice(0, 6);
    return res.json({ status: "success", readiness, resources: recommended.length ? recommended : scored.slice(0, 6) });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load recommended resources" });
  }
});

router.post("/:resourceId/view", protect, async (req, res) => {
  try {
    if (req.user.role !== "employee") return res.status(403).json({ status: "error", message: "Employee access required" });
    await ensureRecommendationTables();
    const resourceId = Number(req.params.resourceId);
    if (!resourceId) return res.status(400).json({ status: "error", message: "Valid resource ID is required" });

    const { partnershipId, teamId } = await getEmployeeScope(req.user);
    const [[accessible]] = await pool.query(
      `${accessibleResourceSql} AND r.id = ? LIMIT 1`,
      [teamId, partnershipId, resourceId],
    );
    if (!accessible) return res.status(404).json({ status: "error", message: "Resource not found" });

    await pool.query(
      "INSERT INTO resource_views (resource_id, user_id, partnership_id) VALUES (?, ?, ?)",
      [resourceId, req.user.id, partnershipId],
    );
    await pool.query(
      `INSERT INTO employee_activity_logs (user_id, partnership_id, activity_type, activity_label, metadata)
       VALUES (?, ?, 'resource_view', 'Resource viewed', ?)`,
      [req.user.id, partnershipId, JSON.stringify({ resource_id: resourceId })],
    );

    return res.json({ status: "success", message: "Resource view recorded" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to record resource view" });
  }
});

router.get("/admin/rules", protect, async (req, res) => {
  try {
    if (!requireRuleViewer(req, res)) return;
    await ensureRecommendationTables();

    const params = [];
    const scope = isAdmin(req.user) ? "" : "WHERE rr.team_id IS NULL OR rr.team_id = ?";
    if (!isAdmin(req.user)) params.push(req.user.team_id);

    const [rules] = await pool.query(
      `SELECT rr.*, r.title AS resource_title, h.name AS team_name
       FROM resource_recommendation_rules rr
       JOIN resources r ON r.id = rr.resource_id
       LEFT JOIN home_buying_teams h ON h.id = rr.team_id
       ${scope}
       ORDER BY rr.id DESC`,
      params,
    );
    return res.json({ status: "success", rules });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load recommendation rules" });
  }
});

router.post("/admin/rules", protect, async (req, res) => {
  try {
    if (!requireRuleManager(req, res)) return;
    await ensureRecommendationTables();
    const { resource_id, readiness_level, priority, keyword, rule_label, is_active } = req.body;
    if (!(await canUseResourceForRule(req.user, resource_id))) {
      return res.status(404).json({ status: "error", message: "Resource not found for this rule scope" });
    }

    const teamId = await resolveRuleTeamId(req.user, req.body.team_id);
    if (teamId === undefined) return res.status(400).json({ status: "error", message: "Invalid rule team" });

    const [result] = await pool.query(
      `INSERT INTO resource_recommendation_rules
       (resource_id, team_id, readiness_level, priority, keyword, rule_label, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [resource_id, teamId, readiness_level || null, priority || null, keyword || null, rule_label || null, is_active ?? 1],
    );
    return res.status(201).json({ status: "success", message: "Recommendation rule created", rule_id: result.insertId, team_id: teamId });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to create recommendation rule" });
  }
});

router.put("/admin/rules/:id", protect, async (req, res) => {
  try {
    if (!requireRuleManager(req, res)) return;
    await ensureRecommendationTables();

    const ruleId = Number(req.params.id);
    if (!ruleId) return res.status(400).json({ status: "error", message: "Valid rule ID is required" });

    const params = [ruleId];
    let ownerClause = "";
    if (isHbtAdmin(req.user)) {
      ownerClause = " AND team_id = ?";
      params.push(req.user.team_id);
    }
    const [[existing]] = await pool.query(
      `SELECT id, team_id FROM resource_recommendation_rules WHERE id = ?${ownerClause} LIMIT 1`,
      params,
    );
    if (!existing) return res.status(404).json({ status: "error", message: "Recommendation rule not found" });

    if (!(await canUseResourceForRule(req.user, req.body.resource_id))) {
      return res.status(404).json({ status: "error", message: "Resource not found for this rule scope" });
    }

    const teamId = isHbtAdmin(req.user)
      ? Number(req.user.team_id)
      : await resolveRuleTeamId(req.user, req.body.team_id);
    if (teamId === undefined) return res.status(400).json({ status: "error", message: "Invalid rule team" });

    const [result] = await pool.query(
      `UPDATE resource_recommendation_rules
       SET resource_id = ?, team_id = ?, readiness_level = ?, priority = ?, keyword = ?, rule_label = ?, is_active = ?
       WHERE id = ?`,
      [req.body.resource_id, teamId, req.body.readiness_level || null, req.body.priority || null, req.body.keyword || null, req.body.rule_label || null, req.body.is_active ?? 1, ruleId],
    );
    if (Number(result.affectedRows || 0) !== 1) return res.status(404).json({ status: "error", message: "Recommendation rule not found" });
    return res.json({ status: "success", message: "Recommendation rule updated", team_id: teamId });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update recommendation rule" });
  }
});

router.delete("/admin/rules/:id", protect, async (req, res) => {
  try {
    if (!requireRuleManager(req, res)) return;
    await ensureRecommendationTables();

    const ruleId = Number(req.params.id);
    if (!ruleId) return res.status(400).json({ status: "error", message: "Valid rule ID is required" });

    const params = [ruleId];
    let ownerClause = "";
    if (isHbtAdmin(req.user)) {
      ownerClause = " AND team_id = ?";
      params.push(req.user.team_id);
    }
    const [result] = await pool.query(
      `DELETE FROM resource_recommendation_rules WHERE id = ?${ownerClause}`,
      params,
    );
    if (Number(result.affectedRows || 0) !== 1) return res.status(404).json({ status: "error", message: "Recommendation rule not found" });
    return res.json({ status: "success", message: "Recommendation rule deleted" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to delete recommendation rule" });
  }
});

module.exports = router;
module.exports.ensureRecommendationTables = ensureRecommendationTables;
