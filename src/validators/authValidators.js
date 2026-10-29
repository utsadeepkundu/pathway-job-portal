
const { body, validationResult } = require("express-validator");

const registerValidation = [
  body("fullName")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must contain 2 to 100 characters"),

  body("email")
    .trim()
    .isEmail()
    .withMessage("Enter a valid email address")
    .normalizeEmail(),

  body("password")
    .isString()
    .isLength({ min: 8, max: 72 })
    .withMessage("Password must contain 8 to 72 characters"),

  body("role")
    .isIn(["student", "recruiter"])
    .withMessage("Role must be student or recruiter"),

  // Optional student profile fields
  body("phone")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ max: 20 })
    .withMessage("Phone number cannot exceed 20 characters"),

  body("university")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ max: 150 })
    .withMessage("University cannot exceed 150 characters"),

  body("degree")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ max: 150 })
    .withMessage("Degree cannot exceed 150 characters"),

  body("graduationYear")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({
      min: 1950,
      max: new Date().getFullYear() + 10
    })
    .withMessage("Enter a valid graduation year"),

  body("skills")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ max: 5000 })
    .withMessage("Skills cannot exceed 5000 characters"),

  body("resumeUrl")
    .optional({ nullable: true, checkFalsy: true })
    .isURL({ require_protocol: true })
    .withMessage("Resume URL must be a valid URL"),

  // Required for recruiter registration
  body("companyName")
    .if(body("role").equals("recruiter"))
    .trim()
    .notEmpty()
    .withMessage("Company name is required for recruiters")
    .bail()
    .isLength({ max: 150 })
    .withMessage("Company name cannot exceed 150 characters"),

  body("companyWebsite")
    .optional({ nullable: true, checkFalsy: true })
    .isURL({ require_protocol: true })
    .withMessage("Enter a valid company website URL"),

  body("companyDescription")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("Company description must be text"),

  body("companyLocation")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ max: 150 })
    .withMessage("Company location cannot exceed 150 characters"),

  body("contactPhone")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .isLength({ max: 20 })
    .withMessage("Contact phone cannot exceed 20 characters")
];


const loginValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Enter a valid email address")
    .normalizeEmail(),

  body("password")
    .isString()
    .notEmpty()
    .withMessage("Password is required")
];

function validateRequest(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg
      }))
    });
  }

  next();
}

module.exports = {
  registerValidation,
  loginValidation,
  validateRequest
};