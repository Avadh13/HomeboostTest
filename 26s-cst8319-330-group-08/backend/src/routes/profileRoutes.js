const express = require("express");
const pool = require("../config/db");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

const normalizeText = (value, max = 255) => String(value || "").trim().slice(0, max);
const normalizeNullableText = (value, max = 255) => {
  const clean = normalizeText(value, max);
  return clean || null;
};
const normalizeUrl = (value) => {
  const clean = normalizeText(value, 1000);
  if (!clean) return null;
  if (clean.startsWith("/uploads/")) return clean;
  if (/^https?:\/\//i.test(clean)) return clean;
  return null;
};

const getProfileById = async (userId) => {
  const [[profile]] = await pool.query(
    `SELECT
      u.id,
      u.full_name,
      u.email,
      u.role,
      u.team_id,
      u.partnership_id,
      u.phone,
      u.job_title,
      u.address,
      u.city,
      u.province,
      u.postal_code,
      u.bio,
      u.photo_url,
      u.last_seen_at,
      u.is_active,
      h.name AS team_name,
      e.name AS employer_name,
      p.slug AS partnership_slug
     FROM users u
     LEFT JOIN home_buying_teams h ON u.team_id = h.id
     LEFT JOIN partnerships p ON u.partnership_id = p.id
     LEFT JOIN employers e ON p.employer_id = e.id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );

  return profile || null;
};

router.get("/me", protect, async (req, res) => {
  try {
    const profile = await getProfileById(req.user.id);

    if (!profile) {
      return res.status(404).json({ status: "error", message: "Profile not found" });
    }

    return res.json({ status: "success", profile });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to load profile", error: error.message });
  }
});

router.put("/me", protect, async (req, res) => {
  try {
    const fullName = normalizeText(req.body.full_name, 255);
    const phone = normalizeNullableText(req.body.phone, 40);
    const jobTitle = normalizeNullableText(req.body.job_title, 120);
    const address = normalizeNullableText(req.body.address, 255);
    const city = normalizeNullableText(req.body.city, 120);
    const province = normalizeNullableText(req.body.province, 120);
    const postalCode = normalizeNullableText(req.body.postal_code, 40);
    const bio = normalizeNullableText(req.body.bio, 1000);
    const photoUrl = normalizeUrl(req.body.photo_url);

    if (!fullName) {
      return res.status(400).json({ status: "error", message: "Full name is required" });
    }

    if (req.body.photo_url && !photoUrl) {
      return res.status(400).json({ status: "error", message: "Photo URL must be an uploaded image or valid http(s) URL" });
    }

    await pool.query(
      `UPDATE users
       SET
        full_name = ?,
        phone = ?,
        job_title = ?,
        address = ?,
        city = ?,
        province = ?,
        postal_code = ?,
        bio = ?,
        photo_url = ?
       WHERE id = ?`,
      [fullName, phone, jobTitle, address, city, province, postalCode, bio, photoUrl, req.user.id]
    );

    await pool.query(
      `UPDATE team_members
       SET photo_url = COALESCE(?, photo_url), title = COALESCE(?, title)
       WHERE user_id = ?`,
      [photoUrl, jobTitle, req.user.id]
    );

    const profile = await getProfileById(req.user.id);

    return res.json({
      status: "success",
      message: "Profile updated successfully",
      profile,
      user: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
        team_id: profile.team_id,
        partnership_id: profile.partnership_id,
        is_active: profile.is_active,
        team_name: profile.team_name,
        employer_name: profile.employer_name,
        partnership_slug: profile.partnership_slug,
        photo_url: profile.photo_url,
      },
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Failed to update profile", error: error.message });
  }
});

module.exports = router;
