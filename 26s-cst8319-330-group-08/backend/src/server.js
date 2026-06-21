const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const resourceRoutes = require("./routes/resourceRoutes");
const userRoutes = require("./routes/userRoutes");
const cardRoutes = require("./routes/cardRoutes");
const hbtRoutes = require("./routes/hbtRoutes");
const pageRoutes = require("./routes/pageRoutes");
const sectionRoutes = require("./routes/sectionRoutes");
const pricingRoutes = require("./routes/pricingRoutes");
const contactRoutes = require("./routes/contactRoutes");
const faqRoutes = require("./routes/faqRoutes");
const quizRoutes = require("./routes/quizRoutes");
const teamMemberRoutes = require("./routes/teamMemberRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const employeePortalRoutes = require("./routes/employeePortalRoutes");
const partnershipRoutes = require("./routes/partnershipRoutes");
const eventRoutes = require("./routes/eventRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const adminPartnershipRoutes = require("./routes/adminPartnershipRoutes");
const publicPartnershipRoutes = require("./routes/publicPartnershipRoutes");
const messageRoutes = require("./routes/messageRoutes");
const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:5175",
  "http://127.0.0.1:8080",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.send("HomeBoost backend is running");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "success", message: "Backend API is working" });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    res.json({ status: "success", message: "Database connected successfully", result: rows[0].result });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Database connection failed", error: error.message });
  }
});

app.get("/api/test-tables", async (req, res) => {
  try {
    const [tables] = await pool.query("SHOW TABLES");
    res.json({ status: "success", message: "Tables loaded successfully", tables });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Could not load tables", error: error.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/users", userRoutes);
app.use("/api/pages", pageRoutes);
app.use("/api/sections", sectionRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/hbts", hbtRoutes);
app.use("/api/team-members", teamMemberRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/employee-portal", employeePortalRoutes);
app.use("/api/partnerships", partnershipRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/enrollment", enrollmentRoutes);
app.use("/api/admin-partnerships", adminPartnershipRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/public-partnerships", publicPartnershipRoutes);
app.use((req, res) => {
  res.status(404).json({ status: "error", message: "API route not found", path: req.originalUrl });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error.message);
  res.status(500).json({ status: "error", message: "Internal server error", error: error.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
