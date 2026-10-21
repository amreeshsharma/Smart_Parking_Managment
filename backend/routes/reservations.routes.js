// routes/reservations.routes.js - Driver parking reservations and cancellation
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { ok, fail } = require('../utils/response');

router.use(verifyToken);

/**
 * Normalise time string (e.g., "09:00" -> "09:00:00")
 */
function normalizeTime(t) {
  if (!t) return t;
  const parts = t.trim().split(':');
  if (parts.length === 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
  }
  return t.trim();
}

/**
 * GET /api/reservations - List reservations (Driver: own, Admin: all or filtered)
 */
router.get('/', [
  query('status').optional().trim(),
  query('userId').optional().isInt({ min: 1 }).withMessage('userId must be a positive integer.'),
  query('lotId').optional().isInt({ min: 1 }).withMessage('lotId must be a positive integer.'),
  query('search').optional().trim()
], validate, asyncHandler(async (req, res) => {
  const isDriver = req.user.role.toLowerCase() === 'user';
  const targetUserId = isDriver ? req.user.id : (req.query.userId ? Number(req.query.userId) : null);
  const statusFilter = req.query.status;
  const lotIdFilter = req.query.lotId ? Number(req.query.lotId) : null;
  const search = req.query.search;

  let sql = `
    SELECT r.Reservation_ID, r.Booking_Date, r.Start_Time, r.End_Time, r.Status,
           r.User_ID, r.User_Name,
           r.Vehicle_ID, r.Vehicle_Number, v.Brand AS Vehicle_Brand, v.Color AS Vehicle_Color,
           u.Email AS User_Email,
           r.Bay_ID, r.Bay_Number, r.Floor, r.Bay_Type,
           r.Lot_ID, r.Lot_Name,
           p.Payment_ID,
           COALESCE(p.Payment_Status, 'Pending') AS Payment_Status,
           COALESCE(p.Amount, 0) AS Amount
    FROM v_reservation_details r
    JOIN vehicle v ON v.Vehicle_ID = r.Vehicle_ID
    JOIN users u ON u.User_ID = r.User_ID
    LEFT JOIN payment p ON p.Reservation_ID = r.Reservation_ID AND p.Payment_Type = 'Reservation Fee'
    WHERE 1=1
  `;
  const params = [];

  if (targetUserId) {
    sql += ' AND r.User_ID = ?';
    params.push(targetUserId);
  }

  if (statusFilter && statusFilter.toLowerCase() !== 'all') {
    sql += ' AND LOWER(r.Status) = LOWER(?)';
    params.push(statusFilter);
  }

  if (lotIdFilter) {
    sql += ' AND r.Lot_ID = ?';
    params.push(lotIdFilter);
  }

  if (search) {
    sql += ` AND (
      r.User_Name LIKE ? OR
      r.Vehicle_Number LIKE ? OR
      r.Bay_Number LIKE ? OR
      r.Lot_Name LIKE ? OR
      CAST(r.Reservation_ID AS CHAR) LIKE ?
    )`;
    const q = `%${search}%`;
    params.push(q, q, q, q, q);
  }

  sql += ' ORDER BY r.Reservation_ID DESC';

  const [rows] = await pool.query(sql, params);

  // Normalise Floor field to "Floor X" for frontend compatibility
  const reservations = rows.map(r => ({
    ...r,
    Floor: `Floor ${r.Floor}`,
    Floor_Number: r.Floor
  }));

  return ok(res, reservations, 'Reservations retrieved.');
}));

/**
 * Validation rules for creating a reservation
 */
const createReservationRules = [
  body('Vehicle_ID').isInt({ min: 1 }).withMessage('Valid Vehicle_ID is required.'),
  body('Bay_ID').isInt({ min: 1 }).withMessage('Valid Bay_ID is required.'),
  body('Booking_Date')
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Booking_Date must be in YYYY-MM-DD format.'),
  body('Start_Time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
    .withMessage('Start_Time must be in HH:MM or HH:MM:SS format.'),
  body('End_Time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
    .withMessage('End_Time must be in HH:MM or HH:MM:SS format.')
];

/**
 * POST /api/reservations - Create reservation via sp_create_reservation
 */
router.post('/', createReservationRules, validate, asyncHandler(async (req, res) => {
  const vehicleId = Number(req.body.Vehicle_ID);
  const bayId = Number(req.body.Bay_ID);
  const bookingDate = req.body.Booking_Date;
  const startTime = normalizeTime(req.body.Start_Time);
  const endTime = normalizeTime(req.body.End_Time);

  // End time must be greater than start time
  if (endTime <= startTime) {
    return fail(res, 400, 'End time must be after start time.');
  }

  // 1. Verify caller owns the vehicle (or is Admin)
  const [vehicleRows] = await pool.query(
    'SELECT Vehicle_ID, User_ID FROM vehicle WHERE Vehicle_ID = ?',
    [vehicleId]
  );
  if (vehicleRows.length === 0) {
    return fail(res, 404, 'Selected vehicle not found.');
  }

  const isDriver = req.user.role.toLowerCase() === 'user';
  if (isDriver && vehicleRows[0].User_ID !== req.user.id) {
    return fail(res, 403, 'Forbidden: You do not own this vehicle.');
  }

  // 2. Execute sp_create_reservation on a dedicated pool connection with TiDB fallback
  const conn = await pool.getConnection();
  let resId;
  try {
    try {
      await conn.query(
        'CALL sp_create_reservation(?, ?, ?, ?, ?, @out_res_id)',
        [vehicleId, bayId, bookingDate, startTime, endTime]
      );
      const [outRows] = await conn.query('SELECT @out_res_id AS res_id');
      resId = outRows[0]?.res_id;
    } catch (spErr) {
      if (spErr.errno === 1305 || spErr.message.includes('PROCEDURE') || spErr.message.includes('does not exist')) {
        await conn.beginTransaction();
        const [bayRows] = await conn.query('SELECT Bay_Type FROM parking_bay WHERE Bay_ID = ? FOR UPDATE', [bayId]);
        const bayType = bayRows[0]?.Bay_Type || 'Regular';
        const rates = { Regular: 40, EV: 60, Disabled: 20, Compact: 30 };
        const hourlyRate = rates[bayType] || 40;
        const [sh, sm] = startTime.split(':').map(Number);
        const [eh, em] = endTime.split(':').map(Number);
        const hours = Math.max(0.5, ((eh * 60 + em) - (sh * 60 + sm)) / 60);
        const fee = Math.round(hourlyRate * hours * 100) / 100;

        const [insertRes] = await conn.query(
          'INSERT INTO reservation (Booking_Date, Start_Time, End_Time, Status, Vehicle_ID, Bay_ID) VALUES (?, ?, ?, ?, ?, ?)',
          [bookingDate, startTime, endTime, 'Upcoming', vehicleId, bayId]
        );
        resId = insertRes.insertId;

        await conn.query(
          'INSERT INTO payment (Amount, Payment_Type, Payment_Status, Reservation_ID) VALUES (?, ?, ?, ?)',
          [fee, 'Reservation Fee', 'Pending', resId]
        );
        await conn.commit();
      } else {
        throw spErr;
      }
    }
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }

  if (!resId) {
    return fail(res, 500, 'Failed to create reservation.');
  }

  // 3. Fetch newly created reservation and its pending payment
  const [resRows] = await pool.query(`
    SELECT r.Reservation_ID, r.Booking_Date, r.Start_Time, r.End_Time, r.Status,
           r.Vehicle_ID, r.Bay_ID, v.Vehicle_Number, b.Bay_Number, b.Floor, b.Bay_Type, l.Lot_Name
    FROM reservation r
    JOIN vehicle v ON v.Vehicle_ID = r.Vehicle_ID
    JOIN parking_bay b ON b.Bay_ID = r.Bay_ID
    JOIN parking_lot l ON l.Lot_ID = b.Lot_ID
    WHERE r.Reservation_ID = ?
  `, [resId]);

  const [payRows] = await pool.query(
    'SELECT Payment_ID, Amount, Payment_Type, Payment_Status, Reservation_ID FROM payment WHERE Reservation_ID = ? AND Payment_Type = ?',
    [resId, 'Reservation Fee']
  );

  const reservation = {
    ...resRows[0],
    Floor: `Floor ${resRows[0].Floor}`
  };
  const payment = payRows[0] || null;

  return ok(res, {
    reservation,
    payment,
    Reservation_ID: reservation.Reservation_ID,
    Payment_ID: payment?.Payment_ID,
    Amount: payment?.Amount
  }, 'Reservation confirmed successfully.', 201);
}));

/**
 * PATCH /api/reservations/:id/cancel - Cancel Upcoming reservation
 */
router.patch('/:id/cancel', [
  param('id').isInt({ min: 1 }).withMessage('Invalid reservation ID.')
], validate, asyncHandler(async (req, res) => {
  const resId = Number(req.params.id);

  // Retrieve reservation and owner
  const [rows] = await pool.query(`
    SELECT r.Reservation_ID, r.Status, r.Bay_ID, v.User_ID
    FROM reservation r
    JOIN vehicle v ON v.Vehicle_ID = r.Vehicle_ID
    WHERE r.Reservation_ID = ?
  `, [resId]);

  if (rows.length === 0) {
    return fail(res, 404, 'Reservation not found.');
  }

  const reservation = rows[0];
  const isDriver = req.user.role.toLowerCase() === 'user';
  if (isDriver && reservation.User_ID !== req.user.id) {
    return fail(res, 403, 'Forbidden: You do not own this reservation.');
  }

  // Only 'Upcoming' reservations can be cancelled
  if (reservation.Status !== 'Upcoming') {
    return fail(res, 400, `Cannot cancel a reservation that is already ${reservation.Status.toLowerCase()}.`);
  }

  // Update status to 'Cancelled'
  await pool.query('UPDATE reservation SET Status = ? WHERE Reservation_ID = ?', ['Cancelled', resId]);

  // Ensure bay is freed to Available if no other active/upcoming reservation exists on it
  await pool.query(`
    UPDATE parking_bay SET Status = 'Available'
    WHERE Bay_ID = ? AND NOT EXISTS (
      SELECT 1 FROM reservation WHERE Bay_ID = ? AND Status IN ('Upcoming', 'Active')
    )
  `, [reservation.Bay_ID, reservation.Bay_ID]);

  const [updatedRows] = await pool.query('SELECT * FROM reservation WHERE Reservation_ID = ?', [resId]);
  return ok(res, updatedRows[0], 'Reservation cancelled and parking space released.');
}));

module.exports = router;
