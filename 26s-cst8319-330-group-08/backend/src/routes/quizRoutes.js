const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const quizController = require("../controllers/quizController");

const adminOrHbtOnly = (req, res, next) => {
  if (
    !req.user ||
    !["admin", "super_admin", "hbt_admin", "hbt_member"].includes(req.user.role)
  ) {
    return res.status(403).json({
      message: "Admin or HBT access required",
    });
  }

  next();
};

const adminOnly = (req, res, next) => {
  if (
    !req.user ||
    !["admin", "super_admin"].includes(req.user.role)
  ) {
    return res.status(403).json({
      message: "Admin access required",
    });
  }

  next();
};

/*
  Quiz submissions:
  - Admin/Super Admin can see all submissions
  - HBT Admin can see only submissions from partnerships assigned to their team
*/
router.get(
  "/submissions",
  authMiddleware,
  adminOrHbtOnly,
  quizController.getQuizSubmissions
);

router.get(
  "/submissions/:id",
  authMiddleware,
  adminOrHbtOnly,
  quizController.getQuizSubmissionDetails
);

router.put(
  "/submissions/:id/follow-up-status",
  authMiddleware,
  adminOrHbtOnly,
  quizController.updateQuizSubmissionFollowUpStatus
);

/*
  Public/employee quiz reading
*/
router.get("/", quizController.getQuizzes);

router.get("/:quizId/questions", quizController.getQuizQuestions);

/*
  Admin quiz management
*/
router.post("/", authMiddleware, adminOnly, quizController.createQuiz);
router.put("/:id", authMiddleware, adminOnly, quizController.updateQuiz);
router.delete("/:id", authMiddleware, adminOnly, quizController.deleteQuiz);

router.post(
  "/questions",
  authMiddleware,
  adminOnly,
  quizController.createQuizQuestion
);

router.put(
  "/questions/:id",
  authMiddleware,
  adminOnly,
  quizController.updateQuizQuestion
);

router.delete(
  "/questions/:id",
  authMiddleware,
  adminOnly,
  quizController.deleteQuizQuestion
);

router.post(
  "/options",
  authMiddleware,
  adminOnly,
  quizController.createQuizOption
);

router.put(
  "/options/:id",
  authMiddleware,
  adminOnly,
  quizController.updateQuizOption
);

router.delete(
  "/options/:id",
  authMiddleware,
  adminOnly,
  quizController.deleteQuizOption
);

/*
  Employee quiz submit
*/
router.post("/submit", authMiddleware, quizController.submitQuiz);

module.exports = router;