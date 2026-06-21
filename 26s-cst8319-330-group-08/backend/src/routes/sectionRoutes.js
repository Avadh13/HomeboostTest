const express = require("express");
const router = express.Router();

const sectionController = require("../controllers/sectionController");

router.get("/", sectionController.getSections);
router.post("/", sectionController.createSection);
router.put("/:id", sectionController.updateSection);
router.delete("/:id", sectionController.deleteSection);

module.exports = router;