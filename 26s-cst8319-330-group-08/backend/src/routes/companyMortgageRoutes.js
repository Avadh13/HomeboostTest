const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

const isCompanyUser = (user) => user?.role === "company_admin" || user?.role === "company";

const emptySummary = {
  total_requests: 0,
  active_requests: 0,
  completed_requests: 0,
  unique_employees: 0,
  by_status: [],
  by_service: [],
  recent_activity: [],
};

router.get("/summary", protect, async (req, res) => {
  try {
    if (!isCompanyUser(req.user)) {
      return res.status(403).json({ status: "error", message: "Company manager access required" });
    }

    const partnershipId = Number(req.user.partnership_id || 0);
    if (!partnershipId) {
      return res.json({ status: "success", summary: emptySummary });
    }

    const [[totals]] = await pool.query(
      `SELECT
        COUNT(*) AS total_requests,
        SUM(CASE WHEN status NOT IN ('completed','closed') THEN 1 ELSE 0 END) AS active_requests,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_requests,
        COUNT(DISTINCT requester_user_id) AS unique_employees
       FROM mortgage_service_requests
       WHERE partnership_id = ?`,
      [partnershipId]
    );

    const [byStatus] = await pool.query(
      `SELECT status, COUNT(*) AS total
       FROM mortgage_service_requests
       WHERE partnership_id = ?
       GROUP BY status
       ORDER BY total DESC`,
      [partnershipId]
    );

    const [byService] = await pool.query(
      `SELECT service_title, COUNT(*) AS total
       FROM mortgage_service_requests
       WHERE partnership_id = ?
       GROUP BY service_title
       ORDER BY total DESC
       LIMIT 8`,
      [partnershipId]
    );

    const [recentActivity] = await pool.query(
      `SELECT id, service_title, status, created_at
       FROM mortgage_service_requests
       WHERE partnership_id = ?
       ORDER BY created_at DESC
       LIMIT 8`,
      [partnershipId]
    );

    return res.json({
      status: "success",
      summary: {
        total_requests: Number(totals.total_requests || 0),
        active_requests: Number(totals.active_requests || 0),
        completed_requests: Number(totals.completed_requests || 0),
        unique_employees: Number(totals.unique_employees || 0),
        by_status: byStatus,
        by_service: byService,
        recent_activity: recentActivity,
      },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load company mortgage summary", error: error.message });
  }
});

module.exports = router;
