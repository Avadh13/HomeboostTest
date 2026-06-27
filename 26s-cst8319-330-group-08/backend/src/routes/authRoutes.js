const express = require("express");
const router = express.Router();

const authController = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimiter");
const {
  validateRegister,
  validateLogin,
  handleValidationErrors,
} = require("../middleware/validationMiddleware");

router.post("/register", authLimiter, validateRegister, handleValidationErrors, authController.register);
router.post("/login", authLimiter, validateLogin, handleValidationErrors, authController.login);
router.get("/me", protect, authController.me);

module.exports = router;
