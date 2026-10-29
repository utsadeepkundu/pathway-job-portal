
require("dotenv").config();

const bcrypt = require("bcryptjs");
const pool = require("../src/config/db");

async function resetAdminPassword() {
  const password = process.env.ADMIN_RESET_PASSWORD;

  if (!password || password.length < 12) {
    throw new Error("The new password must be at least 12 characters.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [result] = await pool.execute(
    `UPDATE users
     SET password_hash = ?
     WHERE email = ? AND role = 'admin'`,
    [passwordHash, "admin.test001@example.com"]
  );

  if (result.affectedRows === 0) {
    throw new Error("Admin account not found.");
  }

  console.log("Admin password reset successfully.");
}

resetAdminPassword()
  .catch((error) => {
    console.error("Password reset failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
