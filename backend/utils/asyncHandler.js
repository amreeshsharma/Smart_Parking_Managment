// utils/asyncHandler.js - Wrapper to catch exceptions in async route handlers and forward to errorHandler
/**
 * Express async route handler wrapper
 * @param {Function} fn
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
