const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const User = require("../models/User");
const cors = require("cors");
const app = express();

const allowedOrigins = ['http://localhost:3000'];  // Your frontend origin

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {  // Allow requests from your frontend
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,  // Allow cookies to be sent
};

// Use CORS middleware with the options
app.use(cors(corsOptions));

// Your routes and middleware
app.use(express.json());


const router = express.Router();
const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;

// Validation Schemas
const userSchemaRegister = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

const loginSchema = z.object({
  username: z.string().optional(),
  email: z.string().email("Invalid email address").optional(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

// Register endpoint
router.post("/register", async (req, res, next) => {
  try {
    const parsedData = userSchemaRegister.parse(req.body);
    const { username, email, password } = parsedData;

    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    next(error);
  }
});

// Login endpoint
// Login endpoint
router.post("/login", async (req, res, next) => {
  try {
    const parsedData = loginSchema.parse(req.body);
    const { email, username, password } = parsedData;

    if (!email && !username) {
      return res.status(400).json({ error: "Email or username is required" });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [{ email }, { username }],
    }).select("+password"); // Ensure password is selected

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    // Save the token in a secure, HttpOnly cookie
    res.cookie("authToken", token, {
      httpOnly: true, // Prevent JavaScript from accessing the cookie
      secure: process.env.NODE_ENV === "production", // Ensure secure cookies in production
      sameSite: "strict", // Protect from CSRF
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Respond with the user details and message
    res.json({
      message: "Login successful",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});


module.exports = router;
