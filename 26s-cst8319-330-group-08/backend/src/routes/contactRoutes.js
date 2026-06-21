const express = require("express");
const router = express.Router();

const contactController = require("../controllers/contactController");

router.post("/", contactController.createContactMessage);
router.get("/", contactController.getContactMessages);
router.put("/:id/read", contactController.markMessageRead);
router.delete("/:id", contactController.deleteContactMessage);

module.exports = router;