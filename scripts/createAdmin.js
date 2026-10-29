
require("dotenv").config();

const bcrypt = require("bcryptjs");
const pool = require("../src/config/db");

async function createAdmin() {
  const name = process.env.TEMP_ADMIN_NAME;
  const email = process.env.TEMP_ADMIN_EMAIL;
  const password = process.env.TEMP_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      "Set TEMP_ADMIN_NAME, TEMP_ADMIN_EMAIL, and TEMP_ADMIN_PASSWORD in .env first."
    );
  }

  if (password.length < 12) {
    throw new Error("Admin password must be at least 12 characters.");
  }

  const [existingUsers] = await pool.execute(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  if (existingUsers.length > 0) {
    throw new Error(
      "An account with this email already exists. Choose a different admin email."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [result] = await pool.execute(
    `INSERT INTO users (full_name, email, password_hash, role)
     VALUES (?, ?, ?, 'admin')`,
    [name, email, passwordHash]
  );

  console.log("Admin account created successfully.");
  console.log("Admin ID:", result.insertId);
  console.log("Admin email:", email);
  console.log("Role: admin");
  console.log("Password stored as a bcrypt hash.");
}

createAdmin()
  .catch((error) => {
    console.error("Admin creation failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
