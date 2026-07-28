const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const protect = require("../middleware/authMiddleware");
const { requireRoles } = require("../middleware/roleMiddleware");
const { recordAuditEvent } = require("../services/auditLogService");

const router = express.Router();
const uploadsDir = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 10 },
});

const detectImageType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: "image/jpeg", extension: ".jpg" };
  }

  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.subarray(0, 8).equals(pngSignature)) {
    return { mime: "image/png", extension: ".png" };
  }

  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mime: "image/webp", extension: ".webp" };
  }

  return null;
};

const getBaseUrl = (req) => {
  if (process.env.PUBLIC_BACKEND_URL) return process.env.PUBLIC_BACKEND_URL.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
};

router.post(
  "/image",
  protect,
  requireRoles("admin", "super_admin", "hbt_admin"),
  upload.single("image"),
  async (req, res) => {
    let absolutePath = null;
    try {
      if (!req.file?.buffer?.length) {
        return res.status(400).json({ status: "error", message: "No image uploaded" });
      }

      const detected = detectImageType(req.file.buffer);
      if (!detected) {
        return res.status(415).json({
          status: "error",
          message: "Only valid JPEG, PNG, and WebP image files are allowed",
        });
      }

      const contentHash = crypto.createHash("sha256").update(req.file.buffer).digest("hex");
      const filename = `${crypto.randomUUID()}${detected.extension}`;
      absolutePath = path.join(uploadsDir, filename);
      if (path.dirname(absolutePath) !== uploadsDir) {
        return res.status(400).json({ status: "error", message: "Invalid upload path" });
      }

      await fs.promises.writeFile(absolutePath, req.file.buffer, { flag: "wx", mode: 0o640 });
      await recordAuditEvent({
        req,
        action: "image.uploaded",
        entityType: "uploaded_asset",
        entityId: filename,
        metadata: {
          mime_type: detected.mime,
          size_bytes: req.file.buffer.length,
          sha256: contentHash,
          original_filename: path.basename(String(req.file.originalname || "")).slice(0, 255),
        },
      });

      const relativeUrl = `/uploads/${filename}`;
      return res.status(201).json({
        status: "success",
        message: "Image uploaded successfully",
        image_url: `${getBaseUrl(req)}${relativeUrl}`,
        relative_url: relativeUrl,
        mime_type: detected.mime,
        size_bytes: req.file.buffer.length,
      });
    } catch (error) {
      if (absolutePath) {
        await fs.promises.unlink(absolutePath).catch(() => undefined);
      }
      return res.status(500).json({ status: "error", message: "Image upload failed" });
    }
  },
);

module.exports = router;
module.exports.detectImageType = detectImageType;
