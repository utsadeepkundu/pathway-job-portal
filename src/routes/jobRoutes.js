
const express = require("express");

const router = express.Router();

const {
  createJob,
  getJobs,
  moderateJob,
  getRecruiterJobs,
  getPendingJobs
} = require("../controllers/jobController");

const {
  applyToJob
} = require("../controllers/applicationController");

const {
  authenticateToken,
  authorizeRoles
} = require("../middleware/authMiddleware");

const { jobValidation } = require("../validators/jobValidators");
const { validateRequest } = require("../validators/authValidators");

// Public: browse approved jobs and internships
router.get("/", getJobs);

// Recruiters only: view their own job listings
router.get(
  "/mine",
  authenticateToken,
  authorizeRoles("recruiter"),
  getRecruiterJobs
);

// Admin only: view pending job and internship listings
router.get(
  "/moderation/pending",
  authenticateToken,
  authorizeRoles("admin"),
  getPendingJobs
);

// Recruiter only: create a job listing
router.post(
  "/",
  authenticateToken,
  authorizeRoles("recruiter"),
  jobValidation,
  validateRequest,
  createJob
);

// Admin only: approve or reject a pending listing
router.patch(
  "/:id/moderation",
  authenticateToken,
  authorizeRoles("admin"),
  moderateJob
);
// Students only: apply for a job or internship
router.post(
  "/:id/apply",
  authenticateToken,
  authorizeRoles("student"),
  applyToJob
);
module.exports = router;
