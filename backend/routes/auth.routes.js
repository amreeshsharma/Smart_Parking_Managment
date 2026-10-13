// routes/auth.routes.js - User registration and authentication handlers
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const pool = require('../config/db');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { ok, fail } = require('../utils/response');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'parksmart-default-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/**
 * Validation rules for registration
 */
const registerRules = [
  body('Name')
    .trim()
    .notEmpty().withMessage('Name is required.')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters.'),
  body('Email')
    .trim()
    .notEmpty().withMessage('Email address is required.')
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),
  body('Phone')
    .trim()
    .matches(/^[0-9]{10}$/).withMessage('Phone number must be exactly 10 digits.'),
  body('Password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters.')
];

/**
 * POST /api/auth/register - Register a new Driver account
 */
router.post('/register', registerRules, validate, asyncHandler(async (req, res) => {
  const { Name, Email, Phone, Password } = req.body;

  // Check if email already exists in users
  const [existing] = await pool.query('SELECT User_ID FROM users WHERE Email = ?', [Email]);
  if (existing.length > 0) {
    return fail(res, 409, 'An account with this email address already exists.');
  }

  // Hash password using bcrypt (cost 10)
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(Password, salt);

  // Insert into users table with default Role 'User'
  const [result] = await pool.query(
    'INSERT INTO users (Name, Email, Phone, Password, Role) VALUES (?, ?, ?, ?, ?)',
    [Name, Email, Phone, hashedPassword, 'User']
  );

  const userId = result.insertId;
  const user = {
    User_ID: userId,
    Name,
    Email,
    Phone,
    Role: 'User'
  };

  // Generate JWT token
  const token = jwt.sign({ id: userId, role: 'User' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return ok(res, { user, token }, 'Registration successful! Welcome to ParkSmart.', 201);
}));

/**
 * Validation rules for login
 */
const loginRules = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please provide a valid email address.'),
  body('password')
    .notEmpty().withMessage('Password is required.'),
  body('role')
    .optional()
    .isIn(['User', 'Admin']).withMessage('Role must be either User or Admin.')
];

/**
 * POST /api/auth/login - Authenticate Driver or Administrator
 */
router.post('/login', loginRules, validate, asyncHandler(async (req, res) => {
  const { email, password, role = 'User' } = req.body;
  const cleanEmail = email.trim().toLowerCase();

  if (role === 'Admin') {
    // Look up in admin table
    const [rows] = await pool.query(
      'SELECT Admin_ID, Name, Email, Password, Lot_ID FROM admin WHERE LOWER(Email) = ?',
      [cleanEmail]
    );

    if (rows.length === 0) {
      return fail(res, 401, 'Invalid credentials');
    }

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.Password);
    if (!isMatch) {
      return fail(res, 401, 'Invalid credentials');
    }

    const adminUser = {
      Admin_ID: admin.Admin_ID,
      User_ID: admin.Admin_ID,
      Name: admin.Name,
      Email: admin.Email,
      Role: 'Admin',
      Lot_ID: admin.Lot_ID
    };

    const token = jwt.sign(
      { id: admin.Admin_ID, role: 'Admin', lotId: admin.Lot_ID },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return ok(res, { user: adminUser, token }, `Welcome back, ${admin.Name}!`);
  } else {
    // Look up in users table
    const [rows] = await pool.query(
      'SELECT User_ID, Name, Email, Phone, Password, Role FROM users WHERE LOWER(Email) = ?',
      [cleanEmail]
    );

    if (rows.length === 0) {
      return fail(res, 401, 'Invalid credentials');
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.Password);
    if (!isMatch) {
      return fail(res, 401, 'Invalid credentials');
    }

    const userSafe = {
      User_ID: user.User_ID,
      Name: user.Name,
      Email: user.Email,
      Phone: user.Phone,
      Role: user.Role
    };

    const token = jwt.sign(
      { id: user.User_ID, role: user.Role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return ok(res, { user: userSafe, token }, `Welcome back, ${user.Name}!`);
  }
}));

module.exports = router;
