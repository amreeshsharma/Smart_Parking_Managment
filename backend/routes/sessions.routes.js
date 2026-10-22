// routes/sessions.routes.js - Parking session telemetry, RFID gate entry, and exit barrier clearance
const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { ok, fail } = require('../utils/response');

router.use(verifyToken);

/**
 * Format Duration string from minutes or active status
 */
function formatDuration(durationMinutes, isLive) {
  if (isLive || durationMinutes === null || durationMinutes === undefined) {
    return 'Live';
  }
  const mins = Math.max(0, Number(durationMinutes));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

/**
 * Format JS Date into MySQL DATETIME string (YYYY-MM-DD HH:MM:SS)
 */
function toMySqlDatetime(d) {
  const date = d ? new Date(d) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * GET /api/sessions - List session history / active dwell telemetry
 */
router.get('/', [
  query('active').optional().isBoolean(),
  query('activeOnly').optional().isBoolean(),
  query('userId').optional().isInt({ min: 1 }),
  query('lotId').optional().isInt({ min: 1 }),
  query('from').optional().isDate({ format: 'YYYY-MM-DD' }),
  query('to').optional().isDate({ format: 'YYYY-MM-DD' }),
  query('search').optional().trim()
], validate, asyncHandler(async (req, res) => {
  const isDriver = req.user.role.toLowerCase() === 'user';
  const targetUserId = isDriver ? req.user.id : (req.query.userId ? Number(req.query.userId) : null);
  const activeOnly = req.query.active === 'true' || req.query.activeOnly === 'true';
  const lotId = req.query.lotId ? Number(req.query.lotId) : null;
  const dateFrom = req.query.from;
  const dateTo = req.query.to;
  const search = req.query.search;

  let sql = `
    SELECT s.Session_ID, s.Entry_Time, s.Exit_Time, s.Duration_Minutes,
           s.Overstay_Minutes, s.Penalty_Amount,
           s.Vehicle_ID, v.Vehicle_Number, v.RFID_Tag, v.Brand AS Vehicle_Brand,
           s.Bay_ID, b.Bay_Number, b.Floor, b.Bay_Type,
           l.Lot_ID, l.Lot_Name,
           s.Reservation_ID, r.End_Time AS Scheduled_End,
           u.User_ID, u.Name AS User_Name
    FROM parking_session s
    JOIN vehicle v ON v.Vehicle_ID = s.Vehicle_ID
    JOIN users u ON u.User_ID = v.User_ID
    JOIN parking_bay b ON b.Bay_ID = s.Bay_ID
    JOIN parking_lot l ON l.Lot_ID = b.Lot_ID
    JOIN reservation r ON r.Reservation_ID = s.Reservation_ID
    WHERE 1=1
  `;
  const params = [];

  if (targetUserId) {
    sql += ' AND u.User_ID = ?';
    params.push(targetUserId);
  }

  if (activeOnly) {
    sql += ' AND s.Exit_Time IS NULL';
  }

  if (lotId) {
    sql += ' AND l.Lot_ID = ?';
    params.push(lotId);
  }

  if (dateFrom) {
    sql += ' AND DATE(s.Entry_Time) >= ?';
    params.push(dateFrom);
  }

  if (dateTo) {
    sql += ' AND DATE(s.Entry_Time) <= ?';
    params.push(dateTo);
  }

  if (search) {
    sql += ` AND (
      v.Vehicle_Number LIKE ? OR
      v.RFID_Tag LIKE ? OR
      b.Bay_Number LIKE ? OR
      l.Lot_Name LIKE ? OR
      u.Name LIKE ? OR
      CAST(s.Session_ID AS CHAR) LIKE ?
    )`;
    const q = `%${search}%`;
    params.push(q, q, q, q, q, q);
  }

  sql += ' ORDER BY s.Session_ID DESC';

  const [rows] = await pool.query(sql, params);

  const sessions = rows.map(s => {
    const isLive = !s.Exit_Time;
    return {
      ...s,
      Duration: formatDuration(s.Duration_Minutes, isLive),
      Floor: `Floor ${s.Floor}`,
      Floor_Number: s.Floor
    };
  });

  return ok(res, sessions, 'Parking sessions retrieved.');
}));

/**
 * GET /api/sessions/active - Retrieve current active parking session for Driver
 */
router.get('/active', [
  query('userId').optional().isInt({ min: 1 })
], validate, asyncHandler(async (req, res) => {
  const isDriver = req.user.role.toLowerCase() === 'user';
  const targetUserId = isDriver ? req.user.id : (req.query.userId ? Number(req.query.userId) : req.user.id);

  const [rows] = await pool.query(`
    SELECT s.Session_ID, s.Entry_Time, s.Exit_Time, s.Duration_Minutes,
           s.Overstay_Minutes, s.Penalty_Amount,
           v.Vehicle_ID, v.Vehicle_Number, v.Brand AS Vehicle_Brand, v.Color AS Vehicle_Color, v.RFID_Tag,
           b.Bay_ID, b.Bay_Number, b.Floor, b.Bay_Type,
           l.Lot_ID, l.Lot_Name,
           r.Reservation_ID, r.Start_Time, r.End_Time,
           p.Amount
    FROM parking_session s
    JOIN vehicle v ON v.Vehicle_ID = s.Vehicle_ID
    JOIN parking_bay b ON b.Bay_ID = s.Bay_ID
    JOIN parking_lot l ON l.Lot_ID = b.Lot_ID
    JOIN reservation r ON r.Reservation_ID = s.Reservation_ID
    LEFT JOIN payment p ON p.Reservation_ID = r.Reservation_ID AND p.Payment_Type = 'Reservation Fee'
    WHERE v.User_ID = ? AND s.Exit_Time IS NULL
    LIMIT 1
  `, [targetUserId]);

  if (rows.length === 0) {
    return ok(res, null, 'No active parking session found.');
  }

  const s = rows[0];
  const tariffRates = { EV: 60, Regular: 40, Compact: 30, Disabled: 20 };

  const enriched = {
    ...s,
    Duration: 'Live',
    Floor: `Floor ${s.Floor}`,
    Floor_Number: s.Floor,
    Tariff_Rate: tariffRates[s.Bay_Type] || 40
  };

  return ok(res, enriched, 'Active telemetry session retrieved.');
}));

/**
 * POST /api/sessions/entry - Record vehicle entry via RFID scanning (Admin only)
 * Calls: sp_record_entry_by_rfid(p_rfid, OUT p_session_id)
 */
router.post('/entry', requireRole('Admin'), [
  body('RFID_Tag').trim().notEmpty().withMessage('RFID_Tag is required.')
], validate, asyncHandler(async (req, res) => {
  const rfid = req.body.RFID_Tag.trim().toUpperCase();

  const conn = await pool.getConnection();
  let sessionId;
  try {
    try {
      await conn.query('CALL sp_record_entry_by_rfid(?, @out_session_id)', [rfid]);
      const [outRows] = await conn.query('SELECT @out_session_id AS session_id');
      sessionId = outRows[0]?.session_id;
    } catch (spErr) {
      if (spErr.errno === 1305 || spErr.message.includes('PROCEDURE') || spErr.message.includes('does not exist')) {
        await conn.beginTransaction();
        const [vehRows] = await conn.query('SELECT Vehicle_ID FROM vehicle WHERE RFID_Tag = ?', [rfid]);
        if (vehRows.length === 0) return fail(res, 404, 'Unknown RFID tag');
        const vId = vehRows[0].Vehicle_ID;

        const [resRows] = await conn.query(
          "SELECT Reservation_ID, Bay_ID FROM reservation WHERE Vehicle_ID = ? AND Booking_Date = CURDATE() AND Status = 'Upcoming' ORDER BY Start_Time LIMIT 1",
          [vId]
        );
        if (resRows.length === 0) return fail(res, 404, 'No valid upcoming reservation found for this vehicle today');
        const rId = resRows[0].Reservation_ID;
        const bId = resRows[0].Bay_ID;

        const [insSess] = await conn.query(
          'INSERT INTO parking_session (Entry_Time, Reservation_ID, Vehicle_ID, Bay_ID) VALUES (NOW(), ?, ?, ?)',
          [rId, vId, bId]
        );
        sessionId = insSess.insertId;
        await conn.query("UPDATE reservation SET Status = 'Active' WHERE Reservation_ID = ?", [rId]);
        await conn.query("UPDATE parking_bay SET Status = 'Occupied' WHERE Bay_ID = ?", [bId]);
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

  if (!sessionId) {
    return fail(res, 500, 'Failed to record entry session.');
  }

  // Fetch created session details
  const [rows] = await pool.query(`
    SELECT s.Session_ID, s.Entry_Time, s.Exit_Time, s.Reservation_ID,
           v.Vehicle_Number, v.RFID_Tag, b.Bay_Number, b.Floor, l.Lot_Name
    FROM parking_session s
    JOIN vehicle v ON v.Vehicle_ID = s.Vehicle_ID
    JOIN parking_bay b ON b.Bay_ID = s.Bay_ID
    JOIN parking_lot l ON l.Lot_ID = b.Lot_ID
    WHERE s.Session_ID = ?
  `, [sessionId]);

  const session = {
    ...rows[0],
    Floor: `Floor ${rows[0].Floor}`,
    Duration: 'Live'
  };

  return ok(res, session, `Entry registered successfully for tag ${rfid}. Gate opened.`, 201);
}));

/**
 * PATCH /api/sessions/:id/exit - Register barrier clearance and mark departure
 * Calls: sp_mark_exit(p_session, p_exit_datetime)
 */
router.patch('/:id/exit', [
  param('id').isInt({ min: 1 }).withMessage('Invalid session ID.'),
  body('Exit_Time').optional().trim()
], validate, asyncHandler(async (req, res) => {
  const sessionId = Number(req.params.id);
  const exitDatetime = toMySqlDatetime(req.body.Exit_Time);

  // Check session existence and ownership (Admin or vehicle owner)
  const [sessRows] = await pool.query(`
    SELECT s.Session_ID, s.Exit_Time, s.Entry_Time, s.Reservation_ID, s.Bay_ID, v.User_ID
    FROM parking_session s
    JOIN vehicle v ON v.Vehicle_ID = s.Vehicle_ID
    WHERE s.Session_ID = ?
  `, [sessionId]);

  if (sessRows.length === 0) {
    return fail(res, 404, 'Session not found.');
  }

  const isDriver = req.user.role.toLowerCase() === 'user';
  if (isDriver && sessRows[0].User_ID !== req.user.id) {
    return fail(res, 403, 'Forbidden: You do not own this parking session.');
  }

  if (sessRows[0].Exit_Time) {
    return fail(res, 400, 'Session already closed.');
  }

  // Call sp_mark_exit with TiDB fallback
  const conn = await pool.getConnection();
  try {
    try {
      await conn.query('CALL sp_mark_exit(?, ?)', [sessionId, exitDatetime]);
    } catch (spErr) {
      if (spErr.errno === 1305 || spErr.message.includes('PROCEDURE') || spErr.message.includes('does not exist')) {
        await conn.beginTransaction();
        const entryDt = new Date(sessRows[0].Entry_Time);
        const exitDt = new Date(exitDatetime || new Date());
        const durationMin = Math.max(1, Math.round((exitDt - entryDt) / 60000));

        await conn.query(
          'UPDATE parking_session SET Exit_Time = ?, Duration_Minutes = ?, Overstay_Minutes = 0, Penalty_Amount = 0.00 WHERE Session_ID = ?',
          [exitDatetime || new Date(), durationMin, sessionId]
        );
        await conn.query("UPDATE reservation SET Status = 'Completed' WHERE Reservation_ID = ?", [sessRows[0].Reservation_ID]);
        await conn.query("UPDATE parking_bay SET Status = 'Available' WHERE Bay_ID = ?", [sessRows[0].Bay_ID]);
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

  // Ensure bay status is marked as Available
  await pool.query(
    `UPDATE parking_bay SET Status = 'Available'
     WHERE Bay_ID = ? AND NOT EXISTS (
       SELECT 1 FROM reservation WHERE Bay_ID = ? AND Status IN ('Upcoming', 'Active')
     )`,
    [sessRows[0].Bay_ID, sessRows[0].Bay_ID]
  );

  // Fetch updated session
  const [updatedRows] = await pool.query(`
    SELECT s.Session_ID, s.Entry_Time, s.Exit_Time, s.Duration_Minutes,
           s.Overstay_Minutes, s.Penalty_Amount, s.Reservation_ID,
           v.Vehicle_Number, b.Bay_Number, b.Floor, l.Lot_Name
    FROM parking_session s
    JOIN vehicle v ON v.Vehicle_ID = s.Vehicle_ID
    JOIN parking_bay b ON b.Bay_ID = s.Bay_ID
    JOIN parking_lot l ON l.Lot_ID = b.Lot_ID
    WHERE s.Session_ID = ?
  `, [sessionId]);

  const session = updatedRows[0];
  const overstay = Number(session.Overstay_Minutes || 0);
  const penalty = Number(session.Penalty_Amount || 0);

  const message = penalty > 0
    ? `Exit registered. Overstay of ${overstay} mins flagged. Penalty fee of ₹${penalty} generated.`
    : 'Exit registered successfully. Parking space is now available.';

  return ok(res, {
    ...session,
    Duration: formatDuration(session.Duration_Minutes, false),
    Floor: `Floor ${session.Floor}`
  }, message);
}));

module.exports = router;
