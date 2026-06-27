const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const advisorAvailabilityController = require("../controllers/advisorAvailabilityController");

router.use(protect);

router.get("/", advisorAvailabilityController.getTeamAvailability);
router.put("/:teamMemberId", advisorAvailabilityController.saveAvailability);
router.post("/time-off", advisorAvailabilityController.addTimeOff);
router.delete("/time-off/:id", advisorAvailabilityController.deleteTimeOff);

module.exports = router;
