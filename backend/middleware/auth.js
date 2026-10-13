// middleware/auth.js - JWT authentication and role-based access control
const jwt = require('jsonwebtoken');
const { fail } = require('../utils/response');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'parksmart-default-secret-change-in-production';

/**
 * Verify JWT token from Authorization Bearer header
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return fail(res, 401, 'Authentication token missing or invalid format.');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return fail(res, 401, 'Session expired. Please log in again.');
    }
    return fail(res, 401, 'Invalid authentication token.');
  }
}

/**
 * Enforce role-based access control
 * @param  {...string} roles Allowed roles ('User', 'Admin')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, 401, 'Authentication required.');
    }

    const userRole = (req.user.role || '').toLowerCase();
    const hasPermission = roles.some(r => r.toLowerCase() === userRole);

    if (!hasPermission) {
      return fail(res, 403, 'Forbidden: You do not have permission to access this resource.');
    }

    next();
  };
}

module.exports = {
  verifyToken,
  requireRole
};
