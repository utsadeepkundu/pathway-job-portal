
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// Register a student or recruiter
async function register(req, res) {
  let connection;

  try {
    const {
      fullName,
      email,
      password,
      role,
      phone,
      university,
      degree,
      graduationYear,
      skills,
      resumeUrl,
      companyName,
      companyWebsite,
      companyDescription,
      companyLocation,
      contactPhone
    } = req.body;

    const passwordHash = await bcrypt.hash(password, 12);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [userResult] = await connection.execute(
      `INSERT INTO users
        (full_name, email, password_hash, role)
       VALUES (?, ?, ?, ?)`,
      [fullName, email, passwordHash, role]
    );

    const userId = userResult.insertId;

    if (role === "student") {
      await connection.execute(
        `INSERT INTO student_profiles
          (user_id, phone, university, degree,
           graduation_year, skills, resume_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          phone || null,
          university || null,
          degree || null,
          graduationYear || null,
          skills || null,
          resumeUrl || null
        ]
      );
    } else if (role === "recruiter") {
      await connection.execute(
        `INSERT INTO recruiter_profiles
          (user_id, company_name, company_website,
           company_description, company_location,
           contact_phone)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          companyName.trim(),
          companyWebsite || null,
          companyDescription || null,
          companyLocation || null,
          contactPhone || null
        ]
      );
    } else {
      throw new Error("Unsupported registration role");
    }

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      user: {
        id: userId,
        fullName,
        email,
        role
      }
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Transaction rollback failed");
      }
    }

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists"
      });
    }

    console.error("Registration failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Registration failed due to a server error"
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Login a registered user
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from the environment");

      return res.status(500).json({
        success: false,
        message: "Authentication service is not configured"
      });
    }

    const [rows] = await pool.execute(
      `SELECT id, full_name, email, password_hash, role, is_active
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    const user = rows[0];

    // Use a generic response to avoid revealing whether an email exists
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || "1h";

    const accessToken = jwt.sign(
      {
        id: user.id,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      tokenType: "Bearer",
      expiresIn,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed due to a server error"
    });
  }
}


async function getProfile(req, res) {
  try {
    // Confirm that the account still exists and is active
    const [users] = await pool.execute(
      `SELECT id, full_name, email, role, created_at
       FROM users
       WHERE id = ? AND is_active = TRUE
       LIMIT 1`,
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User account not found or inactive"
      });
    }

    const user = users[0];
    let profile = null;

    if (user.role === "student") {
      const [profiles] = await pool.execute(
        `SELECT phone, university, degree, graduation_year,
                skills, resume_url
         FROM student_profiles
         WHERE user_id = ?`,
        [user.id]
      );

      profile = profiles[0] || null;
    } else if (user.role === "recruiter") {
      const [profiles] = await pool.execute(
        `SELECT company_name, company_website,
                company_description, company_location,
                contact_phone
         FROM recruiter_profiles
         WHERE user_id = ?`,
        [user.id]
      );

      profile = profiles[0] || null;
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at
      },
      profile
    });
  } catch (error) {
    console.error("Profile retrieval failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not retrieve profile"
    });
  }
}

module.exports = {
  register,
  login,
  getProfile
};
