const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");
const {
  validateLogin,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, validateLogin, handleValidationErrors, authController.login);
router.get("/me", protect, authController.me);

module.exports = router;
