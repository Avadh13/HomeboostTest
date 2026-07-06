const pool = require("../config/db");

const isAdmin = (user) => user && ["admin", "super_admin"].includes(user.role);
const isHbt = (user) => user && ["hbt_admin", "hbt_member"].includes(user.role);

const ensureResourceLibraryTables = async (connection = pool) => {
  await connection.query(`CREATE TABLE IF NOT EXISTS resource_bookmarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    resource_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_resource_bookmark (user_id, resource_id),
    INDEX idx_resource_bookmarks_user (user_id),
    INDEX idx_resource_bookmarks_resource (resource_id)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS resource_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(140) NOT NULL,
    description TEXT NULL,
    is_active TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_resource_categories_slug (slug),
    INDEX idx_resource_categories_active (is_active)
  )`);
};

const getUserScope = async (user) => {
  if (!user) return { teamId: null, partnershipId: null };
  if (user.team_id || !user.partnership_id) return { teamId: user.team_id || null, partnershipId: user.partnership_id || null };
  const [rows] = await pool.query("SELECT team_id FROM partnerships WHERE id = ? LIMIT 1", [user.partnership_id]);
  return { teamId: rows[0]?.team_id || null, partnershipId: user.partnership_id || null };
};

const validatePartnershipsForTeam = async (teamId, partnershipIds = []) => {
  if (!Array.isArray(partnershipIds) || partnershipIds.length === 0) return [];
  const cleanIds = [...new Set(partnershipIds.map(Number).filter(Boolean))];
  if (cleanIds.length === 0) return [];
  const placeholders = cleanIds.map(() => "?").join(",");
  const [rows] = await pool.query(`SELECT id FROM partnerships WHERE team_id = ? AND id IN (${placeholders})`, [teamId, ...cleanIds]);
  return rows.map((row) => row.id);
};

const saveResourceAssignments = async (resourceId, partnershipIds = []) => {
  await pool.query("DELETE FROM resource_partnerships WHERE resource_id = ?", [resourceId]);
  if (!Array.isArray(partnershipIds) || partnershipIds.length === 0) return;
  for (const partnershipId of partnershipIds) {
    await pool.query("INSERT IGNORE INTO resource_partnerships (resource_id, partnership_id) VALUES (?, ?)", [resourceId, partnershipId]);
  }
};

const baseResourceSelect = `
  SELECT
    r.*,
    COUNT(rp.partnership_id) AS assigned_partnership_count,
    GROUP_CONCAT(rp.partnership_id ORDER BY rp.partnership_id) AS assigned_partnership_ids,
    GROUP_CONCAT(e.name ORDER BY e.name SEPARATOR ', ') AS assigned_partnership_names
  FROM resources r
  LEFT JOIN resource_partnerships rp ON r.id = rp.resource_id
  LEFT JOIN partnerships p_assigned ON rp.partnership_id = p_assigned.id
  LEFT JOIN employers e ON p_assigned.employer_id = e.id
`;

const decorateResources = async (resources, user) => {
  if (!Array.isArray(resources) || resources.length === 0 || user?.role !== "employee") return resources;
  await ensureResourceLibraryTables();
  const resourceIds = resources.map((resource) => resource.id);
  const placeholders = resourceIds.map(() => "?").join(",");

  const [bookmarks] = await pool.query(
    `SELECT resource_id FROM resource_bookmarks WHERE user_id = ? AND resource_id IN (${placeholders})`,
    [user.id, ...resourceIds]
  );
  const bookmarkSet = new Set(bookmarks.map((row) => Number(row.resource_id)));

  const [journeyRows] = await pool.query(
    `SELECT DISTINCT jsr.resource_id
     FROM employee_journey_assignments eja
     JOIN journey_steps js ON js.journey_id = eja.journey_id AND js.is_active = 1
     JOIN journey_step_resources jsr ON jsr.journey_step_id = js.id
     WHERE eja.user_id = ? AND eja.status = 'active' AND jsr.resource_id IN (${placeholders})`,
    [user.id, ...resourceIds]
  );
  const journeySet = new Set(journeyRows.map((row) => Number(row.resource_id)));

  return resources.map((resource) => ({
    ...resource,
    is_bookmarked: bookmarkSet.has(Number(resource.id)),
    in_journey: journeySet.has(Number(resource.id)),
  }));
};

exports.getResources = async (req, res) => {
  try {
    const user = req.user;
    const { teamId, partnershipId } = await getUserScope(user);
    let whereClause = "WHERE r.is_active = 1";
    const params = [];

    if (isAdmin(user)) {
      // Admin can view all active resources.
    } else if (isHbt(user)) {
      whereClause += " AND (r.is_global = 1 OR r.team_id = ?)";
      params.push(teamId);
    } else if (user?.role === "employee") {
      whereClause += `
        AND (
          r.is_global = 1
          OR (
            r.team_id = ?
            AND (
              NOT EXISTS (SELECT 1 FROM resource_partnerships rpx WHERE rpx.resource_id = r.id)
              OR EXISTS (SELECT 1 FROM resource_partnerships rpe WHERE rpe.resource_id = r.id AND rpe.partnership_id = ?)
            )
          )
        )`;
      params.push(teamId, partnershipId);
    } else {
      whereClause += " AND r.is_global = 1";
    }

    const [resources] = await pool.query(`${baseResourceSelect} ${whereClause} GROUP BY r.id ORDER BY r.display_order ASC, r.id DESC`, params);
    res.json(await decorateResources(resources, user));
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to load resources", error: error.message });
  }
};

exports.createResource = async (req, res) => {
  try {
    const user = req.user;
    if (!isAdmin(user) && !isHbt(user)) return res.status(403).json({ status: "error", message: "Admin or HBT access required" });
    const { title, description, category, resource_type, resource_url, image_url, display_order, is_active, partnership_ids } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ status: "error", message: "Resource title is required" });
    const teamId = isHbt(user) ? user.team_id : req.body.team_id || null;
    const isGlobal = isAdmin(user) && !teamId ? 1 : 0;
    const selectedPartnershipIds = isHbt(user) ? await validatePartnershipsForTeam(teamId, partnership_ids) : Array.isArray(partnership_ids) ? partnership_ids.map(Number).filter(Boolean) : [];
    const [result] = await pool.query(
      `INSERT INTO resources (title, description, category, resource_type, resource_url, image_url, display_order, is_active, team_id, is_global) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title.trim(), description || null, category || null, resource_type || "article", resource_url || null, image_url || null, display_order || 0, is_active ?? 1, teamId, isGlobal]
    );
    await saveResourceAssignments(result.insertId, selectedPartnershipIds);
    res.status(201).json({ status: "success", message: "Resource created successfully", resource_id: result.insertId });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to create resource", error: error.message });
  }
};

exports.updateResource = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    if (!isAdmin(user) && !isHbt(user)) return res.status(403).json({ status: "error", message: "Admin or HBT access required" });
    const [existing] = await pool.query("SELECT id, team_id, is_global FROM resources WHERE id = ? LIMIT 1", [id]);
    if (existing.length === 0) return res.status(404).json({ status: "error", message: "Resource not found" });
    if (isHbt(user) && Number(existing[0].team_id) !== Number(user.team_id)) return res.status(403).json({ status: "error", message: "You can only update resources owned by your HBT team" });
    const { title, description, category, resource_type, resource_url, image_url, display_order, is_active, partnership_ids } = req.body;
    const selectedPartnershipIds = isHbt(user) ? await validatePartnershipsForTeam(user.team_id, partnership_ids) : Array.isArray(partnership_ids) ? partnership_ids.map(Number).filter(Boolean) : [];
    await pool.query(
      `UPDATE resources SET title = ?, description = ?, category = ?, resource_type = ?, resource_url = ?, image_url = ?, display_order = ?, is_active = ? WHERE id = ?`,
      [title, description || null, category || null, resource_type || "article", resource_url || null, image_url || null, display_order || 0, is_active ?? 1, id]
    );
    await saveResourceAssignments(id, selectedPartnershipIds);
    res.json({ status: "success", message: "Resource updated successfully" });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to update resource", error: error.message });
  }
};

exports.deleteResource = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    if (!isAdmin(user) && !isHbt(user)) return res.status(403).json({ status: "error", message: "Admin or HBT access required" });
    const [existing] = await pool.query("SELECT id, team_id FROM resources WHERE id = ? LIMIT 1", [id]);
    if (existing.length === 0) return res.status(404).json({ status: "error", message: "Resource not found" });
    if (isHbt(user) && Number(existing[0].team_id) !== Number(user.team_id)) return res.status(403).json({ status: "error", message: "You can only delete resources owned by your HBT team" });
    await pool.query("UPDATE resources SET is_active = 0 WHERE id = ?", [id]);
    res.json({ status: "success", message: "Resource deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to delete resource", error: error.message });
  }
};

exports.getResourceById = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { teamId, partnershipId } = await getUserScope(user);
    let whereClause = "WHERE r.id = ? AND r.is_active = 1";
    const params = [id];
    if (isAdmin(user)) {
      // Admin can view any active resource.
    } else if (isHbt(user)) {
      whereClause += " AND (r.is_global = 1 OR r.team_id = ?)";
      params.push(teamId);
    } else if (user?.role === "employee") {
      whereClause += `
        AND (
          r.is_global = 1
          OR (
            r.team_id = ?
            AND (
              NOT EXISTS (SELECT 1 FROM resource_partnerships rpx WHERE rpx.resource_id = r.id)
              OR EXISTS (SELECT 1 FROM resource_partnerships rpe WHERE rpe.resource_id = r.id AND rpe.partnership_id = ?)
            )
          )
        )`;
      params.push(teamId, partnershipId);
    } else {
      whereClause += " AND r.is_global = 1";
    }
    const [resources] = await pool.query(`${baseResourceSelect} ${whereClause} GROUP BY r.id LIMIT 1`, params);
    if (resources.length === 0) return res.status(404).json({ status: "error", message: "Resource not found" });
    const decorated = await decorateResources(resources, user);
    res.json(decorated[0]);
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to load resource", error: error.message });
  }
};

exports.getResourceCategories = async (req, res) => {
  try {
    await ensureResourceLibraryTables();
    const [categories] = await pool.query("SELECT * FROM resource_categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC");
    res.json({ status: "success", categories });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to load resource categories", error: error.message });
  }
};

exports.bookmarkResource = async (req, res) => {
  try {
    if (req.user?.role !== "employee") return res.status(403).json({ status: "error", message: "Employee access required" });
    await ensureResourceLibraryTables();
    await pool.query("INSERT IGNORE INTO resource_bookmarks (user_id, resource_id) VALUES (?, ?)", [req.user.id, req.params.id]);
    res.json({ status: "success", message: "Resource saved" });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to save resource", error: error.message });
  }
};

exports.unbookmarkResource = async (req, res) => {
  try {
    if (req.user?.role !== "employee") return res.status(403).json({ status: "error", message: "Employee access required" });
    await ensureResourceLibraryTables();
    await pool.query("DELETE FROM resource_bookmarks WHERE user_id = ? AND resource_id = ?", [req.user.id, req.params.id]);
    res.json({ status: "success", message: "Resource removed from saved list" });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to remove saved resource", error: error.message });
  }
};

module.exports.ensureResourceLibraryTables = ensureResourceLibraryTables;
