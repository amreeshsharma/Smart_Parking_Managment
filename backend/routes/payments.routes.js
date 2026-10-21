// routes/payments.routes.js - Payment settlement, transaction history, and gateway simulation
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
 * GET /api/payments - Payment transaction ledger
 */
router.get('/', [
  query('status').optional().trim(),
  query('type').optional().trim(),
  query('userId').optional().isInt({ min: 1 }),
  query('search').optional().trim()
], validate, asyncHandler(async (req, res) => {
  const isDriver = req.user.role.toLowerCase() === 'user';
  const targetUserId = isDriver ? req.user.id : (req.query.userId ? Number(req.query.userId) : null);
  const statusFilter = req.query.status;
  const typeFilter = req.query.type;
  const search = req.query.search;

  let sql = `
    SELECT p.Payment_ID, p.Amount, p.Payment_Type, p.Payment_Mode,
           p.Transaction_ID, p.Payment_Status, p.Payment_Date,
           p.Reservation_ID,
           u.User_ID, u.Name AS User_Name,
           v.Vehicle_Number,
           b.Bay_Number,
           l.Lot_Name
    FROM payment p
    JOIN reservation r ON r.Reservation_ID = p.Reservation_ID
    JOIN vehicle v ON v.Vehicle_ID = r.Vehicle_ID
    JOIN users u ON u.User_ID = v.User_ID
    JOIN parking_bay b ON b.Bay_ID = r.Bay_ID
    JOIN parking_lot l ON l.Lot_ID = b.Lot_ID
    WHERE 1=1
  `;
  const params = [];

  if (targetUserId) {
    sql += ' AND u.User_ID = ?';
    params.push(targetUserId);
  }

  if (statusFilter && statusFilter.toLowerCase() !== 'all') {
    sql += ' AND LOWER(p.Payment_Status) = LOWER(?)';
    params.push(statusFilter);
  }

  if (typeFilter && typeFilter.toLowerCase() !== 'all') {
    sql += ' AND LOWER(p.Payment_Type) = LOWER(?)';
    params.push(typeFilter);
  }

  if (search) {
    sql += ` AND (
      p.Transaction_ID LIKE ? OR
      v.Vehicle_Number LIKE ? OR
      u.Name LIKE ? OR
      CAST(p.Payment_ID AS CHAR) LIKE ?
    )`;
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }

  sql += ' ORDER BY p.Payment_ID DESC';

  const [rows] = await pool.query(sql, params);
  return ok(res, rows, 'Payments retrieved.');
}));

/**
 * Validation rules for payment settlement
 */
const payRules = [
  param('id').isInt({ min: 1 }).withMessage('Invalid payment ID.'),
  body('Payment_Mode')
    .optional()
    .isIn(['UPI', 'Card', 'Net Banking', 'Cash'])
    .withMessage('Payment_Mode must be UPI, Card, Net Banking, or Cash.'),
  body('paymentMode')
    .optional()
    .isIn(['UPI', 'Card', 'Net Banking', 'Cash'])
    .withMessage('paymentMode must be UPI, Card, Net Banking, or Cash.')
];

/**
 * POST /api/payments/:id/pay - Settle pending reservation fee or overstay penalty
 * Calls: sp_make_payment(p_payment, p_mode, OUT p_txn)
 */
router.post('/:id/pay', payRules, validate, asyncHandler(async (req, res) => {
  const paymentId = Number(req.params.id);
  const mode = req.body.Payment_Mode || req.body.paymentMode || 'UPI';

  // 1. Check payment existence, status, and ownership
  const [payRows] = await pool.query(`
    SELECT p.Payment_ID, p.Amount, p.Payment_Status, v.User_ID
    FROM payment p
    JOIN reservation r ON r.Reservation_ID = p.Reservation_ID
    JOIN vehicle v ON v.Vehicle_ID = r.Vehicle_ID
    WHERE p.Payment_ID = ?
  `, [paymentId]);

  if (payRows.length === 0) {
    return fail(res, 404, 'Payment record not found.');
  }

  const payment = payRows[0];
  const isDriver = req.user.role.toLowerCase() === 'user';
  if (isDriver && payment.User_ID !== req.user.id) {
    return fail(res, 403, 'Forbidden: You do not own this payment record.');
  }

  if (payment.Payment_Status === 'Paid') {
    return fail(res, 400, 'Payment already completed.');
  }

  // 2. Call sp_make_payment via dedicated connection with TiDB fallback
  const conn = await pool.getConnection();
  let txnId;
  try {
    try {
      await conn.query('CALL sp_make_payment(?, ?, @out_txn)', [paymentId, mode]);
      const [outRows] = await conn.query('SELECT @out_txn AS txn_id');
      txnId = outRows[0]?.txn_id;
    } catch (spErr) {
      if (spErr.errno === 1305 || spErr.message.includes('PROCEDURE') || spErr.message.includes('does not exist')) {
        await conn.beginTransaction();
        txnId = 'TXN' + Math.floor(Math.random() * 9000000000 + 1000000000);
        await conn.query(
          'UPDATE payment SET Payment_Status = ?, Payment_Mode = ?, Transaction_ID = ?, Payment_Date = NOW() WHERE Payment_ID = ?',
          ['Paid', mode, txnId, paymentId]
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

  // 3. Fetch updated payment record
  const [updatedRows] = await pool.query(
    'SELECT Payment_ID, Amount, Payment_Type, Payment_Mode, Transaction_ID, Payment_Status, Payment_Date, Reservation_ID FROM payment WHERE Payment_ID = ?',
    [paymentId]
  );

  const updatedPayment = updatedRows[0];

  return ok(
    res,
    updatedPayment,
    `Payment of ₹${updatedPayment.Amount} completed successfully via ${mode}!`
  );
}));

module.exports = router;
