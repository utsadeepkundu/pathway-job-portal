
const pool = require("../config/db");

// Student applies for an approved job or internship
async function applyToJob(req, res) {
  try {
    const jobId = Number(req.params.id);
    const studentId = req.user.id;

    const { coverLetter, resumeUrl } = req.body;

    if (!Number.isSafeInteger(jobId) || jobId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID"
      });
    }

    if (
      coverLetter !== undefined &&
      coverLetter !== null &&
      (
        typeof coverLetter !== "string" ||
        coverLetter.length > 5000
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Cover letter must be text of at most 5000 characters"
      });
    }

    if (
      resumeUrl !== undefined &&
      resumeUrl !== null &&
      resumeUrl !== ""
    ) {
      if (typeof resumeUrl !== "string" || resumeUrl.length > 500) {
        return res.status(400).json({
          success: false,
          message: "Resume URL must be text of at most 500 characters"
        });
      }

      try {
        const parsedUrl = new URL(resumeUrl);

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          throw new Error("Unsupported URL protocol");
        }
      } catch {
        return res.status(400).json({
          success: false,
          message: "Enter a valid resume URL"
        });
      }
    }

    // Only approved, non-expired listings accept applications
    const [jobs] = await pool.execute(
      `SELECT id, title
       FROM jobs
       WHERE id = ?
         AND status = 'approved'
         AND (
           application_deadline IS NULL
           OR application_deadline >= CURDATE()
         )
       LIMIT 1`,
      [jobId]
    );

    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "This listing is unavailable or no longer accepting applications"
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO applications
        (student_id, job_id, cover_letter, resume_url)
       VALUES (?, ?, ?, ?)`,
      [
        studentId,
        jobId,
        coverLetter?.trim() || null,
        resumeUrl || null
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      application: {
        id: result.insertId,
        jobId,
        jobTitle: jobs[0].title,
        status: "submitted"
      }
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "You have already applied to this listing"
      });
    }

    console.error("Application submission failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not submit application"
    });
  }
}

// Retrieve applications based on the logged-in user's role
async function getApplications(req, res) {
  try {
    let condition = "";
    const values = [];

    if (req.user.role === "student") {
      // Students can see only their own applications
      condition = "WHERE a.student_id = ?";
      values.push(req.user.id);
    } else if (req.user.role === "recruiter") {
      // Recruiters can see applications for their own listings
      condition = "WHERE j.recruiter_id = ?";
      values.push(req.user.id);
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view applications"
      });
    }

    const [applications] = await pool.execute(
      `SELECT
         a.id,
         a.student_id AS studentId,
         a.job_id AS jobId,
         a.cover_letter AS coverLetter,
         a.resume_url AS resumeUrl,
         a.status,
         a.applied_at AS appliedAt,
         a.updated_at AS updatedAt,
         j.title AS jobTitle,
         j.listing_type AS listingType,
         j.location,
         j.work_mode AS workMode,
         rp.company_name AS companyName,
         u.full_name AS studentName,
         u.email AS studentEmail
       FROM applications a
       INNER JOIN jobs j
         ON j.id = a.job_id
       INNER JOIN users u
         ON u.id = a.student_id
       LEFT JOIN recruiter_profiles rp
         ON rp.user_id = j.recruiter_id
       ${condition}
       ORDER BY a.applied_at DESC`,
      values
    );

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    console.error("Fetching applications failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve applications"
    });
  }
}


async function updateApplicationStatus(req, res) {
  try {
    const applicationId = Number(req.params.id);
    const { status } = req.body;

    if (
      !Number.isSafeInteger(applicationId) ||
      applicationId < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid application ID"
      });
    }

    const allowedStatuses = [
      "reviewing",
      "shortlisted",
      "rejected",
      "accepted"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${allowedStatuses.join(", ")}`
      });
    }

    // Find the application and its listing owner
    const [applications] = await pool.execute(
      `SELECT
         a.id,
         a.status,
         j.recruiter_id AS recruiterId
       FROM applications a
       INNER JOIN jobs j ON j.id = a.job_id
       WHERE a.id = ?
       LIMIT 1`,
      [applicationId]
    );

    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Application not found"
      });
    }

    const application = applications[0];

    // Recruiters may modify only applications for their own listings.
    // Admins may manage applications across the portal.
    if (
      req.user.role === "recruiter" &&
      application.recruiterId !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "You cannot manage applications for another recruiter's listing"
      });
    }

    if (!["recruiter", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update application status"
      });
    }

    if (application.status === "withdrawn") {
      return res.status(409).json({
        success: false,
        message: "A withdrawn application cannot be updated"
      });
    }

    await pool.execute(
      `UPDATE applications
       SET status = ?
       WHERE id = ?`,
      [status, applicationId]
    );

    return res.status(200).json({
      success: true,
      message: "Application status updated successfully",
      application: {
        id: applicationId,
        status
      }
    });
  } catch (error) {
    console.error("Application status update failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not update application status"
    });
  }
}

module.exports = {
  applyToJob,
  getApplications,
  updateApplicationStatus
};
