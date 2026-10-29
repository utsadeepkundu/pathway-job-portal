
const express = require("express");

const router = express.Router();

const {
  authenticateToken,
  authorizeRoles
} = require("../middleware/authMiddleware");

const {
  getApplications,
  updateApplicationStatus
} = require("../controllers/applicationController");

// View applications permitted for the authenticated user
router.get(
  "/",
  authenticateToken,
  getApplications
);

// Recruiters and admins can update application status
router.patch(
  "/:id/status",
  authenticateToken,
  authorizeRoles("recruiter", "admin"),
  updateApplicationStatus
);

module.exports = router;
