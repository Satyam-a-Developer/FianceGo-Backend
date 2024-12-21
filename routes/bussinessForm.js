const express = require("express");
const bcrypt = require("bcrypt");
const { z } = require("zod");
const BusinessForm = require('../models/BusinessForm')
const router = express.Router();
const jwt = require("jsonwebtoken");

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "secret";

// Zod schema validation
const businessFormSchema = z.object({
  businessName: z.string().min(3, "Business name must be at least 3 characters long"),
  period: z.string().min(3, "Period must be at least 3 characters long"),
  expectedIncome: z.string().min(0, "Expected income must be a positive number"), // Changed to number
  actualIncome: z.string().min(0, "Actual income must be a positive number"),     // Changed to number
  reason: z.string().min(3, "Reason must be at least 3 characters long"),
  category: z.string().min(3, "Category must be at least 3 characters long"),
});

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

router.get("/userData", authenticateToken, async (req, res, next) => {
  try {
    // The user object is available from the authenticateToken middleware
    const userId = req.user._id; // Assuming the token contains the user ID

    // Fetch user data from the database
    const userData = await bussinessForm.findById(userId);

    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    // Respond with the user data
    res.status(200).json({
      businessName: userData.businessName,
      period: userData.period,
      expectedIncome: userData.expectedIncome, // If the data was hashed, you can return the raw or hashed value
      actualIncome: userData.actualIncome, // Same for actual income
      reason: userData.reason,
      category: userData.category,
    });
  } catch (error) {
    next(error);
  }
});


router.post("/Form", async (req, res, next) => {
  try {
    // Parse and validate incoming request body
    const parsedData = businessFormSchema.parse(req.body);

    // Destructure the necessary fields from the parsed data
    const { businessName, period, expectedIncome, actualIncome, reason, category } = parsedData;

    // Check if the business already exists in the database
    const existingBusiness = await BusinessForm.findOne({ businessName });
    if (existingBusiness) {
      return res.status(400).json({ error: "Business with this name already exists" });
    }

    // Hash the incomes (if necessary, or store them as numbers)
    // If hashing is required for the incomes (e.g., for extra security), keep the logic
    const hashedactualIncome = await bcrypt.hash(String(actualIncome), SALT_ROUNDS);
    const hashedexpectedIncome = await bcrypt.hash(String(expectedIncome), SALT_ROUNDS);

    // Create a new business record
    const user = new BusinessForm({
      businessName,
      period,
      expectedIncome: hashedexpectedIncome,  // Or store actual number, if no hash is needed
      actualIncome: hashedactualIncome,      // Or store actual number, if no hash is needed
      reason,
      category,
    });

    // Save the new business record to the database
    await user.save();

    // Respond with a success message
    res.status(201).json({ message: "Business form submitted successfully" });
  } catch (error) {
    // Handle any errors that occur during the process
    next(error);
  }
});

module.exports = router;
