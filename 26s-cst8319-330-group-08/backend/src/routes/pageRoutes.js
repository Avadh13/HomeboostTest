const express = require("express");
const router = express.Router();


const pageController = require("../controllers/pageController");

router.get("/", pageController.getPages);
router.put("/:id", pageController.updatePage);
router.get("/:slug", pageController.getPageBySlug);
module.exports = router;