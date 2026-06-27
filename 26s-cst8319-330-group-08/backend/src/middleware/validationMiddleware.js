const { body, validationResult } = require("express-validator");

const normalizeString = (value) => (typeof value === "string" ? value.trim() : value);

const validateRegister = [
  body("full_name")
    .customSanitizer(normalizeString)
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s'.-]+$/)
    .withMessage("Full name contains invalid characters"),
  body("email")
    .customSanitizer(normalizeString)
    .isEmail()
    .withMessage("A valid email address is required")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8 and 128 characters"),
  body("partnership_slug")
    .customSanitizer(normalizeString)
    .isLength({ min: 2, max: 100 })
    .withMessage("Partnership slug is required")
    .matches(/^[a-z0-9-]+$/i)
    .withMessage("Partnership slug contains invalid characters"),
];

const validateLogin = [
  body("email")
    .customSanitizer(normalizeString)
    .isEmail()
    .withMessage("A valid email address is required")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 1, max: 128 })
    .withMessage("Password is required"),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  handleValidationErrors,
};
