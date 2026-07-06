const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const hbtRoles = ["hbt_admin", "hbt_member"];
const canManage = (user) => adminRoles.includes(user?.role) || user?.role === "hbt_admin";
const canViewJourney = (user) => adminRoles.includes(user?.role) || hbtRoles.includes(user?.role) || user?.role === "employee";
const clean = (value, max = 255) => String(value || "").trim().slice(0, max);

const ensureJourneyTables = async (connection = pool) => {
  await connection.query(`CREATE TABLE IF NOT EXISTS journeys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    journey_type VARCHAR(80) DEFAULT 'home_buying',
    is_default TINYINT(1) DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_journeys_team (team_id),
    INDEX idx_journeys_active (is_active),
    INDEX idx_journeys_default (is_default)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS journey_steps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    journey_id INT NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    step_type VARCHAR(60) DEFAULT 'task',
    sort_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_journey_steps_journey (journey_id),
    INDEX idx_journey_steps_active (is_active)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS journey_step_resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    journey_step_id INT NOT NULL,
    resource_id INT NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_journey_step_resource (journey_step_id, resource_id),
    INDEX idx_journey_step_resources_step (journey_step_id),
    INDEX idx_journey_step_resources_resource (resource_id)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS journey_checklist_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    journey_step_id INT NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    is_required TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_journey_checklist_step (journey_step_id),
    INDEX idx_journey_checklist_active (is_active)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS employee_journey_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    journey_id INT NOT NULL,
    assigned_by_user_id INT NULL,
    source VARCHAR(60) DEFAULT 'manual',
    status VARCHAR(40) DEFAULT 'active',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    UNIQUE KEY uq_employee_active_journey (user_id, journey_id),
    INDEX idx_employee_journey_user (user_id),
    INDEX idx_employee_journey_journey (journey_id),
    INDEX idx_employee_journey_status (status)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS employee_journey_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    journey_id INT NOT NULL,
    journey_step_id INT NOT NULL,
    status VARCHAR(40) DEFAULT 'completed',
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_employee_step_progress (user_id, journey_step_id),
    INDEX idx_employee_progress_user_journey (user_id, journey_id),
    INDEX idx_employee_progress_status (status)
  )`);

  const [[count]] = await connection.query("SELECT COUNT(*) AS total FROM journeys WHERE is_default = 1");
  if (Number(count.total || 0) === 0) {
    const [journeyResult] = await connection.query(
      "INSERT INTO journeys (title, description, journey_type, is_default, sort_order) VALUES (?, ?, 'home_buying', 1, 1)",
      ["First-Time Home Buyer Journey", "A guided path for employees who are preparing to buy their first home."]
    );
    const steps = [
      ["Complete readiness quiz", "Answer the onboarding questions so your Home Buying Team can understand your needs.", 1],
      ["Review recommended resources", "Read guides and checklists matched to your readiness level.", 2],
      ["Book advisor conversation", "Meet with your Home Buying Team to discuss next steps.", 3],
      ["Prepare documents", "Start gathering income, savings, and identification documents.", 4],
    ];
    for (const step of steps) {
      await connection.query("INSERT INTO journey_steps (journey_id, title, description, sort_order) VALUES (?, ?, ?, ?)", [journeyResult.insertId, step[0], step[1], step[2]]);
    }
  }
};

const getEmployeeTeamId = async (userId) => {
  const [[row]] = await pool.query(`SELECT p.team_id FROM users u LEFT JOIN partnerships p ON p.id = u.partnership_id WHERE u.id = ? LIMIT 1`, [userId]);
  return row?.team_id || null;
};

const getJourneyStats = async (journeyId, userId) => {
  const [[stats]] = await pool.query(
    `SELECT COUNT(js.id) AS total_steps, COUNT(ejp.id) AS completed_steps
     FROM journey_steps js
     LEFT JOIN employee_journey_progress ejp ON ejp.journey_step_id = js.id AND ejp.user_id = ?
     WHERE js.journey_id = ? AND js.is_active = 1`,
    [userId, journeyId]
  );
  const total = Number(stats.total_steps || 0);
  const completed = Number(stats.completed_steps || 0);
  return { total_steps: total, completed_steps: completed, percent: total ? Math.round((completed / total) * 100) : 0 };
};

const canManageJourney = async (user, journeyId) => {
  if (!canManage(user)) return false;
  if (adminRoles.includes(user.role)) return true;
  const [[journey]] = await pool.query("SELECT team_id FROM journeys WHERE id = ? LIMIT 1", [journeyId]);
  return Boolean(journey) && Number(journey.team_id) === Number(user.team_id);
};

const canManageStep = async (user, stepId) => {
  const [[step]] = await pool.query("SELECT journey_id FROM journey_steps WHERE id = ? LIMIT 1", [stepId]);
  if (!step) return false;
  return canManageJourney(user, step.journey_id);
};

const attachStepChildren = async (steps) => {
  if (!steps.length) return steps;
  const ids = steps.map((step) => step.id);
  const placeholders = ids.map(() => "?").join(",");
  const [resources] = await pool.query(
    `SELECT jsr.journey_step_id, r.id, r.title, r.category, r.resource_type, r.image_url
     FROM journey_step_resources jsr
     JOIN resources r ON r.id = jsr.resource_id
     WHERE jsr.journey_step_id IN (${placeholders})
     ORDER BY jsr.sort_order ASC, jsr.id ASC`,
    ids
  );
  const [checklist] = await pool.query(
    `SELECT * FROM journey_checklist_items WHERE journey_step_id IN (${placeholders}) AND is_active = 1 ORDER BY sort_order ASC, id ASC`,
    ids
  );
  return steps.map((step) => ({
    ...step,
    resources: resources.filter((resource) => Number(resource.journey_step_id) === Number(step.id)),
    checklist_items: checklist.filter((item) => Number(item.journey_step_id) === Number(step.id)),
  }));
};

const assignDefaultJourneyIfNeeded = async (user) => {
  if (user.role !== "employee") return null;
  const [[existing]] = await pool.query("SELECT * FROM employee_journey_assignments WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1", [user.id]);
  if (existing) return existing;
  const teamId = await getEmployeeTeamId(user.id);
  const [[journey]] = await pool.query("SELECT * FROM journeys WHERE is_active = 1 AND (team_id IS NULL OR team_id = ?) ORDER BY is_default DESC, sort_order ASC, id ASC LIMIT 1", [teamId]);
  if (!journey) return null;
  const [result] = await pool.query("INSERT INTO employee_journey_assignments (user_id, journey_id, source, status) VALUES (?, ?, 'default', 'active')", [user.id, journey.id]);
  return { id: result.insertId, user_id: user.id, journey_id: journey.id, source: "default", status: "active" };
};

router.use(protect);

router.get("/", async (req, res) => {
  try {
    if (!canViewJourney(req.user)) return res.status(403).json({ status: "error", message: "Access denied" });
    await ensureJourneyTables();
    const params = [];
    let clause = "WHERE j.is_active = 1";
    if (hbtRoles.includes(req.user.role)) {
      clause += " AND (j.team_id IS NULL OR j.team_id = ?)";
      params.push(req.user.team_id);
    }
    const [journeys] = await pool.query(
      `SELECT j.*, COUNT(js.id) AS step_count
       FROM journeys j
       LEFT JOIN journey_steps js ON js.journey_id = j.id AND js.is_active = 1
       ${clause}
       GROUP BY j.id
       ORDER BY j.sort_order ASC, j.id ASC`,
      params
    );
    return res.json({ status: "success", journeys });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load journeys", error: error.message });
  }
});

router.get("/me", async (req, res) => {
  try {
    if (req.user.role !== "employee") return res.status(403).json({ status: "error", message: "Employee access required" });
    await ensureJourneyTables();
    const assignment = await assignDefaultJourneyIfNeeded(req.user);
    if (!assignment) return res.json({ status: "success", assignment: null, journey: null, steps: [], progress: { total_steps: 0, completed_steps: 0, percent: 0 } });
    const [[journey]] = await pool.query("SELECT * FROM journeys WHERE id = ? LIMIT 1", [assignment.journey_id]);
    const [stepsRaw] = await pool.query(
      `SELECT js.*, ejp.status AS progress_status, ejp.completed_at
       FROM journey_steps js
       LEFT JOIN employee_journey_progress ejp ON ejp.journey_step_id = js.id AND ejp.user_id = ?
       WHERE js.journey_id = ? AND js.is_active = 1
       ORDER BY js.sort_order ASC, js.id ASC`,
      [req.user.id, assignment.journey_id]
    );
    const steps = await attachStepChildren(stepsRaw);
    return res.json({ status: "success", assignment, journey, steps, progress: await getJourneyStats(assignment.journey_id, req.user.id) });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load employee journey", error: error.message });
  }
});

router.put("/steps/:stepId", async (req, res) => {
  try {
    if (!(await canManageStep(req.user, req.params.stepId))) return res.status(403).json({ status: "error", message: "Not allowed to update this step" });
    await pool.query(
      "UPDATE journey_steps SET title = ?, description = ?, step_type = ?, sort_order = ?, is_active = ? WHERE id = ?",
      [clean(req.body.title, 180), clean(req.body.description, 2000) || null, clean(req.body.step_type, 60) || "task", Number(req.body.sort_order || 0), req.body.is_active ?? 1, req.params.stepId]
    );
    return res.json({ status: "success", message: "Journey step updated" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update journey step", error: error.message });
  }
});

router.delete("/steps/:stepId", async (req, res) => {
  try {
    if (!(await canManageStep(req.user, req.params.stepId))) return res.status(403).json({ status: "error", message: "Not allowed to archive this step" });
    await pool.query("UPDATE journey_steps SET is_active = 0 WHERE id = ?", [req.params.stepId]);
    return res.json({ status: "success", message: "Journey step archived" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to archive journey step", error: error.message });
  }
});

router.post("/steps/:stepId/resources", async (req, res) => {
  try {
    if (!(await canManageStep(req.user, req.params.stepId))) return res.status(403).json({ status: "error", message: "Not allowed to update this step" });
    const resourceId = Number(req.body.resource_id);
    if (!resourceId) return res.status(400).json({ status: "error", message: "resource_id is required" });
    await pool.query("INSERT IGNORE INTO journey_step_resources (journey_step_id, resource_id, sort_order) VALUES (?, ?, ?)", [req.params.stepId, resourceId, Number(req.body.sort_order || 0)]);
    return res.status(201).json({ status: "success", message: "Resource attached" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to attach resource", error: error.message });
  }
});

router.delete("/steps/:stepId/resources/:resourceId", async (req, res) => {
  try {
    if (!(await canManageStep(req.user, req.params.stepId))) return res.status(403).json({ status: "error", message: "Not allowed to update this step" });
    await pool.query("DELETE FROM journey_step_resources WHERE journey_step_id = ? AND resource_id = ?", [req.params.stepId, req.params.resourceId]);
    return res.json({ status: "success", message: "Resource detached" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to detach resource", error: error.message });
  }
});

router.post("/steps/:stepId/checklist", async (req, res) => {
  try {
    if (!(await canManageStep(req.user, req.params.stepId))) return res.status(403).json({ status: "error", message: "Not allowed to update this step" });
    const title = clean(req.body.title, 180);
    if (!title) return res.status(400).json({ status: "error", message: "Checklist title is required" });
    const [result] = await pool.query(
      "INSERT INTO journey_checklist_items (journey_step_id, title, description, is_required, sort_order) VALUES (?, ?, ?, ?, ?)",
      [req.params.stepId, title, clean(req.body.description, 2000) || null, req.body.is_required ?? 1, Number(req.body.sort_order || 0)]
    );
    return res.status(201).json({ status: "success", checklist_item_id: result.insertId });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to add checklist item", error: error.message });
  }
});

router.put("/checklist/:itemId", async (req, res) => {
  try {
    const [[item]] = await pool.query("SELECT journey_step_id FROM journey_checklist_items WHERE id = ? LIMIT 1", [req.params.itemId]);
    if (!item || !(await canManageStep(req.user, item.journey_step_id))) return res.status(403).json({ status: "error", message: "Not allowed to update this checklist item" });
    await pool.query(
      "UPDATE journey_checklist_items SET title = ?, description = ?, is_required = ?, sort_order = ?, is_active = ? WHERE id = ?",
      [clean(req.body.title, 180), clean(req.body.description, 2000) || null, req.body.is_required ?? 1, Number(req.body.sort_order || 0), req.body.is_active ?? 1, req.params.itemId]
    );
    return res.json({ status: "success", message: "Checklist item updated" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update checklist item", error: error.message });
  }
});

router.delete("/checklist/:itemId", async (req, res) => {
  try {
    const [[item]] = await pool.query("SELECT journey_step_id FROM journey_checklist_items WHERE id = ? LIMIT 1", [req.params.itemId]);
    if (!item || !(await canManageStep(req.user, item.journey_step_id))) return res.status(403).json({ status: "error", message: "Not allowed to archive this checklist item" });
    await pool.query("UPDATE journey_checklist_items SET is_active = 0 WHERE id = ?", [req.params.itemId]);
    return res.json({ status: "success", message: "Checklist item archived" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to archive checklist item", error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!canViewJourney(req.user)) return res.status(403).json({ status: "error", message: "Access denied" });
    await ensureJourneyTables();
    const [[journey]] = await pool.query("SELECT * FROM journeys WHERE id = ? LIMIT 1", [req.params.id]);
    if (!journey) return res.status(404).json({ status: "error", message: "Journey not found" });
    if (hbtRoles.includes(req.user.role) && journey.team_id && Number(journey.team_id) !== Number(req.user.team_id)) return res.status(403).json({ status: "error", message: "Not allowed to view this journey" });
    const [stepsRaw] = await pool.query("SELECT * FROM journey_steps WHERE journey_id = ? AND is_active = 1 ORDER BY sort_order ASC, id ASC", [req.params.id]);
    return res.json({ status: "success", journey, steps: await attachStepChildren(stepsRaw) });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load journey", error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ status: "error", message: "Admin or HBT admin access required" });
    await ensureJourneyTables();
    const title = clean(req.body.title, 180);
    if (!title) return res.status(400).json({ status: "error", message: "Journey title is required" });
    const teamId = req.user.role === "hbt_admin" ? req.user.team_id : req.body.team_id || null;
    const [result] = await pool.query(
      "INSERT INTO journeys (team_id, title, description, journey_type, is_default, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [teamId, title, clean(req.body.description, 2000) || null, clean(req.body.journey_type, 80) || "home_buying", req.body.is_default ? 1 : 0, Number(req.body.sort_order || 0), req.body.is_active ?? 1]
    );
    return res.status(201).json({ status: "success", journey_id: result.insertId });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to create journey", error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    if (!(await canManageJourney(req.user, req.params.id))) return res.status(403).json({ status: "error", message: "Not allowed to update this journey" });
    const title = clean(req.body.title, 180);
    if (!title) return res.status(400).json({ status: "error", message: "Journey title is required" });
    await pool.query(
      "UPDATE journeys SET title = ?, description = ?, journey_type = ?, is_default = ?, sort_order = ?, is_active = ? WHERE id = ?",
      [title, clean(req.body.description, 2000) || null, clean(req.body.journey_type, 80) || "home_buying", req.body.is_default ? 1 : 0, Number(req.body.sort_order || 0), req.body.is_active ?? 1, req.params.id]
    );
    return res.json({ status: "success", message: "Journey updated" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update journey", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!(await canManageJourney(req.user, req.params.id))) return res.status(403).json({ status: "error", message: "Not allowed to archive this journey" });
    await pool.query("UPDATE journeys SET is_active = 0 WHERE id = ?", [req.params.id]);
    return res.json({ status: "success", message: "Journey archived" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to archive journey", error: error.message });
  }
});

router.post("/:id/duplicate", async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (!(await canManageJourney(req.user, req.params.id))) return res.status(403).json({ status: "error", message: "Not allowed to duplicate this journey" });
    await connection.beginTransaction();
    const [[journey]] = await connection.query("SELECT * FROM journeys WHERE id = ? LIMIT 1", [req.params.id]);
    if (!journey) {
      await connection.rollback();
      return res.status(404).json({ status: "error", message: "Journey not found" });
    }
    const [journeyResult] = await connection.query(
      "INSERT INTO journeys (team_id, title, description, journey_type, is_default, is_active, sort_order) VALUES (?, ?, ?, ?, 0, 1, ?)",
      [journey.team_id, `${journey.title} Copy`, journey.description, journey.journey_type, Number(journey.sort_order || 0) + 1]
    );
    const [steps] = await connection.query("SELECT * FROM journey_steps WHERE journey_id = ? AND is_active = 1 ORDER BY sort_order ASC, id ASC", [req.params.id]);
    for (const step of steps) {
      const [stepResult] = await connection.query(
        "INSERT INTO journey_steps (journey_id, title, description, step_type, sort_order, is_active) VALUES (?, ?, ?, ?, ?, 1)",
        [journeyResult.insertId, step.title, step.description, step.step_type, step.sort_order]
      );
      const [resources] = await connection.query("SELECT * FROM journey_step_resources WHERE journey_step_id = ?", [step.id]);
      for (const resource of resources) await connection.query("INSERT IGNORE INTO journey_step_resources (journey_step_id, resource_id, sort_order) VALUES (?, ?, ?)", [stepResult.insertId, resource.resource_id, resource.sort_order]);
      const [items] = await connection.query("SELECT * FROM journey_checklist_items WHERE journey_step_id = ? AND is_active = 1", [step.id]);
      for (const item of items) await connection.query("INSERT INTO journey_checklist_items (journey_step_id, title, description, is_required, sort_order, is_active) VALUES (?, ?, ?, ?, ?, 1)", [stepResult.insertId, item.title, item.description, item.is_required, item.sort_order]);
    }
    await connection.commit();
    return res.status(201).json({ status: "success", journey_id: journeyResult.insertId });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({ status: "error", message: "Failed to duplicate journey", error: error.message });
  } finally {
    connection.release();
  }
});

router.post("/:id/steps", async (req, res) => {
  try {
    if (!(await canManageJourney(req.user, req.params.id))) return res.status(403).json({ status: "error", message: "Not allowed to update this journey" });
    const title = clean(req.body.title, 180);
    if (!title) return res.status(400).json({ status: "error", message: "Step title is required" });
    const [result] = await pool.query(
      "INSERT INTO journey_steps (journey_id, title, description, step_type, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)",
      [req.params.id, title, clean(req.body.description, 2000) || null, clean(req.body.step_type, 60) || "task", Number(req.body.sort_order || 0), req.body.is_active ?? 1]
    );
    return res.status(201).json({ status: "success", step_id: result.insertId });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to create journey step", error: error.message });
  }
});

router.post("/assign/:employeeId", async (req, res) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ status: "error", message: "Admin or HBT admin access required" });
    await ensureJourneyTables();
    const journeyId = Number(req.body.journey_id);
    if (!journeyId) return res.status(400).json({ status: "error", message: "journey_id is required" });
    await pool.query(
      "INSERT INTO employee_journey_assignments (user_id, journey_id, assigned_by_user_id, source, status) VALUES (?, ?, ?, 'manual', 'active') ON DUPLICATE KEY UPDATE status = 'active', assigned_by_user_id = VALUES(assigned_by_user_id), assigned_at = CURRENT_TIMESTAMP",
      [req.params.employeeId, journeyId, req.user.id]
    );
    return res.json({ status: "success", message: "Journey assigned" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to assign journey", error: error.message });
  }
});

router.put("/progress/:stepId", async (req, res) => {
  try {
    if (req.user.role !== "employee") return res.status(403).json({ status: "error", message: "Employee access required" });
    await ensureJourneyTables();
    const [[step]] = await pool.query("SELECT id, journey_id FROM journey_steps WHERE id = ? LIMIT 1", [req.params.stepId]);
    if (!step) return res.status(404).json({ status: "error", message: "Step not found" });
    await pool.query(
      "INSERT INTO employee_journey_progress (user_id, journey_id, journey_step_id, status) VALUES (?, ?, ?, 'completed') ON DUPLICATE KEY UPDATE status = 'completed', completed_at = CURRENT_TIMESTAMP",
      [req.user.id, step.journey_id, step.id]
    );
    return res.json({ status: "success", message: "Journey step completed", progress: await getJourneyStats(step.journey_id, req.user.id) });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update journey progress", error: error.message });
  }
});

module.exports = router;
module.exports.ensureJourneyTables = ensureJourneyTables;
