// routes/lots.routes.js - Public parking facility and bay telemetry reads
const express = require('express');
const router = express.Router();
const { param, query } = require('express-validator');
const pool = require('../config/db');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { ok, fail } = require('../utils/response');

/**
 * GET /api/lots - List all municipal parking facilities with live availability metrics
 */
router.get('/', asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT l.Lot_ID, l.Lot_Name, l.Location, l.Open_Time, l.Close_Time,
           COALESCE(NULLIF(COUNT(b.Bay_ID), 0), l.Total_Bays, 0) AS Total_Bays,
           COALESCE(SUM(b.Status = 'Available'), 0) AS Available_Bays,
           COALESCE(SUM(b.Status = 'Reserved'), 0) AS Reserved_Bays,
           COALESCE(SUM(b.Status = 'Occupied'), 0) AS Occupied_Bays,
           ROUND(COALESCE(100 * SUM(b.Status <> 'Available') / NULLIF(COUNT(b.Bay_ID), 0), 0), 1) AS Occupancy_Percent
    FROM parking_lot l
    LEFT JOIN parking_bay b ON b.Lot_ID = l.Lot_ID
    GROUP BY l.Lot_ID, l.Lot_Name, l.Location, l.Open_Time, l.Close_Time, l.Total_Bays
    ORDER BY l.Lot_ID ASC
  `);

  // Map each lot to include both Occupancy_Percent and Occupancy_Percentage for frontend compatibility
  const lots = rows.map(l => ({
    ...l,
    Available_Bays: Number(l.Available_Bays || 0),
    Reserved_Bays: Number(l.Reserved_Bays || 0),
    Occupied_Bays: Number(l.Occupied_Bays || 0),
    Total_Bays: Number(l.Total_Bays || 0),
    Occupancy_Percent: Number(l.Occupancy_Percent || 0),
    Occupancy_Percentage: Number(l.Occupancy_Percent || 0)
  }));

  return ok(res, lots, 'Parking lots retrieved.');
}));

/**
 * GET /api/lots/:id - Retrieve individual facility details
 */
router.get('/:id', [
  param('id').isInt({ min: 1 }).withMessage('Invalid parking lot ID.')
], validate, asyncHandler(async (req, res) => {
  const lotId = Number(req.params.id);
  const [rows] = await pool.query(`
    SELECT l.Lot_ID, l.Lot_Name, l.Location, l.Open_Time, l.Close_Time,
           COALESCE(NULLIF(COUNT(b.Bay_ID), 0), l.Total_Bays, 0) AS Total_Bays,
           COALESCE(SUM(b.Status = 'Available'), 0) AS Available_Bays,
           COALESCE(SUM(b.Status = 'Reserved'), 0) AS Reserved_Bays,
           COALESCE(SUM(b.Status = 'Occupied'), 0) AS Occupied_Bays,
           ROUND(COALESCE(100 * SUM(b.Status <> 'Available') / NULLIF(COUNT(b.Bay_ID), 0), 0), 1) AS Occupancy_Percent
    FROM parking_lot l
    LEFT JOIN parking_bay b ON b.Lot_ID = l.Lot_ID
    WHERE l.Lot_ID = ?
    GROUP BY l.Lot_ID, l.Lot_Name, l.Location, l.Open_Time, l.Close_Time, l.Total_Bays
  `, [lotId]);

  if (rows.length === 0) {
    return fail(res, 404, 'Parking lot not found.');
  }

  const lot = {
    ...rows[0],
    Available_Bays: Number(rows[0].Available_Bays || 0),
    Reserved_Bays: Number(rows[0].Reserved_Bays || 0),
    Occupied_Bays: Number(rows[0].Occupied_Bays || 0),
    Total_Bays: Number(rows[0].Total_Bays || 0),
    Occupancy_Percent: Number(rows[0].Occupancy_Percent || 0),
    Occupancy_Percentage: Number(rows[0].Occupancy_Percent || 0)
  };

  return ok(res, lot, 'Lot details retrieved.');
}));

/**
 * GET /api/lots/:id/bays - Get bay grid for a facility, with optional floor filter
 */
router.get('/:id/bays', [
  param('id').isInt({ min: 1 }).withMessage('Invalid parking lot ID.'),
  query('floor').optional().trim()
], validate, asyncHandler(async (req, res) => {
  const lotId = Number(req.params.id);
  const rawFloor = req.query.floor;

  let sql = `
    SELECT Bay_ID, Bay_Number, Floor, Bay_Type, Status, Lot_ID
    FROM parking_bay
    WHERE Lot_ID = ?
  `;
  const params = [lotId];

  if (rawFloor && rawFloor.toLowerCase() !== 'all') {
    // Extract integer from floor string if e.g. "Floor 1" or "1"
    const parsedFloor = parseInt(String(rawFloor).replace(/\D/g, ''), 10);
    if (!isNaN(parsedFloor)) {
      sql += ' AND Floor = ?';
      params.push(parsedFloor);
    }
  }

  sql += ' ORDER BY Floor ASC, Bay_Number ASC';

  const [rows] = await pool.query(sql, params);

  // Return Floor as "Floor X" (string) so frontend .toLowerCase() calls do not throw,
  // and also provide Floor_Number as the integer
  const bays = rows.map(b => ({
    ...b,
    Floor: `Floor ${b.Floor}`,
    Floor_Number: b.Floor
  }));

  return ok(res, bays, 'Bays retrieved.');
}));

module.exports = router;
