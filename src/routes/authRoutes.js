
const express = require("express");

const router = express.Router();

const {
  register,
  login,
  getProfile
} = require("../controllers/authController");

const {
  registerValidation,
  loginValidation,
  validateRequest
} = require("../validators/authValidators");

const {
  authenticateToken
} = require("../middleware/authMiddleware");

// Registration
router.post(
  "/register",
  registerValidation,
  validateRequest,
  register
);

// Login
router.post(
  "/login",
  loginValidation,
  validateRequest,
  login
);

// Get the authenticated user's profile
router.get(
  "/me",
  authenticateToken,
  getProfile
);

module.exports = router;
