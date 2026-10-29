
const pool = require("../config/db");

// Create a job or internship listing
async function createJob(req, res) {
  try {
    const {
      title,
      description,
      listingType,
      location,
      workMode = "onsite",
      experienceLevel = "any",
      salaryMinInrAnnual,
      salaryMaxInrAnnual,
      stipendInrMonthly,
      skillsRequired,
      openings = 1,
      applicationDeadline
    } = req.body;

    // The recruiter ID comes from the verified JWT,
    // never from the request body.
    const recruiterId = req.user.id;

    const [result] = await pool.execute(
      `INSERT INTO jobs (
        recruiter_id,
        title,
        description,
        listing_type,
        location,
        work_mode,
        experience_level,
        salary_min_inr_annual,
        salary_max_inr_annual,
        stipend_inr_monthly,
        skills_required,
        openings,
        application_deadline
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recruiterId,
        title.trim(),
        description.trim(),
        listingType,
        location || null,
        workMode,
        experienceLevel,
        salaryMinInrAnnual ?? null,
        salaryMaxInrAnnual ?? null,
        stipendInrMonthly ?? null,
        skillsRequired || null,
        openings,
        applicationDeadline || null
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Job listing submitted for admin review",
      job: {
        id: result.insertId,
        recruiterId,
        title,
        listingType,
        status: "pending"
      }
    });
  } catch (error) {
    console.error("Job creation failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not create the job listing"
    });
  }
}


async function getJobs(req, res) {
  try {
    const {
      q,
      type,
      location,
      workMode,
      experienceLevel
    } = req.query;

    // Validate supported filters
    if (type && !["job", "internship"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be job or internship"
      });
    }

    if (
      workMode &&
      !["onsite", "hybrid", "remote"].includes(workMode)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid work mode"
      });
    }

    if (
      experienceLevel &&
      !["any", "entry", "junior", "mid", "senior"].includes(
        experienceLevel
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid experience level"
      });
    }

    // Limit page size to prevent unnecessarily large responses
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    );

    const offset = (page - 1) * limit;

    const conditions = [
      "j.status = 'approved'",
      "(j.application_deadline IS NULL OR j.application_deadline >= CURDATE())"
    ];

    const values = [];

    if (q && String(q).trim()) {
      const search = `%${String(q).trim()}%`;

      conditions.push(`(
        j.title LIKE ?
        OR j.description LIKE ?
        OR j.skills_required LIKE ?
        OR rp.company_name LIKE ?
      )`);

      values.push(search, search, search, search);
    }

    if (type) {
      conditions.push("j.listing_type = ?");
      values.push(type);
    }

    if (location) {
      conditions.push("j.location LIKE ?");
      values.push(`%${String(location).trim()}%`);
    }

    if (workMode) {
      conditions.push("j.work_mode = ?");
      values.push(workMode);
    }

    if (experienceLevel) {
      conditions.push("j.experience_level = ?");
      values.push(experienceLevel);
    }

    const whereClause = conditions.join(" AND ");

    // Get the total number of matching listings
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM jobs j
       INNER JOIN recruiter_profiles rp
         ON rp.user_id = j.recruiter_id
       WHERE ${whereClause}`,
      values
    );

    // Retrieve the current page of listings
    const [jobs] = await pool.execute(
      `SELECT
         j.id,
         j.title,
         j.description,
         j.listing_type AS listingType,
         j.location,
         j.work_mode AS workMode,
         j.experience_level AS experienceLevel,
         j.salary_min_inr_annual AS salaryMinInrAnnual,
         j.salary_max_inr_annual AS salaryMaxInrAnnual,
         j.stipend_inr_monthly AS stipendInrMonthly,
         j.skills_required AS skillsRequired,
         j.openings,
         j.application_deadline AS applicationDeadline,
         j.created_at AS createdAt,
         rp.company_name AS companyName,
         rp.company_website AS companyWebsite
       FROM jobs j
       INNER JOIN recruiter_profiles rp
         ON rp.user_id = j.recruiter_id
       WHERE ${whereClause}
       ORDER BY j.created_at DESC
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    const total = Number(countRows[0].total);

    return res.status(200).json({
      success: true,
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Fetching jobs failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve job listings"
    });
  }
}


async function moderateJob(req, res) {
  try {
    const jobId = Number(req.params.id);
    const { action, moderationNote } = req.body;

    // Validate the job ID
    if (!Number.isSafeInteger(jobId) || jobId < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid job ID"
      });
    }

    // Only approve or reject pending listings
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be approve or reject"
      });
    }

    if (
      moderationNote !== undefined &&
      (typeof moderationNote !== "string" ||
        moderationNote.length > 500)
    ) {
      return res.status(400).json({
        success: false,
        message: "Moderation note must be text of at most 500 characters"
      });
    }

    const [jobs] = await pool.execute(
      "SELECT id, status FROM jobs WHERE id = ? LIMIT 1",
      [jobId]
    );

    if (jobs.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Job listing not found"
      });
    }

    if (jobs[0].status !== "pending") {
      return res.status(409).json({
        success: false,
        message: "Only pending listings can be moderated"
      });
    }

    const newStatus = action === "approve" ? "approved" : "rejected";
    const note = moderationNote?.trim() || null;

    const [result] = await pool.execute(
      `UPDATE jobs
       SET status = ?, moderation_note = ?
       WHERE id = ? AND status = 'pending'`,
      [newStatus, note, jobId]
    );

    // Avoid reporting success if another request changed the listing.
    if (result.affectedRows === 0) {
      return res.status(409).json({
        success: false,
        message: "The listing has already been moderated"
      });
    }

    return res.status(200).json({
      success: true,
      message: `Job listing ${newStatus} successfully`,
      job: {
        id: jobId,
        status: newStatus,
        moderationNote: note
      }
    });
  } catch (error) {
    console.error("Job moderation failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not moderate the job listing"
    });
  }
}


async function getRecruiterJobs(req, res) {
  try {
    const recruiterId = req.user.id;

    const [jobs] = await pool.execute(
      `SELECT
         id,
         title,
         description,
         listing_type AS listingType,
         location,
         work_mode AS workMode,
         experience_level AS experienceLevel,
         salary_min_inr_annual AS salaryMinInrAnnual,
         salary_max_inr_annual AS salaryMaxInrAnnual,
         stipend_inr_monthly AS stipendInrMonthly,
         skills_required AS skillsRequired,
         openings,
         application_deadline AS applicationDeadline,
         status,
         moderation_note AS moderationNote,
         created_at AS createdAt
       FROM jobs
       WHERE recruiter_id = ?
       ORDER BY created_at DESC`,
      [recruiterId]
    );

    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (error) {
    console.error("Fetching recruiter jobs failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve your job listings"
    });
  }
}


async function getPendingJobs(req, res) {
  try {
    const [jobs] = await pool.execute(
      `SELECT
         j.id,
         j.title,
         j.description,
         j.listing_type AS listingType,
         j.location,
         j.work_mode AS workMode,
         j.experience_level AS experienceLevel,
         j.salary_min_inr_annual AS salaryMinInrAnnual,
         j.salary_max_inr_annual AS salaryMaxInrAnnual,
         j.stipend_inr_monthly AS stipendInrMonthly,
         j.skills_required AS skillsRequired,
         j.openings,
         j.application_deadline AS applicationDeadline,
         j.status,
         j.created_at AS createdAt,
         u.full_name AS recruiterName,
         u.email AS recruiterEmail,
         rp.company_name AS companyName
       FROM jobs j
       INNER JOIN users u ON u.id = j.recruiter_id
       LEFT JOIN recruiter_profiles rp ON rp.user_id = u.id
       WHERE j.status = 'pending'
       ORDER BY j.created_at ASC
       LIMIT 100`
    );

    return res.status(200).json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (error) {
    console.error("Fetching pending jobs failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve pending listings"
    });
  }
}

module.exports = {
  createJob,
  getJobs,
  moderateJob,
  getRecruiterJobs,
  getPendingJobs
};
