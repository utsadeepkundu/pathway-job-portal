
const express = require("express");
const cors = require("cors");
const pool = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");

const app = express();

const allowedOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    }
  })
);
app.use(express.json());

// Health check: verify API and database
app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DATABASE() AS db, VERSION() AS version"
    );

    res.status(200).json({
      success: true,
      message: "Job Portal API is running",
      database: rows[0].db,
      mysqlVersion: rows[0].version
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);

    res.status(503).json({
      success: false,
      message: "Database connection failed"
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

module.exports = app;
