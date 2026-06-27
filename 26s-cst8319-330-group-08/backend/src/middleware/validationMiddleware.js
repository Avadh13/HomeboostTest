const normalizeString = (value) => (typeof value === "string" ? value.trim() : value);
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isValidName = (value) => /^[a-zA-Z\s'.-]+$/.test(value);
const isValidSlug = (value) => /^[a-z0-9-]+$/i.test(value);

const validateRegister = (req, res, next) => {
  const errors = [];
  const fullName = normalizeString(req.body.full_name);
  const email = normalizeString(req.body.email || "").toLowerCase();
  const password = req.body.password;
  const partnershipSlug = normalizeString(req.body.partnership_slug);

  if (!fullName || fullName.length < 2 || fullName.length > 100 || !isValidName(fullName)) {
    errors.push({ field: "full_name", message: "Full name must be 2-100 characters and contain only valid name characters" });
  }

  if (!email || !isValidEmail(email)) {
    errors.push({ field: "email", message: "A valid email address is required" });
  }

  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    errors.push({ field: "password", message: "Password must be between 8 and 128 characters" });
  }

  if (!partnershipSlug || partnershipSlug.length < 2 || partnershipSlug.length > 100 || !isValidSlug(partnershipSlug)) {
    errors.push({ field: "partnership_slug", message: "Partnership slug is required and may only contain letters, numbers, and hyphens" });
  }

  if (errors.length > 0) {
    return res.status(400).json({ status: "error", message: "Validation failed", errors });
  }

  req.body.full_name = fullName;
  req.body.email = email;
  req.body.partnership_slug = partnershipSlug;
  next();
};

const validateLogin = (req, res, next) => {
  const errors = [];
  const email = normalizeString(req.body.email || "").toLowerCase();
  const password = req.body.password;

  if (!email || !isValidEmail(email)) {
    errors.push({ field: "email", message: "A valid email address is required" });
  }

  if (typeof password !== "string" || password.length < 1 || password.length > 128) {
    errors.push({ field: "password", message: "Password is required" });
  }

  if (errors.length > 0) {
    return res.status(400).json({ status: "error", message: "Validation failed", errors });
  }

  req.body.email = email;
  next();
};

const handleValidationErrors = (req, res, next) => next();

module.exports = {
  validateRegister,
  validateLogin,
  handleValidationErrors,
};
