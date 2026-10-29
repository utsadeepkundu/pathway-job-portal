
const { body } = require("express-validator");

const jobValidation = [
  // Job title
  body("title")
    .isString()
    .withMessage("Job title must be text")
    .bail()
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage("Job title must contain 3 to 150 characters"),

  // Job description
  body("description")
    .isString()
    .withMessage("Description must be text")
    .bail()
    .trim()
    .isLength({ min: 20 })
    .withMessage("Description must contain at least 20 characters"),

  // Job or internship
  body("listingType")
    .isIn(["job", "internship"])
    .withMessage("Listing type must be job or internship"),

  // Optional location
  body("location")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("Location must be text")
    .bail()
    .trim()
    .isLength({ max: 150 })
    .withMessage("Location cannot exceed 150 characters"),

  // Work mode
  body("workMode")
    .optional()
    .isIn(["onsite", "hybrid", "remote"])
    .withMessage("Work mode must be onsite, hybrid or remote"),

  // Required experience
  body("experienceLevel")
    .optional()
    .isIn(["any", "entry", "junior", "mid", "senior"])
    .withMessage("Invalid experience level"),

  // Minimum annual salary for jobs
  body("salaryMinInrAnnual")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage("Minimum annual salary must be a non-negative number"),

  // Maximum annual salary for jobs
  body("salaryMaxInrAnnual")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage("Maximum annual salary must be a non-negative number")
    .bail()
    .custom((value, { req }) => {
      const minimum = req.body.salaryMinInrAnnual;

      if (
        minimum !== undefined &&
        minimum !== null &&
        minimum !== "" &&
        Number(value) < Number(minimum)
      ) {
        throw new Error(
          "Maximum salary cannot be lower than minimum salary"
        );
      }

      return true;
    }),

  // Monthly internship stipend
  body("stipendInrMonthly")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage("Monthly stipend must be a non-negative number"),

  // Required number of openings
  body("openings")
    .optional()
    .isInt({ min: 1, max: 65535 })
    .withMessage("Openings must be an integer between 1 and 65535"),

  // Application deadline
  body("applicationDeadline")
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601({ strict: true })
    .withMessage("Application deadline must be a valid date (YYYY-MM-DD)"),

  // Required skills
  body("skillsRequired")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("Required skills must be text")
    .bail()
    .isLength({ max: 5000 })
    .withMessage("Required skills cannot exceed 5000 characters")
];

module.exports = {
  jobValidation
};
