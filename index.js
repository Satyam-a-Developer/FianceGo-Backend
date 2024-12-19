const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { z } = require('zod');
require('dotenv').config();

// Constants
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_URI = process.env.MONGO_URI;
const PORT = process.env.PORT || 3003;
const SALT_ROUNDS = 10;

// Initialize Express app
const app = express();

// Middleware
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(cors());

// MongoDB Connection
const connectDB = async (retries = 5) => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    if (retries > 0) {
      console.log(`MongoDB connection failed. Retrying... (${retries} attempts left)`);
      setTimeout(() => connectDB(retries - 1), 5000);
    } else {
      console.error('❌ MongoDB connection failed after all retries:', error);
      process.exit(1);
    }
  }
};

// User Schema
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);


const User = mongoose.model('User', userSchema);

// Validation Schemas
const userSchemaRegister = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

const loginSchema = z.object({
  username: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

// Middleware for async error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Register endpoint
app.post("/register", asyncHandler(async (req, res) => {
  try {
    const parsedData = userSchemaRegister.parse(req.body);
    const { username, email, password } = parsedData;

    // Check for existing user
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }

    if (error.code === 11000) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}));

// Login endpoint
app.post('/login', asyncHandler(async (req, res) => {
  try {
    const parsedData = loginSchema.parse(req.body);
    const { email, username, password } = parsedData;

    if (!email && !username) {
      return res.status(400).json({ error: "Email or username is required" });
    }

    const user = await User.findOne({
      $or: [{ email }, { username }],
    }).select('+password');

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      error: `${duplicateField.charAt(0).toUpperCase() + duplicateField.slice(1)} already exists.`,
    });
  }

  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
});

// Connect to database and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(false, () => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});
