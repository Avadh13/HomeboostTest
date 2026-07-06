const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const resourceController = require("../controllers/resourceController");

router.use(protect);

router.get("/categories/list", resourceController.getResourceCategories);
router.get("/", resourceController.getResources);
router.get("/:id", resourceController.getResourceById);
router.post("/:id/bookmark", resourceController.bookmarkResource);
router.delete("/:id/bookmark", resourceController.unbookmarkResource);
router.post("/", resourceController.createResource);
router.put("/:id", resourceController.updateResource);
router.delete("/:id", resourceController.deleteResource);

module.exports = router;
