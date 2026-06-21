const express = require("express");
const fs = require("fs");
const multer = require("multer");

const {
  uploadEmployeesCsv,
  getEnrollmentBatches,
  revokeEnrollmentBatch,
} = require("../controllers/enrollmentController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();
const uploadDir = "uploads/csv/";

fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    const isCsv =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.toLowerCase().endsWith(".csv");

    if (!isCsv) {
      return callback(new Error("Only .csv files are allowed"));
    }

    return callback(null, true);
  },
});

router.post(
  "/partnership/:partnershipId/employees",
  protect,
  upload.single("file"),
  uploadEmployeesCsv
);

router.get("/batches", protect, getEnrollmentBatches);

router.put("/batches/:batchId/revoke", protect, revokeEnrollmentBatch);

module.exports = router;
