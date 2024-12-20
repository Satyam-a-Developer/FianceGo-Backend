const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify JWT token from cookies
const authenticateToken = (req, res, next) => {
  const token = req.cookies.authToken; // Extract the token from the cookie

  if (!token) {
    return res.status(401).json({ error: "Access token is required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    req.user = user; // Attach the decoded token to the request object
    next();
  });
};

// Dashboard endpoint
router.get("/", authenticateToken, (req, res) => {
  const username = req.user.username; // Fetch username from the token payload

  console.log("Authenticated username:", username); // Log the username to the console
  
  res.status(200).json({
    message: "Welcome to your dashboard",
    user: req.user, // Send the user data back in the response
  });
});

module.exports = router;
