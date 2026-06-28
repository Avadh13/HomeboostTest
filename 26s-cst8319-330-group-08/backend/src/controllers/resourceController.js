const pool = require("../config/db");

const isAdmin = (user) => user && ["admin", "super_admin"].includes(user.role);
const isHbt = (user) => user && ["hbt_admin", "hbt_member"].includes(user.role);

const getUserScope = async (user) => {
  if (!user) return { teamId: null, partnershipId: null };

  if (user.team_id || !user.partnership_id) {
    return { teamId: user.team_id || null, partnershipId: user.partnership_id || null };
  }

  const [rows] = await pool.query("SELECT team_id FROM partnerships WHERE id = ? LIMIT 1", [user.partnership_id]);
  return { teamId: rows[0]?.team_id || null, partnershipId: user.partnership_id || null };
};

const validatePartnershipsForTeam = async (teamId, partnershipIds = []) => {
  if (!Array.isArray(partnershipIds) || partnershipIds.length === 0) return [];

  const cleanIds = [...new Set(partnershipIds.map(Number).filter(Boolean))];
  if (cleanIds.length === 0) return [];

  const placeholders = cleanIds.map(() => "?").join(",");
  const [rows] = await pool.query(
    `SELECT id FROM partnerships WHERE team_id = ? AND id IN (${placeholders})`,
    [teamId, ...cleanIds]
  );

  return rows.map((row) => row.id);
};

const saveResourceAssignments = async (resourceId, partnershipIds = []) => {
  await pool.query("DELETE FROM resource_partnerships WHERE resource_id = ?", [resourceId]);

  if (!Array.isArray(partnershipIds) || partnershipIds.length === 0) return;

  for (const partnershipId of partnershipIds) {
    await pool.query(
      "INSERT IGNORE INTO resource_partnerships (resource_id, partnership_id) VALUES (?, ?)",
      [resourceId, partnershipId]
    );
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
              OR EXISTS (
                SELECT 1 FROM resource_partnerships rpe
                WHERE rpe.resource_id = r.id AND rpe.partnership_id = ?
              )
            )
          )
        )`;
      params.push(teamId, partnershipId);
    } else {
      whereClause += " AND r.is_global = 1";
    }

    const [resources] = await pool.query(
      `${baseResourceSelect}
       ${whereClause}
       GROUP BY r.id
       ORDER BY r.display_order ASC, r.id DESC`,
      params
    );

    res.json(resources);
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to load resources", error: error.message });
  }
};

exports.createResource = async (req, res) => {
  try {
    const user = req.user;

    if (!isAdmin(user) && !isHbt(user)) {
      return res.status(403).json({ status: "error", message: "Admin or HBT access required" });
    }

    const {
      title,
      description,
      category,
      resource_type,
      resource_url,
      image_url,
      display_order,
      is_active,
      partnership_ids,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ status: "error", message: "Resource title is required" });
    }

    const teamId = isHbt(user) ? user.team_id : req.body.team_id || null;
    const isGlobal = isAdmin(user) && !teamId ? 1 : 0;
    const selectedPartnershipIds = isHbt(user)
      ? await validatePartnershipsForTeam(teamId, partnership_ids)
      : Array.isArray(partnership_ids) ? partnership_ids.map(Number).filter(Boolean) : [];

    const [result] = await pool.query(
      `INSERT INTO resources
       (title, description, category, resource_type, resource_url, image_url, display_order, is_active, team_id, is_global)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        description || null,
        category || null,
        resource_type || "article",
        resource_url || null,
        image_url || null,
        display_order || 0,
        is_active ?? 1,
        teamId,
        isGlobal,
      ]
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

    if (!isAdmin(user) && !isHbt(user)) {
      return res.status(403).json({ status: "error", message: "Admin or HBT access required" });
    }

    const [existing] = await pool.query("SELECT id, team_id, is_global FROM resources WHERE id = ? LIMIT 1", [id]);

    if (existing.length === 0) {
      return res.status(404).json({ status: "error", message: "Resource not found" });
    }

    if (isHbt(user) && Number(existing[0].team_id) !== Number(user.team_id)) {
      return res.status(403).json({ status: "error", message: "You can only update resources owned by your HBT team" });
    }

    const {
      title,
      description,
      category,
      resource_type,
      resource_url,
      image_url,
      display_order,
      is_active,
      partnership_ids,
    } = req.body;

    const selectedPartnershipIds = isHbt(user)
      ? await validatePartnershipsForTeam(user.team_id, partnership_ids)
      : Array.isArray(partnership_ids) ? partnership_ids.map(Number).filter(Boolean) : [];

    await pool.query(
      `UPDATE resources
       SET title = ?, description = ?, category = ?, resource_type = ?, resource_url = ?, image_url = ?, display_order = ?, is_active = ?
       WHERE id = ?`,
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

    if (!isAdmin(user) && !isHbt(user)) {
      return res.status(403).json({ status: "error", message: "Admin or HBT access required" });
    }

    const [existing] = await pool.query("SELECT id, team_id FROM resources WHERE id = ? LIMIT 1", [id]);

    if (existing.length === 0) {
      return res.status(404).json({ status: "error", message: "Resource not found" });
    }

    if (isHbt(user) && Number(existing[0].team_id) !== Number(user.team_id)) {
      return res.status(403).json({ status: "error", message: "You can only delete resources owned by your HBT team" });
    }

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
              OR EXISTS (
                SELECT 1 FROM resource_partnerships rpe
                WHERE rpe.resource_id = r.id AND rpe.partnership_id = ?
              )
            )
          )
        )`;
      params.push(teamId, partnershipId);
    } else {
      whereClause += " AND r.is_global = 1";
    }

    const [resources] = await pool.query(
      `${baseResourceSelect}
       ${whereClause}
       GROUP BY r.id
       LIMIT 1`,
      params
    );

    if (resources.length === 0) return res.status(404).json({ status: "error", message: "Resource not found" });
    res.json(resources[0]);
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to load resource", error: error.message });
  }
};
