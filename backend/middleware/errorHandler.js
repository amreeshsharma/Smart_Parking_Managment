// middleware/errorHandler.js - Central error handler with MySQL error mapping
const { fail } = require('../utils/response');

/**
 * Global Express error handling middleware
 */
function errorHandler(err, req, res, next) {
  // Always log the full error server-side
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  // 1. Database trigger / custom business logic exceptions (SQLSTATE '45000')
  if (err.sqlState === '45000') {
    return fail(res, 400, err.sqlMessage || 'Business rule violation');
  }

  // 2. MySQL Duplicate Key Error (ER_DUP_ENTRY / 1062)
  if (err.errno === 1062 || err.code === 'ER_DUP_ENTRY') {
    let message = 'A record with this information already exists.';
    const msg = err.sqlMessage || '';
    if (msg.includes('Email') || msg.includes('users.Email')) {
      message = 'An account with this email address is already registered.';
    } else if (msg.includes('Vehicle_Number') || msg.includes('vehicle.Vehicle_Number')) {
      message = 'A vehicle with this license plate number is already registered.';
    } else if (msg.includes('RFID_Tag') || msg.includes('vehicle.RFID_Tag')) {
      message = 'This RFID tag is already assigned to another vehicle.';
    } else if (msg.includes('uq_bay') || msg.includes('Bay_Number')) {
      message = 'A parking bay with this number already exists on this floor.';
    } else if (msg.includes('Lot_Name')) {
      message = 'A parking facility with this name already exists.';
    } else if (msg.includes('Transaction_ID')) {
      message = 'Transaction reference already recorded.';
    }
    return fail(res, 409, message);
  }

  // 3. Foreign Key Constraint Violations
  // 1451: Cannot delete or update a parent row: a foreign key constraint fails
  if (err.errno === 1451) {
    return fail(res, 409, 'Cannot remove this resource because related dependent records exist.');
  }
  // 1452: Cannot add or update a child row: a foreign key constraint fails
  if (err.errno === 1452) {
    return fail(res, 400, 'Referenced parent record does not exist.');
  }

  // 4. MySQL Check Constraint Violation (MySQL 8.0.16+)
  if (err.errno === 3819 || err.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    let message = 'Data constraint validation failed.';
    const msg = err.sqlMessage || '';
    if (msg.includes('chk_user_phone')) {
      message = 'Phone number must be exactly 10 digits.';
    } else if (msg.includes('chk_res_time')) {
      message = 'End time must be after start time.';
    } else if (msg.includes('chk_lot_hours')) {
      message = 'Facility open time must be earlier than close time.';
    } else if (msg.includes('chk_lot_bays')) {
      message = 'Total bays count must be greater than zero.';
    }
    return fail(res, 400, message);
  }

  // 5. JSON Parsing Syntax Error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return fail(res, 400, 'Invalid JSON payload received.');
  }

  // 6. Custom or application-level error with status
  if (err.statusCode || err.status) {
    const status = err.statusCode || err.status;
    return fail(res, status, err.message || 'Request failed');
  }

  // 7. Generic Internal Server Error (hide internal database details from client)
  return fail(res, 500, 'An unexpected server error occurred. Please try again later.');
}

module.exports = errorHandler;
