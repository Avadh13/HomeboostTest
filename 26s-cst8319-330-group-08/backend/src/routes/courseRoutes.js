const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const hbtRoles = ["hbt_admin", "hbt_member"];
const canManage = (user) => adminRoles.includes(user?.role) || user?.role === "hbt_admin";
const canViewHbtCourse = (user) => adminRoles.includes(user?.role) || hbtRoles.includes(user?.role);
const clean = (value, max = 255) => String(value || "").trim().slice(0, max);
const frontendUrl = () => (process.env.FRONTEND_URL || process.env.CLIENT_URL || "https://homeboost-test.vercel.app").replace(/\/+$/, "");

const addColumnIfMissing = async (connection, tableName, columnName, definition) => {
  const [rows] = await connection.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [tableName, columnName]
  );
  if (rows.length === 0) await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
};

const seedLessons = () => [
  {
    moduleTitle: "Program Foundation",
    moduleDescription: "Understand the offer, audience, and business value.",
    lessonTitle: "Program Foundation overview",
    minutes: 8,
    content: `The Employee Benefit Program helps employers give staff a guided path into home buying without turning the employer into a mortgage expert.\n\nYour role as the Home Buying Team is to explain the benefit clearly, answer practical questions, and move interested employees toward the right next step.\n\nFocus on three outcomes: employer value, employee confidence, and clean follow-up. Employers care about retention and benefits. Employees care about affordability, debt, credit, down payment, and knowing who to trust.\n\nWhen presenting the program, keep it simple: this is an education-first benefit backed by real professionals. The portal handles resources, readiness quizzes, messages, progress, and reporting so the program stays organized.`,
    resourcePath: "/resources",
  },
  {
    moduleTitle: "Employer Outreach",
    moduleDescription: "Learn how to introduce the benefit to employers.",
    lessonTitle: "Employer Outreach overview",
    minutes: 8,
    content: `Employer outreach should sound like a business benefit, not a sales pitch. Lead with employee support, retention, financial wellness, and access to trusted guidance.\n\nA strong outreach conversation covers the employer problem first: employees are stressed about housing, debt, renewals, affordability, and financial planning. Then show how the program gives them structured help without adding extra work for HR.\n\nUse this basic flow: identify the employer, explain the benefit, show the portal, explain employee invite control, then confirm next steps.\n\nAvoid overpromising. Keep the message practical: the team educates, guides, and connects employees to the right mortgage/home-buying support when they are ready.`,
    resourcePath: "/contact",
  },
  {
    moduleTitle: "Employee Support Workflow",
    moduleDescription: "Review the employee journey, resources, messaging, and follow-up.",
    lessonTitle: "Employee Support Workflow overview",
    minutes: 8,
    content: `Employee support starts when the employer invites approved employees into the portal. The employee can review resources, complete quizzes, follow their journey, and message the Home Buying Team.\n\nUse readiness signals to prioritize follow-up. A hot lead may need direct guidance quickly. A warm lead may need resources and a short check-in. A cold lead may only need education for now.\n\nKeep all communication inside the message center where possible. That gives the team a cleaner record and avoids scattered follow-up.\n\nThe best workflow is simple: review quiz signals, check assigned employees, complete follow-up tasks, send useful resources, and update progress.`,
    resourcePath: "/hbt/messages",
  },
];

const ensureCourseTables = async (connection = pool) => {
  await connection.query(`CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    audience_role VARCHAR(60) DEFAULT 'hbt',
    is_active TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_courses_active (is_active),
    INDEX idx_courses_audience (audience_role)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS course_modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    sort_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_course_modules_course (course_id),
    INDEX idx_course_modules_active (is_active)
  )`);

  await connection.query(`CREATE TABLE IF NOT EXISTS course_lessons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module_id INT NOT NULL,
    title VARCHAR(180) NOT NULL,
    lesson_type VARCHAR(40) DEFAULT 'article',
    content TEXT NULL,
    video_url VARCHAR(500) NULL,
    resource_url VARCHAR(500) NULL,
    estimated_minutes INT DEFAULT 5,
    sort_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_course_lessons_module (module_id),
    INDEX idx_course_lessons_active (is_active)
  )`);

  await addColumnIfMissing(connection, "course_lessons", "lesson_type", "VARCHAR(40) DEFAULT 'article'");
  await addColumnIfMissing(connection, "course_lessons", "content", "TEXT NULL");
  await addColumnIfMissing(connection, "course_lessons", "video_url", "VARCHAR(500) NULL");
  await addColumnIfMissing(connection, "course_lessons", "resource_url", "VARCHAR(500) NULL");
  await addColumnIfMissing(connection, "course_lessons", "estimated_minutes", "INT DEFAULT 5");

  await connection.query(`CREATE TABLE IF NOT EXISTS course_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    lesson_id INT NOT NULL,
    status VARCHAR(40) DEFAULT 'completed',
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_course_progress_lesson (user_id, lesson_id),
    INDEX idx_course_progress_user_course (user_id, course_id),
    INDEX idx_course_progress_status (status)
  )`);

  const [[count]] = await connection.query("SELECT COUNT(*) AS total FROM courses WHERE audience_role = 'hbt'");
  if (Number(count.total || 0) === 0) {
    const [courseResult] = await connection.query(
      "INSERT INTO courses (title, description, audience_role, sort_order) VALUES (?, ?, 'hbt', 1)",
      ["Home Buying Program Onboarding", "Learn how to position the Employee Benefit Program, approach employers, and support employees inside the portal."]
    );

    let order = 1;
    for (const lesson of seedLessons()) {
      const [moduleResult] = await connection.query(
        "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?, ?, ?, ?)",
        [courseResult.insertId, lesson.moduleTitle, lesson.moduleDescription, order]
      );
      await connection.query(
        `INSERT INTO course_lessons (module_id, title, lesson_type, content, resource_url, estimated_minutes, sort_order)
         VALUES (?, ?, 'article', ?, ?, ?, 1)`,
        [moduleResult.insertId, lesson.lessonTitle, lesson.content, `${frontendUrl()}${lesson.resourcePath}`, lesson.minutes]
      );
      order += 1;
    }
  }

  for (const lesson of seedLessons()) {
    await connection.query(
      `UPDATE course_lessons cl
       JOIN course_modules cm ON cm.id = cl.module_id
       JOIN courses c ON c.id = cm.course_id
       SET cl.lesson_type = COALESCE(NULLIF(cl.lesson_type, ''), 'article'),
           cl.content = CASE WHEN cl.content IS NULL OR cl.content = '' OR cl.content LIKE 'Complete this lesson%' THEN ? ELSE cl.content END,
           cl.resource_url = CASE WHEN cl.resource_url IS NULL OR cl.resource_url = '' THEN ? ELSE cl.resource_url END,
           cl.estimated_minutes = CASE WHEN cl.estimated_minutes IS NULL OR cl.estimated_minutes < 5 THEN ? ELSE cl.estimated_minutes END
       WHERE c.audience_role = 'hbt' AND cl.title = ?`,
      [lesson.content, `${frontendUrl()}${lesson.resourcePath}`, lesson.minutes, lesson.lessonTitle]
    );
  }
};

const summarizeCourse = async (courseId, userId) => {
  const [[stats]] = await pool.query(
    `SELECT COUNT(cl.id) AS total_lessons,
            COUNT(cp.id) AS completed_lessons,
            MAX(cp.completed_at) AS last_completed_at
     FROM courses c
     LEFT JOIN course_modules cm ON cm.course_id = c.id AND cm.is_active = 1
     LEFT JOIN course_lessons cl ON cl.module_id = cm.id AND cl.is_active = 1
     LEFT JOIN course_progress cp ON cp.lesson_id = cl.id AND cp.user_id = ? AND cp.status = 'completed'
     WHERE c.id = ?`,
    [userId, courseId]
  );

  const [[nextLesson]] = await pool.query(
    `SELECT cl.id, cl.title, cm.title AS module_title
     FROM course_lessons cl
     JOIN course_modules cm ON cm.id = cl.module_id
     LEFT JOIN course_progress cp ON cp.lesson_id = cl.id AND cp.user_id = ? AND cp.status = 'completed'
     WHERE cm.course_id = ? AND cm.is_active = 1 AND cl.is_active = 1 AND cp.id IS NULL
     ORDER BY cm.sort_order ASC, cm.id ASC, cl.sort_order ASC, cl.id ASC
     LIMIT 1`,
    [userId, courseId]
  );

  const total = Number(stats.total_lessons || 0);
  const completed = Number(stats.completed_lessons || 0);
  return {
    total_lessons: total,
    completed_lessons: completed,
    percent: total ? Math.round((completed / total) * 100) : 0,
    last_completed_at: stats.last_completed_at,
    resume_lesson_id: nextLesson?.id || null,
    resume_lesson_title: nextLesson?.title || null,
    resume_module_title: nextLesson?.module_title || null,
    is_complete: total > 0 && completed >= total,
  };
};

router.use(protect);

router.get("/", async (req, res) => {
  try {
    if (!canViewHbtCourse(req.user)) return res.status(403).json({ status: "error", message: "HBT access required" });
    await ensureCourseTables();
    const [courses] = await pool.query("SELECT * FROM courses WHERE is_active = 1 AND audience_role = 'hbt' ORDER BY sort_order ASC, id ASC");
    const withProgress = [];
    for (const course of courses) withProgress.push({ ...course, progress: await summarizeCourse(course.id, req.user.id) });
    return res.json({ status: "success", courses: withProgress });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load courses", error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!canViewHbtCourse(req.user)) return res.status(403).json({ status: "error", message: "HBT access required" });
    await ensureCourseTables();
    const [[course]] = await pool.query("SELECT * FROM courses WHERE id = ? LIMIT 1", [req.params.id]);
    if (!course) return res.status(404).json({ status: "error", message: "Course not found" });
    const [modules] = await pool.query("SELECT * FROM course_modules WHERE course_id = ? AND is_active = 1 ORDER BY sort_order ASC, id ASC", [req.params.id]);
    const [lessons] = await pool.query(
      `SELECT cl.*, cp.status AS progress_status, cp.completed_at
       FROM course_lessons cl
       LEFT JOIN course_progress cp ON cp.lesson_id = cl.id AND cp.user_id = ?
       WHERE cl.is_active = 1 AND cl.module_id IN (SELECT id FROM course_modules WHERE course_id = ?)
       ORDER BY cl.sort_order ASC, cl.id ASC`,
      [req.user.id, req.params.id]
    );
    return res.json({ status: "success", course: { ...course, progress: await summarizeCourse(course.id, req.user.id) }, modules, lessons });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load course", error: error.message });
  }
});

router.post("/lessons/:lessonId/complete", async (req, res) => {
  try {
    if (!canViewHbtCourse(req.user)) return res.status(403).json({ status: "error", message: "HBT access required" });
    await ensureCourseTables();
    const [[lesson]] = await pool.query(
      `SELECT cl.id, cm.course_id FROM course_lessons cl JOIN course_modules cm ON cm.id = cl.module_id WHERE cl.id = ? LIMIT 1`,
      [req.params.lessonId]
    );
    if (!lesson) return res.status(404).json({ status: "error", message: "Lesson not found" });
    await pool.query(
      `INSERT INTO course_progress (user_id, course_id, lesson_id, status) VALUES (?, ?, ?, 'completed')
       ON DUPLICATE KEY UPDATE status = 'completed', completed_at = CURRENT_TIMESTAMP`,
      [req.user.id, lesson.course_id, lesson.id]
    );
    return res.json({ status: "success", message: "Lesson completed", progress: await summarizeCourse(lesson.course_id, req.user.id) });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to complete lesson", error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    if (!canManage(req.user)) return res.status(403).json({ status: "error", message: "Admin or HBT admin access required" });
    await ensureCourseTables();
    const title = clean(req.body.title, 180);
    if (!title) return res.status(400).json({ status: "error", message: "Course title is required" });
    const [result] = await pool.query("INSERT INTO courses (title, description, audience_role, sort_order, is_active) VALUES (?, ?, 'hbt', ?, ?)", [title, clean(req.body.description, 2000) || null, Number(req.body.sort_order || 0), req.body.is_active ?? 1]);
    return res.status(201).json({ status: "success", course_id: result.insertId });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to create course", error: error.message });
  }
});

module.exports = router;
module.exports.ensureCourseTables = ensureCourseTables;
