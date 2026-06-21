const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const employeePortalController = require("../controllers/employeePortalController");

router.get("/", protect, employeePortalController.getEmployeePortalData);

module.exports = router;