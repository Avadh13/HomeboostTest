const pool = require("../config/db");
const { ensurePortalSettingsTable } = require("../routes/portalBrandingRoutes");
const { ensureAdvancedLeadTables } = require("../services/readinessService");
const {
  ensureActivityAnalyticsTables,
  logEmployeeActivity,
} = require("../services/activityAnalyticsService");

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Number(value) || 0));

const buildMonthSeries = () => {
  const now = new Date();
  const months = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    months.push({
      key: date.toISOString().slice(0, 7),
      label: date.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
      completed_steps: 0,
      quiz_submissions: 0,
      resource_views: 0,
      total: 0,
    });
  }

  return months;
};

const getExistingTables = async (tableNames) => {
  if (!tableNames.length) return new Set();

  const placeholders = tableNames.map(() => "?").join(",");
  const [rows] = await pool.query(
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN (${placeholders})`,
    tableNames
  );

  return new Set(rows.map((row) => String(row.TABLE_NAME || row.table_name || "").toLowerCase()));
};

const applyMonthlyRows = (series, rows, field) => {
  const byMonth = new Map(series.map((month) => [month.key, month]));

  rows.forEach((row) => {
    const month = byMonth.get(String(row.month_key || ""));
    if (month) month[field] = Number(row.total || 0);
  });
};

const createFallbackAnalytics = ({ resourceCount = 0, quizCount = 0 } = {}) => ({
  overall_progress_percent: 0,
  journey: { total_steps: 0, completed_steps: 0, percent: 0 },
  counts: {
    resources_available: Number(resourceCount || 0),
    resources_viewed: 0,
    saved_resources: 0,
    quizzes_available: Number(quizCount || 0),
    quizzes_completed: 0,
    quiz_submissions: 0,
    unread_messages: 0,
  },
  latest_assessment: null,
  monthly_activity: buildMonthSeries(),
  focus_areas: [
    { key: "journey", label: "Home-buying journey", value: 0, path: "/employee/journey" },
    { key: "readiness", label: "Readiness assessment", value: 0, path: "/quiz" },
    { key: "resources", label: "Explore learning resources", value: 0, path: "/resources" },
  ],
});

const buildEmployeeAnalytics = async ({ userId, partnershipId, resourceCount, quizCount }) => {
  await Promise.all([ensureActivityAnalyticsTables(), ensureAdvancedLeadTables()]);

  const analytics = createFallbackAnalytics({ resourceCount, quizCount });
  const tableNames = [
    "employee_journey_assignments",
    "employee_journey_progress",
    "journey_steps",
    "quiz_submissions",
    "quizzes",
    "message_threads",
    "messages",
    "resource_bookmarks",
  ];
  const tables = await getExistingTables(tableNames);
  const startDate = `${analytics.monthly_activity[0].key}-01`;

  if (
    tables.has("employee_journey_assignments")
    && tables.has("employee_journey_progress")
    && tables.has("journey_steps")
  ) {
    const [[journeyStats]] = await pool.query(
      `SELECT
         COUNT(DISTINCT js.id) AS total_steps,
         COUNT(DISTINCT CASE WHEN ejp.id IS NOT NULL THEN js.id END) AS completed_steps
       FROM employee_journey_assignments eja
       JOIN journey_steps js
         ON js.journey_id = eja.journey_id
        AND js.is_active = 1
       LEFT JOIN employee_journey_progress ejp
         ON ejp.journey_step_id = js.id
        AND ejp.user_id = ?
        AND ejp.status = 'completed'
       WHERE eja.user_id = ?
         AND eja.status = 'active'`,
      [userId, userId]
    );

    const totalSteps = Number(journeyStats?.total_steps || 0);
    const completedSteps = Number(journeyStats?.completed_steps || 0);
    analytics.journey = {
      total_steps: totalSteps,
      completed_steps: completedSteps,
      percent: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
    };

    const [journeyRows] = await pool.query(
      `SELECT DATE_FORMAT(completed_at, '%Y-%m') AS month_key, COUNT(*) AS total
       FROM employee_journey_progress
       WHERE user_id = ?
         AND status = 'completed'
         AND completed_at >= ?
       GROUP BY DATE_FORMAT(completed_at, '%Y-%m')`,
      [userId, startDate]
    );
    applyMonthlyRows(analytics.monthly_activity, journeyRows, "completed_steps");
  }

  let latestSubmission = null;
  if (tables.has("quiz_submissions")) {
    const [[quizStats]] = await pool.query(
      `SELECT COUNT(*) AS total_submissions, COUNT(DISTINCT quiz_id) AS completed_quizzes
       FROM quiz_submissions
       WHERE user_id = ?`,
      [userId]
    );

    analytics.counts.quiz_submissions = Number(quizStats?.total_submissions || 0);
    analytics.counts.quizzes_completed = Number(quizStats?.completed_quizzes || 0);

    const quizTitleJoin = tables.has("quizzes") ? "LEFT JOIN quizzes q ON q.id = qs.quiz_id" : "";
    const quizTitleSelect = tables.has("quizzes") ? "q.title AS quiz_title," : "NULL AS quiz_title,";
    const [latestRows] = await pool.query(
      `SELECT qs.id, qs.quiz_id, ${quizTitleSelect} qs.submitted_at
       FROM quiz_submissions qs
       ${quizTitleJoin}
       WHERE qs.user_id = ?
       ORDER BY qs.submitted_at DESC, qs.id DESC
       LIMIT 1`,
      [userId]
    );
    latestSubmission = latestRows[0] || null;

    const [quizRows] = await pool.query(
      `SELECT DATE_FORMAT(submitted_at, '%Y-%m') AS month_key, COUNT(*) AS total
       FROM quiz_submissions
       WHERE user_id = ?
         AND submitted_at >= ?
       GROUP BY DATE_FORMAT(submitted_at, '%Y-%m')`,
      [userId, startDate]
    );
    applyMonthlyRows(analytics.monthly_activity, quizRows, "quiz_submissions");
  }

  const [readinessRows] = await pool.query(
    `SELECT score, level, summary, latest_submission_id, calculated_at
     FROM employee_readiness_scores
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );
  const readiness = readinessRows[0] || null;

  if (readiness || latestSubmission) {
    analytics.latest_assessment = {
      title: latestSubmission?.quiz_title || "Home-buying readiness assessment",
      score: readiness ? clamp(readiness.score) : null,
      level: readiness?.level || "Completed",
      summary: readiness?.summary || null,
      completed_at: readiness?.calculated_at || latestSubmission?.submitted_at || null,
    };
  }

  const [[resourceStats]] = await pool.query(
    `SELECT COUNT(*) AS total_views, COUNT(DISTINCT resource_id) AS viewed_resources
     FROM resource_views
     WHERE user_id = ?`,
    [userId]
  );
  analytics.counts.resources_viewed = Number(resourceStats?.viewed_resources || 0);

  const [resourceRows] = await pool.query(
    `SELECT DATE_FORMAT(viewed_at, '%Y-%m') AS month_key, COUNT(DISTINCT resource_id) AS total
     FROM resource_views
     WHERE user_id = ?
       AND viewed_at >= ?
     GROUP BY DATE_FORMAT(viewed_at, '%Y-%m')`,
    [userId, startDate]
  );
  applyMonthlyRows(analytics.monthly_activity, resourceRows, "resource_views");

  if (tables.has("resource_bookmarks")) {
    const [[bookmarkStats]] = await pool.query(
      `SELECT COUNT(*) AS saved_resources
       FROM resource_bookmarks
       WHERE user_id = ?`,
      [userId]
    );
    analytics.counts.saved_resources = Number(bookmarkStats?.saved_resources || 0);
  }

  if (tables.has("message_threads") && tables.has("messages")) {
    const [[messageStats]] = await pool.query(
      `SELECT COUNT(*) AS unread_messages
       FROM messages m
       JOIN message_threads mt ON mt.id = m.thread_id
       WHERE (mt.created_by = ? OR mt.recipient_id = ?)
         AND m.sender_id <> ?
         AND m.is_read = 0`,
      [userId, userId, userId]
    );
    analytics.counts.unread_messages = Number(messageStats?.unread_messages || 0);
  }

  analytics.monthly_activity = analytics.monthly_activity.map((month) => ({
    ...month,
    total: month.completed_steps + month.quiz_submissions + month.resource_views,
  }));

  const readinessPercent = readiness || analytics.counts.quizzes_completed > 0 ? 100 : 0;
  const resourcePercent = resourceCount > 0
    ? Math.min(100, Math.round((analytics.counts.resources_viewed / resourceCount) * 100))
    : 0;

  analytics.focus_areas = [
    {
      key: "journey",
      label: "Home-buying journey",
      value: analytics.journey.percent,
      path: "/employee/journey",
    },
    {
      key: "readiness",
      label: "Readiness assessment",
      value: readinessPercent,
      path: "/quiz",
    },
    {
      key: "resources",
      label: "Explore learning resources",
      value: resourcePercent,
      path: "/resources",
    },
  ];

  analytics.overall_progress_percent = Math.round(
    (analytics.journey.percent * 0.6)
      + (readinessPercent * 0.2)
      + (resourcePercent * 0.2)
  );

  await logEmployeeActivity({
    userId,
    partnershipId,
    activityType: "employee_portal_view",
    activityLabel: "Employee dashboard viewed",
    metadata: { source: "employee_portal" },
    dedupeHours: 12,
  });

  return analytics;
};

exports.getEmployeePortalData = async (req, res) => {
  try {
    await ensurePortalSettingsTable();
    const userId = req.user.id;

    const [users] = await pool.query(
      `SELECT
         u.id,
         u.full_name,
         u.email,
         u.role,
         u.partnership_id,
         p.slug AS partnership_slug,
         e.name AS employer_name,
         COALESCE(pps.logo_url, e.logo_url) AS employer_logo_url,
         COALESCE(pps.primary_color, e.brand_primary_color) AS brand_primary_color,
         COALESCE(pps.secondary_color, e.brand_secondary_color) AS brand_secondary_color,
         COALESCE(pps.portal_title, CONCAT(e.name, ' Home Buying Portal')) AS portal_title,
         pps.welcome_message,
         pps.prompt_text,
         pps.footer_text,
         h.id AS team_id,
         h.name AS team_name,
         h.description AS team_description,
         h.logo_url AS team_logo_url,
         h.email AS team_email,
         h.phone AS team_phone,
         h.website AS team_website
       FROM users u
       JOIN partnerships p ON u.partnership_id = p.id
       JOIN employers e ON p.employer_id = e.id
       JOIN home_buying_teams h ON p.team_id = h.id
       LEFT JOIN partnership_portal_settings pps ON pps.partnership_id = p.id AND pps.is_published = 1
       WHERE u.id = ?
       LIMIT 1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ status: "error", message: "Employee portal data not found" });
    }

    const employee = users[0];

    const [teamMembers] = await pool.query(
      `SELECT id, full_name, title, email, phone, photo_url, booking_link, bio
       FROM team_members
       WHERE team_id = ? AND is_active = 1
       ORDER BY id DESC`,
      [employee.team_id]
    );

    const [quizzes] = await pool.query(
      `SELECT id, title, description
       FROM quizzes q
       WHERE q.is_active = 1
         AND (
          q.is_global = 1
          OR (
            q.team_id = ?
            AND (
              NOT EXISTS (SELECT 1 FROM quiz_partnerships qp_all WHERE qp_all.quiz_id = q.id)
              OR EXISTS (
                SELECT 1 FROM quiz_partnerships qp
                WHERE qp.quiz_id = q.id AND qp.partnership_id = ?
              )
            )
          )
         )
       ORDER BY id DESC`,
      [employee.team_id, employee.partnership_id]
    );

    const resourceScopeSql = `
      r.is_active = 1
      AND (
        r.is_global = 1
        OR (
          r.team_id = ?
          AND (
            NOT EXISTS (SELECT 1 FROM resource_partnerships rp_all WHERE rp_all.resource_id = r.id)
            OR EXISTS (
              SELECT 1 FROM resource_partnerships rp
              WHERE rp.resource_id = r.id AND rp.partnership_id = ?
            )
          )
        )
      )`;

    const [resources] = await pool.query(
      `SELECT id, title, description, category, image_url, resource_url
       FROM resources r
       WHERE ${resourceScopeSql}
       ORDER BY id DESC
       LIMIT 6`,
      [employee.team_id, employee.partnership_id]
    );

    const [[resourceTotalRow]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM resources r
       WHERE ${resourceScopeSql}`,
      [employee.team_id, employee.partnership_id]
    );
    const resourceCount = Number(resourceTotalRow?.total || 0);

    let analytics = createFallbackAnalytics({ resourceCount, quizCount: quizzes.length });
    try {
      analytics = await buildEmployeeAnalytics({
        userId,
        partnershipId: employee.partnership_id,
        resourceCount,
        quizCount: quizzes.length,
      });
    } catch (analyticsError) {
      console.error("Employee dashboard analytics failed:", analyticsError.message);
    }

    return res.json({
      status: "success",
      employee,
      team_members: teamMembers,
      quizzes,
      resources,
      analytics,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Failed to load employee portal data",
      error: error.message,
    });
  }
};
