// utils/response.js - Standardized JSON response envelope helpers
/**
 * Send a standardized success JSON response
 * @param {import('express').Response} res
 * @param {any} data
 * @param {string} message
 * @param {number} statusCode
 */
function ok(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    message
  });
}

/**
 * Send a standardized error JSON response
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {any} data
 */
function fail(res, statusCode = 400, message = 'An error occurred', data = null) {
  return res.status(statusCode).json({
    success: false,
    data,
    message
  });
}

module.exports = {
  ok,
  fail
};
