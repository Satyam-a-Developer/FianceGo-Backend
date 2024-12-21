const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

// Routes
const authRoutes = require("./routes/auth");
const healthRoutes = require("./routes/health");
const dashboardRoutes = require("./routes/dashboard");
const bussinessFormRoutes = require("./routes/bussinessForm");

// Constants
const PORT = process.env.PORT || 3003;
const MONGO_URI = process.env.MONGO_URI;

// Initialize Express app
const app = express();

// Middleware
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
const corsOptions = {
  origin: 'http://localhost:3000', // Only the origin, no paths
  credentials: true, // Allow credentials
};
app.use(cors(corsOptions));

// Handle Preflight Requests Globally (Optional but Recommended)
app.options('*', cors(corsOptions));

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};

// Use routes
app.use("/auth", authRoutes);
app.use("/health", healthRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/bussinessForm", bussinessFormRoutes);
// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
});
