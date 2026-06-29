const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

const DEFAULT_TODOS = [
  { key: "review_quiz", label: "Review quiz submission", sort_order: 1 },
  { key: "first_contact", label: "First contact completed", sort_order: 2 },
  { key: "needs_review", label: "Needs and budget reviewed", sort_order: 3 },
  { key: "appointment_booked", label: "Appointment booked", sort_order: 4 },
  { key: "resources_sent", label: "Resources / next steps sent", sort_order: 5 },
  { key: "follow_up_done", label: "Follow-up completed", sort_order: 6 },
];

const isAdmin = (user) => user?.role === "admin" || user?.role === "super_admin";
const isHbtAdmin = (user) => user?.role === "hbt_admin";
const isHbtMember = (user) => user?.role === "hbt_member";

const ensureTodos = async (connection, assignmentId) => {
  for (const todo of DEFAULT_TODOS) {
    await connection.query(
      `INSERT INTO employee_lead_todos (assignment_id, todo_key, label, sort_order, is_completed)
       VALUES (?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE label = VALUES(label), sort_order = VALUES(sort_order)`,
      [assignmentId, todo.key, todo.label, todo.sort_order]
    );
  }
};

const getAssignmentAccessSql = (user) => {
  if (isAdmin(user)) return { where: "", params: [] };
  if (isHbtAdmin(user)) return { where: "WHERE p.team_id = ?", params: [user.team_id] };
  if (isHbtMember(user)) return { where: "WHERE ela.team_member_user_id = ?", params: [user.id] };
  return { where: "WHERE ela.employee_user_id = ?", params: [user.id] };
};

router.get("/hbt", protect, async (req, res) => {
  try {
    const user = req.user;
    if (!isAdmin(user) && !isHbtAdmin(user) && !isHbtMember(user)) {
      return res.status(403).json({ status: "error", message: "HBT access required" });
    }

    const access = getAssignmentAccessSql(user);

    const [assignments] = await pool.query(
      `SELECT
        ela.id,
        ela.employee_user_id,
        ela.team_member_user_id,
        ela.partnership_id,
        ela.status,
        ela.created_at,
        ela.updated_at,
        employee.full_name AS employee_name,
        employee.email AS employee_email,
        member.full_name AS member_name,
        member.email AS member_email,
        e.name AS employer_name,
        p.slug AS partnership_slug,
        COUNT(t.id) AS todo_count,
        SUM(CASE WHEN t.is_completed = 1 THEN 1 ELSE 0 END) AS completed_count,
        ROUND(COALESCE(SUM(CASE WHEN t.is_completed = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0), 0) * 100) AS progress_percent
       FROM employee_lead_assignments ela
       JOIN users employee ON ela.employee_user_id = employee.id
       JOIN users member ON ela.team_member_user_id = member.id
       JOIN partnerships p ON ela.partnership_id = p.id
       JOIN employers e ON p.employer_id = e.id
       LEFT JOIN employee_lead_todos t ON t.assignment_id = ela.id
       ${access.where}
       GROUP BY ela.id
       ORDER BY ela.updated_at DESC, ela.id DESC`,
      access.params
    );

    for (const assignment of assignments) {
      const [todos] = await pool.query(
        `SELECT id, todo_key, label, sort_order, is_completed, completed_at
         FROM employee_lead_todos
         WHERE assignment_id = ?
         ORDER BY sort_order ASC, id ASC`,
        [assignment.id]
      );
      assignment.todos = todos;
      assignment.progress_percent = Number(assignment.progress_percent || 0);
    }

    const [teamMembers] = isHbtAdmin(user)
      ? await pool.query(
          `SELECT u.id, u.full_name, u.email
           FROM users u
           WHERE u.team_id = ?
           AND u.role IN ('hbt_member', 'hbt_admin')
           AND u.is_active = 1
           ORDER BY u.role ASC, u.full_name ASC`,
          [user.team_id]
        )
      : [[], []];

    res.json({ assignments, team_members: teamMembers || [] });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to load lead assignments", error: error.message });
  }
});

router.get("/employee", protect, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "employee") {
      return res.status(403).json({ status: "error", message: "Employee access required" });
    }

    const [assignments] = await pool.query(
      `SELECT
        ela.id,
        ela.status,
        ela.created_at,
        ela.updated_at,
        member.full_name AS member_name,
        member.email AS member_email,
        e.name AS employer_name,
        COUNT(t.id) AS todo_count,
        SUM(CASE WHEN t.is_completed = 1 THEN 1 ELSE 0 END) AS completed_count,
        ROUND(COALESCE(SUM(CASE WHEN t.is_completed = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(t.id), 0), 0) * 100) AS progress_percent
       FROM employee_lead_assignments ela
       JOIN users member ON ela.team_member_user_id = member.id
       JOIN partnerships p ON ela.partnership_id = p.id
       JOIN employers e ON p.employer_id = e.id
       LEFT JOIN employee_lead_todos t ON t.assignment_id = ela.id
       WHERE ela.employee_user_id = ?
       GROUP BY ela.id
       ORDER BY ela.id DESC
       LIMIT 1`,
      [user.id]
    );

    const assignment = assignments[0] || null;
    if (!assignment) return res.json({ assignment: null, todos: [], progress_percent: 0 });

    const [todos] = await pool.query(
      `SELECT id, todo_key, label, sort_order, is_completed, completed_at
       FROM employee_lead_todos
       WHERE assignment_id = ?
       ORDER BY sort_order ASC, id ASC`,
      [assignment.id]
    );

    res.json({ assignment: { ...assignment, progress_percent: Number(assignment.progress_percent || 0) }, todos, progress_percent: Number(assignment.progress_percent || 0) });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to load employee progress", error: error.message });
  }
});

router.post("/assign", protect, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const user = req.user;
    const { employee_user_id, team_member_user_id } = req.body;

    if (!isAdmin(user) && !isHbtAdmin(user)) {
      return res.status(403).json({ status: "error", message: "Only Admin or HBT Admin can assign employees" });
    }

    if (!employee_user_id || !team_member_user_id) {
      return res.status(400).json({ status: "error", message: "Employee and HBT team member are required" });
    }

    const [employees] = await connection.query(
      `SELECT u.id, u.partnership_id, p.team_id
       FROM users u
       JOIN partnerships p ON u.partnership_id = p.id
       WHERE u.id = ? AND u.role = 'employee'
       LIMIT 1`,
      [employee_user_id]
    );

    if (employees.length === 0) {
      return res.status(404).json({ status: "error", message: "Employee not found" });
    }

    const employee = employees[0];

    if (isHbtAdmin(user) && Number(employee.team_id) !== Number(user.team_id)) {
      return res.status(403).json({ status: "error", message: "Employee is not assigned to your HBT team" });
    }

    const [members] = await connection.query(
      `SELECT id, team_id
       FROM users
       WHERE id = ?
       AND role IN ('hbt_member', 'hbt_admin')
       AND is_active = 1
       LIMIT 1`,
      [team_member_user_id]
    );

    if (members.length === 0) {
      return res.status(404).json({ status: "error", message: "HBT member not found" });
    }

    if (Number(members[0].team_id) !== Number(employee.team_id)) {
      return res.status(400).json({ status: "error", message: "HBT member must belong to the same team as the employee" });
    }

    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO employee_lead_assignments
       (employee_user_id, team_member_user_id, partnership_id, assigned_by_user_id, status)
       VALUES (?, ?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE
         team_member_user_id = VALUES(team_member_user_id),
         assigned_by_user_id = VALUES(assigned_by_user_id),
         status = 'active',
         updated_at = CURRENT_TIMESTAMP`,
      [employee_user_id, team_member_user_id, employee.partnership_id, user.id]
    );

    const [[assignment]] = await connection.query(
      `SELECT id FROM employee_lead_assignments WHERE employee_user_id = ? LIMIT 1`,
      [employee_user_id]
    );

    await ensureTodos(connection, assignment.id);
    await connection.commit();

    res.status(201).json({ status: "success", message: "Employee assigned successfully", assignment_id: assignment.id });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ status: "error", message: "Failed to assign employee", error: error.message });
  } finally {
    connection.release();
  }
});

router.put("/assignments/:assignmentId/todos/:todoId", protect, async (req, res) => {
  try {
    const user = req.user;
    const { assignmentId, todoId } = req.params;
    const isCompleted = Number(req.body.is_completed) === 1 ? 1 : 0;

    const [assignments] = await pool.query(
      `SELECT ela.*, p.team_id
       FROM employee_lead_assignments ela
       JOIN partnerships p ON ela.partnership_id = p.id
       WHERE ela.id = ?
       LIMIT 1`,
      [assignmentId]
    );

    if (assignments.length === 0) {
      return res.status(404).json({ status: "error", message: "Assignment not found" });
    }

    const assignment = assignments[0];

    const canUpdate =
      isAdmin(user) ||
      (isHbtAdmin(user) && Number(user.team_id) === Number(assignment.team_id)) ||
      (isHbtMember(user) && Number(user.id) === Number(assignment.team_member_user_id));

    if (!canUpdate) {
      return res.status(403).json({ status: "error", message: "Not allowed to update this todo" });
    }

    await pool.query(
      `UPDATE employee_lead_todos
       SET is_completed = ?, completed_at = CASE WHEN ? = 1 THEN NOW() ELSE NULL END
       WHERE id = ? AND assignment_id = ?`,
      [isCompleted, isCompleted, todoId, assignmentId]
    );

    await pool.query(`UPDATE employee_lead_assignments SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [assignmentId]);

    res.json({ status: "success", message: "Todo updated" });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to update todo", error: error.message });
  }
});

module.exports = router;
