// routes/admin.routes.js - Municipal administration, facility telemetry KPIs, lots & bays CRUD, user administration
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, param, query } = require('express-validator');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { ok, fail } = require('../utils/response');

// All endpoints in this file are restricted to Administrator accounts
router.use(verifyToken);
router.use(requireRole('Admin'));

/**
 * Normalise time format (e.g., "06:00" -> "06:00:00")
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
 * Parse floor value into an integer (e.g., "Floor 2" -> 2, 2 -> 2)
 */
function parseFloorNumber(floorVal) {
  if (floorVal === null || floorVal === undefined) return 1;
  const num = parseInt(String(floorVal).replace(/\D/g, ''), 10);
  return isNaN(num) ? 1 : num;
}

// =========================================================================
// 1. Telemetry Analytics & System KPIs
// =========================================================================

/**
 * GET /api/admin/stats - High-level telemetry statistics for admin dashboard
 */
router.get('/stats', asyncHandler(async (req, res) => {
  // 1. Total revenue (sum of Paid payments)
  const [revRows] = await pool.query(
    "SELECT COALESCE(SUM(Amount), 0) AS totalRevenue FROM payment WHERE Payment_Status = 'Paid'"
  );
  const totalRevenue = Number(revRows[0].totalRevenue || 0);

  // 2. Pending settlements revenue and count
  const [penRows] = await pool.query(
    "SELECT COALESCE(SUM(Amount), 0) AS pendingRevenue, COUNT(Payment_ID) AS pendingCount FROM payment WHERE Payment_Status = 'Pending'"
  );
  const pendingRevenue = Number(penRows[0].pendingRevenue || 0);
  const pendingPayments = Number(penRows[0].pendingCount || 0);

  // 3. Bay occupancy counts across all lots
  const [bayStatsRows] = await pool.query(`
    SELECT
      COUNT(Bay_ID) AS totalBays,
      COALESCE(SUM(Status = 'Occupied'), 0) AS occupiedBays,
      COALESCE(SUM(Status = 'Reserved'), 0) AS reservedBays,
      COALESCE(SUM(Status = 'Available'), 0) AS availableBays
    FROM parking_bay
  `);
  const totalBays = Number(bayStatsRows[0].totalBays || 0);
  const occupiedBays = Number(bayStatsRows[0].occupiedBays || 0);
  const reservedBays = Number(bayStatsRows[0].reservedBays || 0);
  const availableBays = Number(bayStatsRows[0].availableBays || 0);
  const overallOccupancyPct = totalBays ? Math.round((occupiedBays / totalBays) * 100) : 0;

  // 4. Live active sessions inside facility
  const [sessStatsRows] = await pool.query(
    'SELECT COUNT(Session_ID) AS activeSessions FROM parking_session WHERE Exit_Time IS NULL'
  );
  const activeSessions = Number(sessStatsRows[0].activeSessions || 0);
  const activeSessionsCount = activeSessions;

  // 5. Overstay count
  const [overstayStatsRows] = await pool.query(
    'SELECT COUNT(Session_ID) AS overstayCount FROM parking_session WHERE Overstay_Minutes > 0'
  );
  const overstayCount = Number(overstayStatsRows[0].overstayCount || 0);

  // 6. Occupancy per parking lot from v_lot_availability
  const [lotAvailabilityRows] = await pool.query(`
    SELECT Lot_ID, Lot_Name, Total_Bays, Available_Bays, Reserved_Bays, Occupied_Bays, Occupancy_Percent
    FROM v_lot_availability
    ORDER BY Lot_ID ASC
  `);

  const occupancyByLot = lotAvailabilityRows.map(l => ({
    Lot_ID: l.Lot_ID,
    Lot_Name: l.Lot_Name,
    Occupancy_Percent: Number(l.Occupancy_Percent || 0),
    Total_Bays: Number(l.Total_Bays || 0),
    Available_Bays: Number(l.Available_Bays || 0)
  }));

  const lotChartData = lotAvailabilityRows.map(l => ({
    name: l.Lot_Name.replace(' Facility', '').replace(' Multilevel', '').replace(' Deck', ''),
    occupied: Number(l.Occupied_Bays || 0),
    reserved: Number(l.Reserved_Bays || 0),
    available: Number(l.Available_Bays || 0),
    total: Number(l.Total_Bays || 0)
  }));

  // 7. Daily revenue for the last 14 days
  const [dailyRevRows] = await pool.query(`
    SELECT DATE(Payment_Date) AS pDate, COALESCE(SUM(Amount), 0) AS dailyRevenue
    FROM payment
    WHERE Payment_Status = 'Paid'
      AND Payment_Date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
    GROUP BY DATE(Payment_Date)
    ORDER BY pDate ASC
  `);

  const revenueByDayMap = {};
  dailyRevRows.forEach(row => {
    revenueByDayMap[row.pDate] = Number(row.dailyRevenue);
  });

  const revenueByDay = [];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const revenueTrend = [];

  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const rev = revenueByDayMap[dateStr] || 0;
    revenueByDay.push({ date: dateStr, revenue: rev });

    if (i < 7) {
      const dayName = i === 0 ? 'Today' : daysOfWeek[d.getDay()];
      revenueTrend.push({ day: dayName, revenue: rev });
    }
  }

  // 8. Recent overstay audit records (last 10 sessions with Overstay_Minutes > 0)
  const [overstayRows] = await pool.query(`
    SELECT s.Session_ID, s.Exit_Time, s.Overstay_Minutes, s.Penalty_Amount,
           v.Vehicle_Number, b.Bay_Number, l.Lot_Name
    FROM parking_session s
    JOIN vehicle v ON v.Vehicle_ID = s.Vehicle_ID
    JOIN parking_bay b ON b.Bay_ID = s.Bay_ID
    JOIN parking_lot l ON l.Lot_ID = b.Lot_ID
    WHERE s.Overstay_Minutes > 0
    ORDER BY s.Session_ID DESC
    LIMIT 10
  `);

  const recentOverstays = overstayRows.map(o => ({
    Session_ID: o.Session_ID,
    Vehicle_Number: o.Vehicle_Number,
    Bay_Number: o.Bay_Number,
    Lot_Name: o.Lot_Name,
    Overstay_Minutes: Number(o.Overstay_Minutes || 0),
    Penalty_Amount: Number(o.Penalty_Amount || 0),
    Status: o.Exit_Time ? 'Barrier Cleared' : 'Active Live'
  }));

  const statsPayload = {
    totalRevenue,
    pendingRevenue,
    pendingPayments,
    totalBays,
    occupiedBays,
    reservedBays,
    availableBays,
    overallOccupancyPct,
    occupancyPercent: overallOccupancyPct,
    activeSessions,
    activeSessionsCount,
    overstayCount,
    occupancyByLot,
    lotChartData,
    revenueByDay,
    revenueTrend,
    recentOverstays,
    overstays: recentOverstays
  };

  return ok(res, statsPayload, 'Admin statistics compiled.');
}));

// =========================================================================
// 2. Parking Lots CRUD
// =========================================================================

/**
 * GET /api/admin/lots - List all facilities
 */
router.get('/lots', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT Lot_ID, Lot_Name, Location, Open_Time, Close_Time,
           Total_Bays, Available_Bays, Reserved_Bays, Occupied_Bays,
           Occupancy_Percent
    FROM v_lot_availability
    ORDER BY Lot_ID ASC
  `);

  const lots = rows.map(l => ({
    ...l,
    Occupancy_Percentage: Number(l.Occupancy_Percent || 0)
  }));

  return ok(res, lots, 'Parking lots retrieved.');
}));

/**
 * Validation rules for adding parking lots
 */
const addLotRules = [
  body('Lot_Name').trim().notEmpty().withMessage('Facility name is required.'),
  body('Location').trim().notEmpty().withMessage('Location address is required.'),
  body('Total_Bays').isInt({ min: 1 }).withMessage('Total bays must be a positive integer.'),
  body('Open_Time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Valid Open_Time (HH:MM or HH:MM:SS) required.'),
  body('Close_Time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Valid Close_Time (HH:MM or HH:MM:SS) required.')
];

/**
 * POST /api/admin/lots - Create municipal facility and provision initial bay layout
 */
router.post('/lots', addLotRules, validate, asyncHandler(async (req, res) => {
  const lotName = req.body.Lot_Name.trim();
  const location = req.body.Location.trim();
  const totalBays = Number(req.body.Total_Bays);
  const openTime = normalizeTime(req.body.Open_Time);
  const closeTime = normalizeTime(req.body.Close_Time);

  if (openTime >= closeTime && closeTime !== '23:59:59') {
    return fail(res, 400, 'Open time must be earlier than close time.');
  }

  // Insert facility record
  const [result] = await pool.query(
    'INSERT INTO parking_lot (Lot_Name, Location, Total_Bays, Open_Time, Close_Time) VALUES (?, ?, ?, ?, ?)',
    [lotName, location, totalBays, openTime, closeTime]
  );
  const lotId = result.insertId;

  // Provision default bays across 3 floors
  const perFloor = Math.ceil(totalBays / 3);
  const bayInserts = [];
  let count = 0;

  for (let f = 1; f <= 3; f++) {
    for (let s = 1; s <= perFloor; s++) {
      if (count >= totalBays) break;
      count++;
      const bayNum = `F${f}-${String(s).padStart(2, '0')}`;
      const bayType = s <= 2 ? 'EV' : (s === 3 ? 'Disabled' : (s <= 5 ? 'Compact' : 'Regular'));
      bayInserts.push([bayNum, f, bayType, 'Available', lotId]);
    }
  }

  if (bayInserts.length > 0) {
    await pool.query(
      'INSERT INTO parking_bay (Bay_Number, Floor, Bay_Type, Status, Lot_ID) VALUES ?',
      [bayInserts]
    );
  }

  const newLot = {
    Lot_ID: lotId,
    Lot_Name: lotName,
    Location: location,
    Total_Bays: totalBays,
    Open_Time: openTime,
    Close_Time: closeTime
  };

  return ok(res, newLot, 'Parking lot created with default bays.', 201);
}));

/**
 * PUT /api/admin/lots/:id - Update facility hours or details
 */
const updateLotRules = [
  param('id').isInt({ min: 1 }).withMessage('Invalid lot ID.'),
  body('Lot_Name').trim().notEmpty().withMessage('Facility name is required.'),
  body('Location').trim().notEmpty().withMessage('Location is required.'),
  body('Open_Time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Valid Open_Time required.'),
  body('Close_Time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage('Valid Close_Time required.')
];

router.put('/lots/:id', updateLotRules, validate, asyncHandler(async (req, res) => {
  const lotId = Number(req.params.id);
  const lotName = req.body.Lot_Name.trim();
  const location = req.body.Location.trim();
  const openTime = normalizeTime(req.body.Open_Time);
  const closeTime = normalizeTime(req.body.Close_Time);

  if (openTime >= closeTime && closeTime !== '23:59:59') {
    return fail(res, 400, 'Open time must be earlier than close time.');
  }

  const [existing] = await pool.query('SELECT Lot_ID FROM parking_lot WHERE Lot_ID = ?', [lotId]);
  if (existing.length === 0) {
    return fail(res, 404, 'Parking lot not found.');
  }

  await pool.query(
    'UPDATE parking_lot SET Lot_Name = ?, Location = ?, Open_Time = ?, Close_Time = ? WHERE Lot_ID = ?',
    [lotName, location, openTime, closeTime, lotId]
  );

  const [updated] = await pool.query('SELECT * FROM parking_lot WHERE Lot_ID = ?', [lotId]);
  return ok(res, updated[0], 'Parking lot updated successfully.');
}));

/**
 * DELETE /api/admin/lots/:id - Remove facility with reservation dependency check
 */
router.delete('/lots/:id', [
  param('id').isInt({ min: 1 }).withMessage('Invalid lot ID.')
], validate, asyncHandler(async (req, res) => {
  const lotId = Number(req.params.id);

  // Check if lot has active or upcoming reservations
  const [resRows] = await pool.query(`
    SELECT r.Reservation_ID
    FROM reservation r
    JOIN parking_bay b ON b.Bay_ID = r.Bay_ID
    WHERE b.Lot_ID = ? AND r.Status IN ('Upcoming', 'Active')
  `, [lotId]);

  if (resRows.length > 0) {
    return fail(res, 400, 'Cannot delete lot with active or scheduled reservations.');
  }

  await pool.query('DELETE FROM parking_lot WHERE Lot_ID = ?', [lotId]);
  return ok(res, null, 'Parking lot and associated bays deleted.');
}));

// =========================================================================
// 3. Parking Bays CRUD
// =========================================================================

/**
 * GET /api/admin/bays - List bays across all facilities with optional lot/floor filters
 */
router.get('/bays', [
  query('lot').optional().trim(),
  query('lotId').optional().trim(),
  query('floor').optional().trim()
], validate, asyncHandler(async (req, res) => {
  const rawLot = req.query.lot || req.query.lotId;
  const rawFloor = req.query.floor;

  let sql = `
    SELECT b.Bay_ID, b.Bay_Number, b.Floor, b.Bay_Type, b.Status, b.Lot_ID,
           l.Lot_Name
    FROM parking_bay b
    JOIN parking_lot l ON l.Lot_ID = b.Lot_ID
    WHERE 1=1
  `;
  const params = [];

  if (rawLot && rawLot.toLowerCase() !== 'all') {
    sql += ' AND b.Lot_ID = ?';
    params.push(Number(rawLot));
  }

  if (rawFloor && rawFloor.toLowerCase() !== 'all') {
    const fInt = parseFloorNumber(rawFloor);
    sql += ' AND b.Floor = ?';
    params.push(fInt);
  }

  sql += ' ORDER BY b.Lot_ID ASC, b.Floor ASC, b.Bay_Number ASC';

  const [rows] = await pool.query(sql, params);

  const bays = rows.map(b => ({
    ...b,
    Floor: `Floor ${b.Floor}`,
    Floor_Number: b.Floor
  }));

  return ok(res, bays, 'Bays retrieved.');
}));

/**
 * Validation rules for bay creation
 */
const addBayRules = [
  body('Lot_ID').isInt({ min: 1 }).withMessage('Valid Lot_ID is required.'),
  body('Bay_Number').trim().notEmpty().withMessage('Bay_Number is required.'),
  body('Floor').notEmpty().withMessage('Floor is required.'),
  body('Bay_Type')
    .optional()
    .isIn(['Regular', 'EV', 'Disabled', 'Compact']).withMessage('Bay_Type must be Regular, EV, Disabled, or Compact.'),
  body('Status')
    .optional()
    .isIn(['Available', 'Occupied', 'Reserved']).withMessage('Status must be Available, Occupied, or Reserved.')
];

/**
 * POST /api/admin/bays - Add a new bay to a facility
 */
router.post('/bays', addBayRules, validate, asyncHandler(async (req, res) => {
  const lotId = Number(req.body.Lot_ID);
  const bayNum = req.body.Bay_Number.trim().toUpperCase();
  const floorInt = parseFloorNumber(req.body.Floor);
  const bayType = req.body.Bay_Type || 'Regular';
  const status = req.body.Status || 'Available';

  const [result] = await pool.query(
    'INSERT INTO parking_bay (Bay_Number, Floor, Bay_Type, Status, Lot_ID) VALUES (?, ?, ?, ?, ?)',
    [bayNum, floorInt, bayType, status, lotId]
  );

  // Sync Total_Bays count on the parking lot
  await pool.query(
    'UPDATE parking_lot SET Total_Bays = (SELECT COUNT(*) FROM parking_bay WHERE Lot_ID = ?) WHERE Lot_ID = ?',
    [lotId, lotId]
  );

  const newBay = {
    Bay_ID: result.insertId,
    Bay_Number: bayNum,
    Floor: `Floor ${floorInt}`,
    Floor_Number: floorInt,
    Bay_Type: bayType,
    Status: status,
    Lot_ID: lotId
  };

  return ok(res, newBay, 'Parking bay added successfully.', 201);
}));

/**
 * PUT /api/admin/bays/:id - Update bay properties
 */
const updateBayRules = [
  param('id').isInt({ min: 1 }).withMessage('Invalid bay ID.'),
  body('Bay_Number').trim().notEmpty().withMessage('Bay_Number is required.'),
  body('Floor').notEmpty().withMessage('Floor is required.'),
  body('Bay_Type').optional().isIn(['Regular', 'EV', 'Disabled', 'Compact']).withMessage('Invalid Bay_Type.'),
  body('Status').optional().isIn(['Available', 'Occupied', 'Reserved']).withMessage('Invalid Status.')
];

router.put('/bays/:id', updateBayRules, validate, asyncHandler(async (req, res) => {
  const bayId = Number(req.params.id);
  const bayNum = req.body.Bay_Number.trim().toUpperCase();
  const floorInt = parseFloorNumber(req.body.Floor);
  const bayType = req.body.Bay_Type || 'Regular';
  const status = req.body.Status || 'Available';

  const [existing] = await pool.query('SELECT Bay_ID, Lot_ID FROM parking_bay WHERE Bay_ID = ?', [bayId]);
  if (existing.length === 0) {
    return fail(res, 404, 'Parking bay not found.');
  }

  await pool.query(
    'UPDATE parking_bay SET Bay_Number = ?, Floor = ?, Bay_Type = ?, Status = ? WHERE Bay_ID = ?',
    [bayNum, floorInt, bayType, status, bayId]
  );

  const updatedBay = {
    Bay_ID: bayId,
    Bay_Number: bayNum,
    Floor: `Floor ${floorInt}`,
    Floor_Number: floorInt,
    Bay_Type: bayType,
    Status: status,
    Lot_ID: existing[0].Lot_ID
  };

  return ok(res, updatedBay, 'Parking bay updated.');
}));

/**
 * DELETE /api/admin/bays/:id - Delete bay with reservation check
 */
router.delete('/bays/:id', [
  param('id').isInt({ min: 1 }).withMessage('Invalid bay ID.')
], validate, asyncHandler(async (req, res) => {
  const bayId = Number(req.params.id);

  // Check if bay has active or upcoming reservations
  const [activeRes] = await pool.query(
    'SELECT Reservation_ID FROM reservation WHERE Bay_ID = ? AND Status IN (?, ?)',
    [bayId, 'Upcoming', 'Active']
  );

  if (activeRes.length > 0) {
    return fail(res, 400, 'Cannot delete bay currently reserved or in an active session.');
  }

  const [existing] = await pool.query('SELECT Lot_ID FROM parking_bay WHERE Bay_ID = ?', [bayId]);
  if (existing.length === 0) {
    return fail(res, 404, 'Parking bay not found.');
  }

  const lotId = existing[0].Lot_ID;
  await pool.query('DELETE FROM parking_bay WHERE Bay_ID = ?', [bayId]);

  // Recalculate Total_Bays count
  await pool.query(
    'UPDATE parking_lot SET Total_Bays = (SELECT COUNT(*) FROM parking_bay WHERE Lot_ID = ?) WHERE Lot_ID = ?',
    [lotId, lotId]
  );

  return ok(res, null, 'Parking bay deleted.');
}));

// =========================================================================
// 4. Users CRUD
// =========================================================================

/**
 * GET /api/admin/users - List users and administrators with activity counters
 */
router.get('/users', [
  query('role').optional().trim(),
  query('search').optional().trim()
], validate, asyncHandler(async (req, res) => {
  const roleFilter = req.query.role;
  const search = req.query.search;

  // Retrieve users with vehicles and reservation counts
  let sql = `
    SELECT
      u.User_ID, u.Name, u.Email, u.Phone, u.Role,
      COUNT(DISTINCT v.Vehicle_ID) AS Vehicle_Count,
      COUNT(DISTINCT r.Reservation_ID) AS Reservation_Count
    FROM users u
    LEFT JOIN vehicle v ON v.User_ID = u.User_ID
    LEFT JOIN reservation r ON r.Vehicle_ID = v.Vehicle_ID
    WHERE 1=1
  `;
  const params = [];

  if (roleFilter && roleFilter.toLowerCase() !== 'all') {
    sql += ' AND LOWER(u.Role) = LOWER(?)';
    params.push(roleFilter);
  }

  if (search) {
    sql += ' AND (u.Name LIKE ? OR u.Email LIKE ? OR u.Phone LIKE ? OR CAST(u.User_ID AS CHAR) LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q, q, q);
  }

  sql += ' GROUP BY u.User_ID, u.Name, u.Email, u.Phone, u.Role ORDER BY u.User_ID ASC';

  const [rows] = await pool.query(sql, params);

  // Also include records from admin table if role allows
  let allAccounts = rows.map(u => ({
    ...u,
    Vehicle_Count: Number(u.Vehicle_Count || 0),
    Reservation_Count: Number(u.Reservation_Count || 0)
  }));

  if (!roleFilter || roleFilter.toLowerCase() === 'all' || roleFilter.toLowerCase() === 'admin') {
    const [adminRows] = await pool.query('SELECT Admin_ID, Name, Email, Lot_ID FROM admin');
    const existingEmails = new Set(allAccounts.map(a => a.Email.toLowerCase()));

    adminRows.forEach(a => {
      if (!existingEmails.has(a.Email.toLowerCase())) {
        allAccounts.push({
          User_ID: a.Admin_ID + 1000,
          Admin_ID: a.Admin_ID,
          Name: a.Name,
          Email: a.Email,
          Phone: '9876543210',
          Role: 'Admin',
          Vehicle_Count: 0,
          Reservation_Count: 0
        });
      }
    });
  }

  return ok(res, allAccounts, 'Users retrieved.');
}));

/**
 * Validation rules for user creation
 */
const addUserRules = [
  body('Name').trim().notEmpty().withMessage('Name is required.'),
  body('Email').trim().isEmail().withMessage('Valid email address is required.'),
  body('Phone').trim().matches(/^[0-9]{10}$/).withMessage('Phone number must be exactly 10 digits.'),
  body('Password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('Role').optional().isIn(['User', 'Admin']).withMessage('Role must be User or Admin.')
];

/**
 * POST /api/admin/users - Register an account
 */
router.post('/users', addUserRules, validate, asyncHandler(async (req, res) => {
  const { Name, Email, Phone, Password = 'password123', Role = 'User' } = req.body;
  const cleanEmail = Email.trim().toLowerCase();

  const [existing] = await pool.query('SELECT User_ID FROM users WHERE LOWER(Email) = ?', [cleanEmail]);
  if (existing.length > 0) {
    return fail(res, 409, 'User with this email already exists.');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(Password, salt);

  const [result] = await pool.query(
    'INSERT INTO users (Name, Email, Phone, Password, Role) VALUES (?, ?, ?, ?, ?)',
    [Name.trim(), cleanEmail, Phone.trim(), hashedPassword, Role]
  );

  // If Role is Admin, also insert into admin table so admin login works
  if (Role === 'Admin') {
    const [adminExist] = await pool.query('SELECT Admin_ID FROM admin WHERE LOWER(Email) = ?', [cleanEmail]);
    if (adminExist.length === 0) {
      await pool.query(
        'INSERT INTO admin (Name, Email, Password, Lot_ID) VALUES (?, ?, ?, NULL)',
        [Name.trim(), cleanEmail, hashedPassword]
      );
    }
  }

  const newUser = {
    User_ID: result.insertId,
    Name: Name.trim(),
    Email: cleanEmail,
    Phone: Phone.trim(),
    Role
  };

  return ok(res, newUser, 'User created successfully.', 201);
}));

/**
 * PUT /api/admin/users/:id - Update user metadata
 */
const updateUserRules = [
  param('id').isInt({ min: 1 }).withMessage('Invalid user ID.'),
  body('Name').trim().notEmpty().withMessage('Name is required.'),
  body('Email').trim().isEmail().withMessage('Valid email is required.'),
  body('Phone').trim().matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits.'),
  body('Role').optional().isIn(['User', 'Admin']).withMessage('Invalid role.')
];

router.put('/users/:id', updateUserRules, validate, asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  const { Name, Email, Phone, Role = 'User' } = req.body;
  const cleanEmail = Email.trim().toLowerCase();

  // Check email uniqueness across other users
  const [duplicate] = await pool.query(
    'SELECT User_ID FROM users WHERE LOWER(Email) = ? AND User_ID <> ?',
    [cleanEmail, userId]
  );
  if (duplicate.length > 0) {
    return fail(res, 409, 'Email is already taken by another user.');
  }

  await pool.query(
    'UPDATE users SET Name = ?, Email = ?, Phone = ?, Role = ? WHERE User_ID = ?',
    [Name.trim(), cleanEmail, Phone.trim(), Role, userId]
  );

  const updatedUser = {
    User_ID: userId,
    Name: Name.trim(),
    Email: cleanEmail,
    Phone: Phone.trim(),
    Role
  };

  return ok(res, updatedUser, 'User updated successfully.');
}));

/**
 * DELETE /api/admin/users/:id - Delete driver account (cascades vehicles)
 */
router.delete('/users/:id', [
  param('id').isInt({ min: 1 }).withMessage('Invalid user ID.')
], validate, asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);

  // Preserve seeded primary demo accounts from deletion
  if (userId === 1) {
    return fail(res, 400, 'Demo primary accounts cannot be deleted.');
  }

  await pool.query('DELETE FROM users WHERE User_ID = ?', [userId]);
  return ok(res, null, 'User account and registered vehicles removed.');
}));

// =========================================================================
// 5. Full Lists & Ledger Queries for Admin Export
// =========================================================================

/**
 * GET /api/admin/vehicles - All vehicles with owner details
 */
router.get('/vehicles', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT v.Vehicle_ID, v.Vehicle_Number, v.RFID_Tag, v.Brand, v.Color, v.User_ID,
           u.Name AS Owner_Name, u.Email AS Owner_Email
    FROM vehicle v
    JOIN users u ON u.User_ID = v.User_ID
    ORDER BY v.Vehicle_ID DESC
  `);
  return ok(res, rows, 'All vehicles retrieved.');
}));

/**
 * GET /api/admin/reservations - Master reservation ledger
 */
router.get('/reservations', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
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
    ORDER BY r.Reservation_ID DESC
  `);

  const reservations = rows.map(r => ({
    ...r,
    Floor: `Floor ${r.Floor}`,
    Floor_Number: r.Floor
  }));

  return ok(res, reservations, 'All reservations retrieved.');
}));

/**
 * GET /api/admin/sessions - Master session ledger
 */
router.get('/sessions', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
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
    ORDER BY s.Session_ID DESC
  `);

  const sessions = rows.map(s => ({
    ...s,
    Duration: s.Exit_Time ? `${Math.floor((s.Duration_Minutes || 0) / 60)}h ${(s.Duration_Minutes || 0) % 60}m` : 'Live',
    Floor: `Floor ${s.Floor}`,
    Floor_Number: s.Floor
  }));

  return ok(res, sessions, 'All sessions retrieved.');
}));

/**
 * GET /api/admin/payments - Master payment ledger
 */
router.get('/payments', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
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
    ORDER BY p.Payment_ID DESC
  `);
  return ok(res, rows, 'All payments retrieved.');
}));

module.exports = router;
