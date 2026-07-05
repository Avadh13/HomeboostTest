const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const hbtRoles = ["hbt_admin", "hbt_member"];
const isAdmin = (user) => adminRoles.includes(user?.role);
const isHbt = (user) => hbtRoles.includes(user?.role);

const ensureRecommendationTables = async (connection = pool) => {
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

  await connection.query(`CREATE TABLE IF NOT EXISTS resource_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS resource_recommendation_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT NOT NULL,
    readiness_level VARCHAR(60) NULL,
    priority VARCHAR(20) NULL,
    keyword VARCHAR(120) NULL,
    rule_label VARCHAR(255) NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_resource_rule_resource (resource_id),
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
  const [[partnership]] = await pool.query("SELECT id, team_id FROM partnerships WHERE id = ? LIMIT 1", [user.partnership_id]);
  return { partnershipId: user.partnership_id, teamId: partnership?.team_id || user.team_id || null };
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
  if (priority === "hot" && /pre.?approval|checklist|appointment|buyer|buying/.test(searchText)) {
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
      [req.user.id]
    );

    const readiness = readinessRow
      ? { ...readinessRow, risk_factors: parseJson(readinessRow.risk_factors, []), recommendations: parseJson(readinessRow.recommendations, []) }
      : null;

    const [resources] = await pool.query(
      `${accessibleResourceSql} ORDER BY r.display_order ASC, r.id DESC`,
      [teamId, partnershipId]
    );

    const [rules] = await pool.query("SELECT * FROM resource_recommendation_rules WHERE is_active = 1");

    const scored = resources
      .map((resource) => scoreResource(resource, readiness, rules))
      .sort((a, b) => b.recommendation_score - a.recommendation_score || Number(a.display_order || 0) - Number(b.display_order || 0));

    const recommended = scored.filter((resource) => Number(resource.recommendation_score || 0) > 0).slice(0, 6);
    const fallback = scored.slice(0, 6);

    return res.json({
      status: "success",
      readiness,
      resources: recommended.length ? recommended : fallback,
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load recommended resources", error: error.message });
  }
});

router.post("/:resourceId/view", protect, async (req, res) => {
  try {
    if (req.user.role !== "employee") return res.status(403).json({ status: "error", message: "Employee access required" });
    await ensureRecommendationTables();
    const resourceId = Number(req.params.resourceId);
    if (!resourceId) return res.status(400).json({ status: "error", message: "Valid resource ID is required" });

    await pool.query(
      "INSERT INTO resource_views (resource_id, user_id, partnership_id) VALUES (?, ?, ?)",
      [resourceId, req.user.id, req.user.partnership_id || null]
    );
    await pool.query(
      `INSERT INTO employee_activity_logs (user_id, partnership_id, activity_type, activity_label, metadata)
       VALUES (?, ?, 'resource_view', 'Resource viewed', ?)`,
      [req.user.id, req.user.partnership_id || null, JSON.stringify({ resource_id: resourceId })]
    );

    return res.json({ status: "success", message: "Resource view tracked" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to track resource view", error: error.message });
  }
});

router.get("/admin/rules", protect, async (req, res) => {
  try {
    if (!isAdmin(req.user) && !isHbt(req.user)) return res.status(403).json({ status: "error", message: "Admin or HBT access required" });
    await ensureRecommendationTables();
    const [rules] = await pool.query(
      `SELECT rr.*, r.title AS resource_title
       FROM resource_recommendation_rules rr
       JOIN resources r ON r.id = rr.resource_id
       ORDER BY rr.id DESC`
    );
    return res.json({ status: "success", rules });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load recommendation rules", error: error.message });
  }
});

router.post("/admin/rules", protect, async (req, res) => {
  try {
    if (!isAdmin(req.user) && !isHbt(req.user)) return res.status(403).json({ status: "error", message: "Admin or HBT access required" });
    await ensureRecommendationTables();
    const { resource_id, readiness_level, priority, keyword, rule_label, is_active } = req.body;
    if (!resource_id) return res.status(400).json({ status: "error", message: "resource_id is required" });
    await pool.query(
      `INSERT INTO resource_recommendation_rules (resource_id, readiness_level, priority, keyword, rule_label, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [resource_id, readiness_level || null, priority || null, keyword || null, rule_label || null, is_active ?? 1]
    );
    return res.status(201).json({ status: "success", message: "Recommendation rule created" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to create recommendation rule", error: error.message });
  }
});

router.put("/admin/rules/:id", protect, async (req, res) => {
  try {
    if (!isAdmin(req.user) && !isHbt(req.user)) return res.status(403).json({ status: "error", message: "Admin or HBT access required" });
    const { resource_id, readiness_level, priority, keyword, rule_label, is_active } = req.body;
    await pool.query(
      `UPDATE resource_recommendation_rules
       SET resource_id = ?, readiness_level = ?, priority = ?, keyword = ?, rule_label = ?, is_active = ?
       WHERE id = ?`,
      [resource_id, readiness_level || null, priority || null, keyword || null, rule_label || null, is_active ?? 1, req.params.id]
    );
    return res.json({ status: "success", message: "Recommendation rule updated" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update recommendation rule", error: error.message });
  }
});

router.delete("/admin/rules/:id", protect, async (req, res) => {
  try {
    if (!isAdmin(req.user) && !isHbt(req.user)) return res.status(403).json({ status: "error", message: "Admin or HBT access required" });
    await pool.query("DELETE FROM resource_recommendation_rules WHERE id = ?", [req.params.id]);
    return res.json({ status: "success", message: "Recommendation rule deleted" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to delete recommendation rule", error: error.message });
  }
});

module.exports = router;
module.exports.ensureRecommendationTables = ensureRecommendationTables;
