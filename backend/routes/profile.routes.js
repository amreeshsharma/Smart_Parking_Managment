// routes/profile.routes.js - Driver & Admin profile details and password modification
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, param } = require('express-validator');
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { ok, fail } = require('../utils/response');

router.use(verifyToken);

/**
 * Shared profile fetch logic
 */
async function fetchUserProfile(userId, role) {
  if (role.toLowerCase() === 'admin') {
    const [rows] = await pool.query(
      'SELECT Admin_ID AS User_ID, Admin_ID, Name, Email, Lot_ID, "Admin" AS Role FROM admin WHERE Admin_ID = ?',
      [userId]
    );
    return rows[0] || null;
  } else {
    const [rows] = await pool.query(
      'SELECT User_ID, Name, Email, Phone, Role FROM users WHERE User_ID = ?',
      [userId]
    );
    return rows[0] || null;
  }
}

/**
 * GET /api/profile - Fetch current authenticated user profile
 */
router.get('/', asyncHandler(async (req, res) => {
  const profile = await fetchUserProfile(req.user.id, req.user.role);
  if (!profile) {
    return fail(res, 404, 'User profile not found.');
  }
  return ok(res, profile, 'Profile details retrieved.');
}));

/**
 * Validation rules for profile update
 */
const updateProfileRules = [
  body('Name')
    .optional()
    .trim()
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters.'),
  body('Phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10}$/).withMessage('Phone number must be exactly 10 digits.')
];

/**
 * PUT /api/profile - Update own contact details
 */
router.put('/', updateProfileRules, validate, asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { Name, Phone } = req.body;
  const isDriver = req.user.role.toLowerCase() === 'user';

  if (isDriver) {
    const updates = [];
    const params = [];

    if (Name) {
      updates.push('Name = ?');
      params.push(Name.trim());
    }
    if (Phone) {
      updates.push('Phone = ?');
      params.push(Phone.trim());
    }

    if (updates.length > 0) {
      params.push(userId);
      await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE User_ID = ?`, params);
    }
  } else {
    if (Name) {
      await pool.query('UPDATE admin SET Name = ? WHERE Admin_ID = ?', [Name.trim(), userId]);
    }
  }

  const updatedProfile = await fetchUserProfile(userId, req.user.role);
  return ok(res, updatedProfile, 'Profile details updated successfully.');
}));

/**
 * PUT /api/users/:userId or PUT /:userId - Update user profile by ID (matches frontend api.js)
 */
const updateProfileByIdHandler = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.userId);
  if (req.user.role.toLowerCase() === 'user' && targetId !== req.user.id) {
    return fail(res, 403, 'Forbidden: You cannot modify another user profile.');
  }

  const { Name, Phone } = req.body;
  const updates = [];
  const params = [];

  if (Name) {
    updates.push('Name = ?');
    params.push(Name.trim());
  }
  if (Phone) {
    updates.push('Phone = ?');
    params.push(Phone.trim());
  }

  if (updates.length > 0) {
    params.push(targetId);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE User_ID = ?`, params);
  }

  const updatedProfile = await fetchUserProfile(targetId, 'User');
  return ok(res, updatedProfile, 'Profile details updated successfully.');
});

router.put('/users/:userId', [
  param('userId').isInt({ min: 1 }).withMessage('Invalid user ID.'),
  ...updateProfileRules
], validate, updateProfileByIdHandler);

router.put('/:userId', [
  param('userId').isInt({ min: 1 }).withMessage('Invalid user ID.'),
  ...updateProfileRules
], validate, updateProfileByIdHandler);

/**
 * Validation rules for password change
 */
const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required.'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.')
];

/**
 * Shared password update handler
 */
async function handlePasswordUpdate(req, res, targetUserId, targetRole) {
  const { currentPassword, newPassword } = req.body;

  let existingPasswordHash;
  if (targetRole.toLowerCase() === 'admin') {
    const [rows] = await pool.query('SELECT Password FROM admin WHERE Admin_ID = ?', [targetUserId]);
    if (rows.length === 0) return fail(res, 404, 'User not found.');
    existingPasswordHash = rows[0].Password;
  } else {
    const [rows] = await pool.query('SELECT Password FROM users WHERE User_ID = ?', [targetUserId]);
    if (rows.length === 0) return fail(res, 404, 'User not found.');
    existingPasswordHash = rows[0].Password;
  }

  const isMatch = await bcrypt.compare(currentPassword, existingPasswordHash);
  if (!isMatch) {
    return fail(res, 400, 'Current password does not match.');
  }

  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash(newPassword, salt);

  if (targetRole.toLowerCase() === 'admin') {
    await pool.query('UPDATE admin SET Password = ? WHERE Admin_ID = ?', [newHash, targetUserId]);
  } else {
    await pool.query('UPDATE users SET Password = ? WHERE User_ID = ?', [newHash, targetUserId]);
  }

  return ok(res, null, 'Password updated successfully.');
}

/**
 * PUT /api/profile/password - Change password for current authenticated user
 */
router.put('/password', changePasswordRules, validate, asyncHandler(async (req, res) => {
  return handlePasswordUpdate(req, res, req.user.id, req.user.role);
}));

/**
 * PATCH or PUT /api/users/:userId/password - Change password by ID (matches frontend api.js)
 */
const passwordByIdHandler = asyncHandler(async (req, res) => {
  const targetId = Number(req.params.userId);
  if (req.user.role.toLowerCase() === 'user' && targetId !== req.user.id) {
    return fail(res, 403, 'Forbidden: You cannot modify another user password.');
  }
  return handlePasswordUpdate(req, res, targetId, 'User');
});

router.patch('/users/:userId/password', [
  param('userId').isInt({ min: 1 }),
  ...changePasswordRules
], validate, passwordByIdHandler);

router.put('/users/:userId/password', [
  param('userId').isInt({ min: 1 }),
  ...changePasswordRules
], validate, passwordByIdHandler);

router.patch('/:userId/password', [
  param('userId').isInt({ min: 1 }),
  ...changePasswordRules
], validate, passwordByIdHandler);

router.put('/:userId/password', [
  param('userId').isInt({ min: 1 }),
  ...changePasswordRules
], validate, passwordByIdHandler);

module.exports = router;
