const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const protect = require("../middleware/authMiddleware");
const { requireRoles } = require("../middleware/roleMiddleware");

const router = express.Router();
const uploadsDir = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname || "").toLowerCase();
  if (allowedMimeTypes.has(file.mimetype) && allowedExtensions.has(extension)) {
    return cb(null, true);
  }
  return cb(new Error("Only JPG, PNG, and WebP image files are allowed"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

const getBaseUrl = (req) => {
  if (process.env.PUBLIC_BACKEND_URL) return process.env.PUBLIC_BACKEND_URL.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
};

router.post(
  "/image",
  protect,
  requireRoles("admin", "super_admin", "hbt_admin"),
  upload.single("image"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ status: "error", message: "No image uploaded" });
    }

    const relativeUrl = `/uploads/${req.file.filename}`;
    return res.status(201).json({
      status: "success",
      message: "Image uploaded successfully",
      image_url: `${getBaseUrl(req)}${relativeUrl}`,
      relative_url: relativeUrl,
    });
  },
);

module.exports = router;
