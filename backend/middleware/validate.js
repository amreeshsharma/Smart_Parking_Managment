// middleware/validate.js - express-validator result handler returning first error message
const { validationResult } = require('express-validator');
const { fail } = require('../utils/response');

/**
 * Middleware that extracts validation errors from express-validator
 * and returns HTTP 400 with the first error message.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return fail(res, 400, firstError.msg);
  }
  next();
}

module.exports = validate;
