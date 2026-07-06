const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = require("./config/db");
const { corsOptions } = require("./config/cors");
const { apiLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");
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
const profileRoutes = require("./routes/profileRoutes");
const footerRoutes = require("./routes/footerRoutes");
const mortgageServiceRoutes = require("./routes/mortgageServiceRoutes");
const serviceRequestRoutes = require("./routes/serviceRequestRoutes");
const employeePortalRoutes = require("./routes/employeePortalRoutes");
const partnershipRoutes = require("./routes/partnershipRoutes");
const eventRoutes = require("./routes/eventRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const adminPartnershipRoutes = require("./routes/adminPartnershipRoutes");
const publicPartnershipRoutes = require("./routes/publicPartnershipRoutes");
const hbtPartnershipRoutes = require("./routes/hbtPartnershipRoutes");
const messageRoutes = require("./routes/messageRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const advisorAvailabilityRoutes = require("./routes/advisorAvailabilityRoutes");
const companyManagerRoutes = require("./routes/companyManagerRoutes");
const companyMortgageRoutes = require("./routes/companyMortgageRoutes");
const leadProgressRoutes = require("./routes/leadProgressRoutes");
const hbtTaskRoutes = require("./routes/hbtTaskRoutes");
const readinessRoutes = require("./routes/readinessRoutes");
const leadPipelineRoutes = require("./routes/leadPipelineRoutes");
const resourceRecommendationRoutes = require("./routes/resourceRecommendationRoutes");
const companyAnalyticsRoutes = require("./routes/companyAnalyticsRoutes");
const documentRoutes = require("./routes/documentRoutes");
const automationRoutes = require("./routes/automationRoutes");
const hbtSignupRoutes = require("./routes/hbtSignupRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const courseRoutes = require("./routes/courseRoutes");
const journeyRoutes = require("./routes/journeyRoutes");

const app = express();
const uploadsDir = path.join(__dirname, "..", "uploads");
const isProduction = process.env.NODE_ENV === "production";
fs.mkdirSync(uploadsDir, { recursive: true });

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
app.use(cors(corsOptions));
app.use(apiLimiter);
app.post("/api/payments/stripe-webhook", express.raw({ type: "application/json" }), paymentRoutes.handleStripeWebhook);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use("/uploads", express.static(uploadsDir));

app.get("/", (req, res) => {
  res.send("HomeBoost backend is running");
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "success",
    message: "Backend API is working",
  });
});

if (!isProduction || process.env.ENABLE_DIAGNOSTIC_ROUTES === "true") {
  app.get("/api/test-db", async (req, res, next) => {
    try {
      const [rows] = await pool.query("SELECT 1 + 1 AS result");

      res.json({
        status: "success",
        message: "Database connected successfully",
        result: rows[0].result,
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/test-tables", async (req, res, next) => {
    try {
      const [tables] = await pool.query("SHOW TABLES");

      res.json({
        status: "success",
        message: "Tables loaded successfully",
        tables,
      });
    } catch (error) {
      next(error);
    }
  });
}

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
app.use("/api/profile", profileRoutes);
app.use("/api/footer", footerRoutes);
app.use("/api/mortgage-services", mortgageServiceRoutes);
app.use("/api/service-requests", serviceRequestRoutes);
app.use("/api/employee-portal", employeePortalRoutes);
app.use("/api/partnerships", partnershipRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/enrollment", enrollmentRoutes);
app.use("/api/admin-partnerships", adminPartnershipRoutes);
app.use("/api/hbt-partnerships", hbtPartnershipRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/public-partnerships", publicPartnershipRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/advisor-availability", advisorAvailabilityRoutes);
app.use("/api/company-manager", companyManagerRoutes);
app.use("/api/company-mortgage", companyMortgageRoutes);
app.use("/api/lead-progress", leadProgressRoutes);
app.use("/api/hbt-tasks", hbtTaskRoutes);
app.use("/api/readiness", readinessRoutes);
app.use("/api/lead-pipeline", leadPipelineRoutes);
app.use("/api/resource-recommendations", resourceRecommendationRoutes);
app.use("/api/company-analytics", companyAnalyticsRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/automation", automationRoutes);
app.use("/api/hbt-signup", hbtSignupRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/journeys", journeyRoutes);

app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "API route not found",
    path: req.originalUrl,
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
