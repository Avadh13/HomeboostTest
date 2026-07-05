const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

const allowedStatuses = new Set(["todo", "in_progress", "done", "cancelled"]);
const allowedPriorities = new Set(["low", "normal", "high"]);

let schemaReady = false;
let schemaPromise = null;

const normalizeText = (value, max = 255) => String(value || "").trim().slice(0, max);
const normalizeNullableText = (value, max = 1000) => {
  const text = normalizeText(value, max);
  return text || null;
};
const normalizeDate = (value) => {
  const text = normalizeText(value, 20);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};
const normalizeTime = (value) => {
  const text = normalizeText(value, 10);
  return /^\d{2}:\d{2}(:\d{2})?$/.test(text) ? text.slice(0, 5) : null;
};

const isHbtUser = (user) => user?.role === "hbt_admin" || user?.role === "hbt_member";

const ensureSchema = async () => {
  if (schemaReady) return;
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hbt_member_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        team_id INT NULL,
        title VARCHAR(180) NOT NULL,
        description TEXT NULL,
        task_date DATE NULL,
        start_time TIME NULL,
        end_time TIME NULL,
        priority VARCHAR(20) DEFAULT 'normal',
        status VARCHAR(30) DEFAULT 'todo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_hbt_member_tasks_user (user_id),
        INDEX idx_hbt_member_tasks_team (team_id),
        INDEX idx_hbt_member_tasks_status (status),
        INDEX idx_hbt_member_tasks_date (task_date)
      )
    `);
    schemaReady = true;
  })();

  try {
    await schemaPromise;
  } finally {
    schemaPromise = null;
  }
};

router.use(protect);

router.use((req, res, next) => {
  if (!isHbtUser(req.user)) {
    return res.status(403).json({ status: "error", message: "HBT member access required" });
  }
  next();
});

router.get("/", async (req, res) => {
  try {
    await ensureSchema();
    const [tasks] = await pool.query(
      `SELECT id, title, description, task_date, start_time, end_time, priority, status, created_at, updated_at
       FROM hbt_member_tasks
       WHERE user_id = ?
       ORDER BY
         CASE status WHEN 'todo' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'done' THEN 3 WHEN 'cancelled' THEN 4 ELSE 5 END,
         COALESCE(task_date, '2999-12-31') ASC,
         COALESCE(start_time, '23:59:59') ASC,
         updated_at DESC`,
      [req.user.id]
    );
    return res.json({ status: "success", tasks });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load tasks", error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    await ensureSchema();
    const title = normalizeText(req.body.title, 180);
    if (title.length < 2) return res.status(400).json({ status: "error", message: "Task title is required" });

    const status = allowedStatuses.has(req.body.status) ? req.body.status : "todo";
    const priority = allowedPriorities.has(req.body.priority) ? req.body.priority : "normal";

    const [result] = await pool.query(
      `INSERT INTO hbt_member_tasks
       (user_id, team_id, title, description, task_date, start_time, end_time, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        req.user.team_id || null,
        title,
        normalizeNullableText(req.body.description, 1000),
        normalizeDate(req.body.task_date),
        normalizeTime(req.body.start_time),
        normalizeTime(req.body.end_time),
        priority,
        status,
      ]
    );

    return res.status(201).json({ status: "success", message: "Task created", task_id: result.insertId });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to create task", error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    await ensureSchema();
    const taskId = Number(req.params.id);
    const [[task]] = await pool.query(`SELECT * FROM hbt_member_tasks WHERE id = ? AND user_id = ? LIMIT 1`, [taskId, req.user.id]);
    if (!task) return res.status(404).json({ status: "error", message: "Task not found" });

    const title = normalizeText(req.body.title ?? task.title, 180);
    if (title.length < 2) return res.status(400).json({ status: "error", message: "Task title is required" });

    const status = allowedStatuses.has(req.body.status) ? req.body.status : task.status;
    const priority = allowedPriorities.has(req.body.priority) ? req.body.priority : task.priority;

    await pool.query(
      `UPDATE hbt_member_tasks
       SET title = ?, description = ?, task_date = ?, start_time = ?, end_time = ?, priority = ?, status = ?
       WHERE id = ? AND user_id = ?`,
      [
        title,
        normalizeNullableText(req.body.description ?? task.description, 1000),
        req.body.task_date === "" ? null : normalizeDate(req.body.task_date ?? task.task_date),
        req.body.start_time === "" ? null : normalizeTime(req.body.start_time ?? task.start_time),
        req.body.end_time === "" ? null : normalizeTime(req.body.end_time ?? task.end_time),
        priority,
        status,
        taskId,
        req.user.id,
      ]
    );

    return res.json({ status: "success", message: "Task updated" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update task", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await ensureSchema();
    const taskId = Number(req.params.id);
    const [result] = await pool.query(`DELETE FROM hbt_member_tasks WHERE id = ? AND user_id = ?`, [taskId, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ status: "error", message: "Task not found" });
    return res.json({ status: "success", message: "Task deleted" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to delete task", error: error.message });
  }
});

module.exports = router;
