const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const resourceController = require("../controllers/resourceController");
const { recordResourceView } = require("../services/activityAnalyticsService");

router.use(protect);

router.get("/categories/list", resourceController.getResourceCategories);
router.get("/", resourceController.getResources);
router.get(
  "/:id",
  (req, res, next) => {
    res.on("finish", () => {
      if (res.statusCode !== 200 || req.user?.role !== "employee") return;

      recordResourceView({
        resourceId: Number(req.params.id),
        userId: req.user.id,
        partnershipId: req.user.partnership_id || null,
        resourceTitle: "Employee resource viewed",
      }).catch((error) => {
        console.error("Resource analytics failed:", error.message);
      });
    });

    next();
  },
  resourceController.getResourceById
);
router.post("/:id/bookmark", resourceController.bookmarkResource);
router.delete("/:id/bookmark", resourceController.unbookmarkResource);
router.post("/", resourceController.createResource);
router.put("/:id", resourceController.updateResource);
router.delete("/:id", resourceController.deleteResource);

module.exports = router;
