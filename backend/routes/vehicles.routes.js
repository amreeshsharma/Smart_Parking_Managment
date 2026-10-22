// routes/vehicles.routes.js - Driver vehicle management and ownership checks
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
 * GET /api/vehicles - List vehicles (own vehicles for Driver, all or filtered for Admin)
 */
router.get('/', [
  query('userId').optional().isInt({ min: 1 }).withMessage('userId must be a positive integer.')
], validate, asyncHandler(async (req, res) => {
  const isDriver = req.user.role.toLowerCase() === 'user';
  const requestedUserId = req.query.userId ? Number(req.query.userId) : null;

  let sql;
  let params = [];

  if (isDriver) {
    // Drivers only view their own fleet
    sql = `
      SELECT v.Vehicle_ID, v.Vehicle_Number, v.RFID_Tag, v.Brand, v.Color, v.User_ID
      FROM vehicle v
      WHERE v.User_ID = ?
      ORDER BY v.Vehicle_ID DESC
    `;
    params = [req.user.id];
  } else {
    // Admins view all vehicles with owner information
    if (requestedUserId) {
      sql = `
        SELECT v.Vehicle_ID, v.Vehicle_Number, v.RFID_Tag, v.Brand, v.Color, v.User_ID,
               u.Name AS Owner_Name, u.Email AS Owner_Email
        FROM vehicle v
        JOIN users u ON u.User_ID = v.User_ID
        WHERE v.User_ID = ?
        ORDER BY v.Vehicle_ID DESC
      `;
      params = [requestedUserId];
    } else {
      sql = `
        SELECT v.Vehicle_ID, v.Vehicle_Number, v.RFID_Tag, v.Brand, v.Color, v.User_ID,
               u.Name AS Owner_Name, u.Email AS Owner_Email
        FROM vehicle v
        JOIN users u ON u.User_ID = v.User_ID
        ORDER BY v.Vehicle_ID DESC
      `;
    }
  }

  const [rows] = await pool.query(sql, params);
  return ok(res, rows, 'Vehicles retrieved.');
}));

/**
 * POST /api/vehicles - Register a new vehicle
 */
const addVehicleRules = [
  body('Vehicle_Number')
    .trim()
    .notEmpty().withMessage('Vehicle registration number is required.')
    .isLength({ max: 15 }).withMessage('Vehicle number cannot exceed 15 characters.'),
  body('RFID_Tag')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('RFID Tag cannot exceed 30 characters.'),
  body('Brand')
    .trim()
    .notEmpty().withMessage('Brand and model are required.')
    .isLength({ max: 50 }).withMessage('Brand cannot exceed 50 characters.'),
  body('Color')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('Color cannot exceed 30 characters.')
];

router.post('/', addVehicleRules, validate, asyncHandler(async (req, res) => {
  const plate = req.body.Vehicle_Number.trim().toUpperCase();
  const rfid = (req.body.RFID_Tag || `RFID-IND-${Math.floor(1000 + Math.random() * 9000)}`).trim().toUpperCase();
  const brand = req.body.Brand.trim();
  const color = (req.body.Color || '#1E3A8A').trim();

  // If Admin is registering for a user, use provided User_ID, else use token id
  const targetUserId = (req.user.role.toLowerCase() === 'admin' && req.body.User_ID)
    ? Number(req.body.User_ID)
    : req.user.id;

  // Insert into vehicle table
  const [result] = await pool.query(
    'INSERT INTO vehicle (Vehicle_Number, RFID_Tag, Brand, Color, User_ID) VALUES (?, ?, ?, ?, ?)',
    [plate, rfid, brand, color, targetUserId]
  );

  const newVehicle = {
    Vehicle_ID: result.insertId,
    Vehicle_Number: plate,
    RFID_Tag: rfid,
    Brand: brand,
    Color: color,
    User_ID: targetUserId
  };

  return ok(res, newVehicle, 'Vehicle registered successfully.', 201);
}));

/**
 * PUT /api/vehicles/:id - Update an existing vehicle
 */
const updateVehicleRules = [
  param('id').isInt({ min: 1 }).withMessage('Invalid vehicle ID.'),
  body('Vehicle_Number').optional().trim().notEmpty().withMessage('Vehicle number cannot be empty.'),
  body('RFID_Tag').optional().trim().notEmpty().withMessage('RFID tag cannot be empty.'),
  body('Brand').optional().trim().notEmpty().withMessage('Brand cannot be empty.'),
  body('Color').optional().trim()
];

router.put('/:id', updateVehicleRules, validate, asyncHandler(async (req, res) => {
  const vehicleId = Number(req.params.id);

  // Check vehicle existence and verify ownership
  const [existing] = await pool.query('SELECT Vehicle_ID, Vehicle_Number, RFID_Tag, Brand, Color, User_ID FROM vehicle WHERE Vehicle_ID = ?', [vehicleId]);
  if (existing.length === 0) {
    return fail(res, 404, 'Vehicle not found.');
  }

  const isOwner = existing[0].User_ID === req.user.id;
  const isAdmin = req.user.role.toLowerCase() === 'admin';
  if (!isOwner && !isAdmin) {
    return fail(res, 403, 'Forbidden: You do not own this vehicle.');
  }

  const plate = req.body.Vehicle_Number ? req.body.Vehicle_Number.trim().toUpperCase() : existing[0].Vehicle_Number;
  const rfid = req.body.RFID_Tag ? req.body.RFID_Tag.trim().toUpperCase() : existing[0].RFID_Tag;
  const brand = req.body.Brand ? req.body.Brand.trim() : existing[0].Brand;
  const color = req.body.Color !== undefined ? req.body.Color.trim() : existing[0].Color;

  // Update vehicle details
  await pool.query(
    'UPDATE vehicle SET Vehicle_Number = ?, RFID_Tag = ?, Brand = ?, Color = ? WHERE Vehicle_ID = ?',
    [plate, rfid, brand, color, vehicleId]
  );

  const updatedVehicle = {
    Vehicle_ID: vehicleId,
    Vehicle_Number: plate,
    RFID_Tag: rfid,
    Brand: brand,
    Color: color,
    User_ID: existing[0].User_ID
  };

  return ok(res, updatedVehicle, 'Vehicle updated successfully.');
}));

/**
 * DELETE /api/vehicles/:id - Delete vehicle with reservation dependency check
 */
router.delete('/:id', [
  param('id').isInt({ min: 1 }).withMessage('Invalid vehicle ID.')
], validate, asyncHandler(async (req, res) => {
  const vehicleId = Number(req.params.id);

  // Check vehicle existence and ownership
  const [existing] = await pool.query('SELECT Vehicle_ID, User_ID FROM vehicle WHERE Vehicle_ID = ?', [vehicleId]);
  if (existing.length === 0) {
    return fail(res, 404, 'Vehicle not found.');
  }

  const isOwner = existing[0].User_ID === req.user.id;
  const isAdmin = req.user.role.toLowerCase() === 'admin';
  if (!isOwner && !isAdmin) {
    return fail(res, 403, 'Forbidden: You do not own this vehicle.');
  }

  // Block delete with a clear message if the vehicle has Upcoming/Active reservations
  const [activeRes] = await pool.query(
    'SELECT Reservation_ID FROM reservation WHERE Vehicle_ID = ? AND Status IN (?, ?)',
    [vehicleId, 'Upcoming', 'Active']
  );

  if (activeRes.length > 0) {
    return fail(res, 400, 'Cannot delete vehicle with active or upcoming reservations. Please complete or cancel them first.');
  }

  // Delete vehicle
  await pool.query('DELETE FROM vehicle WHERE Vehicle_ID = ?', [vehicleId]);
  return ok(res, null, 'Vehicle deleted successfully.');
}));

module.exports = router;
