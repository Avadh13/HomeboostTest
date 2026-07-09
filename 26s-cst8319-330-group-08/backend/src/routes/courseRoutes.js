const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
const adminRoles = ["admin", "super_admin"];
const hbtRoles = ["hbt_admin", "hbt_member"];
const canManage = (user) => adminRoles.includes(user?.role) || user?.role === "hbt_admin";
const canViewHbtCourse = (user) => adminRoles.includes(user?.role) || hbtRoles.includes(user?.role);
const clean = (value, max = 255) => String(value || "").trim().slice(0, max);

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
    const modules = [
      ["Program Foundation", "Understand the offer, audience, and business value.", 1],
      ["Employer Outreach", "Learn how to introduce the benefit to employers.", 2],
      ["Employee Support Workflow", "Review the employee journey, resources, messaging, and follow-up.", 3],
    ];
    for (const module of modules) {
      const [moduleResult] = await connection.query(
        "INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?, ?, ?, ?)",
        [courseResult.insertId, module[0], module[1], module[2]]
      );
      await connection.query(
        "INSERT INTO course_lessons (module_id, title, content, estimated_minutes, sort_order) VALUES (?, ?, ?, ?, ?)",
        [moduleResult.insertId, `${module[0]} overview`, `Complete this lesson to understand ${module[0].toLowerCase()} for the Home Buying Program.`, 8, 1]
      );
    }
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
