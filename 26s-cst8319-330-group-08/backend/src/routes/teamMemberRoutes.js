const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const teamMemberController = require("../controllers/teamMemberController");

const hbtAdminOrAdminOnly = (req, res, next) => {
  if (
    !req.user ||
    !["admin", "super_admin", "hbt_admin"].includes(req.user.role)
  ) {
    return res.status(403).json({
      message: "Admin or HBT Admin access required",
    });
  }

  next();
};

const hbtAccessOnly = (req, res, next) => {
  if (
    !req.user ||
    !["admin", "super_admin", "hbt_admin", "hbt_member"].includes(req.user.role)
  ) {
    return res.status(403).json({
      message: "HBT access required",
    });
  }

  next();
};

/*
  HBT Team Members
  - Admin/Super Admin can manage all team members
  - HBT Admin can manage only their own team members
*/
router.get("/", protect, hbtAdminOrAdminOnly, teamMemberController.getTeamMembers);

router.post("/", protect, hbtAdminOrAdminOnly, teamMemberController.createTeamMember);

router.put("/:id", protect, hbtAdminOrAdminOnly, teamMemberController.updateTeamMember);

router.delete("/:id", protect, hbtAdminOrAdminOnly, teamMemberController.deleteTeamMember);

/*
  Public/team listing should still be protected.
  Admin can view any team.
  HBT Admin/Member should only view their own team.
*/
router.get(
  "/team/:teamId",
  protect,
  hbtAccessOnly,
  teamMemberController.getTeamMembersByTeam
);

module.exports = router;