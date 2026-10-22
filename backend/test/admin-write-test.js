// test/admin-write-test.js - Automated admin write-path verification suite
const pool = require('../config/db');
require('dotenv').config();

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

let totalTests = 0;
let passedTests = 0;

function report(name, passed, detail = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`[PASS] ${name}${detail ? ' - ' + detail : ''}`);
  } else {
    console.error(`[FAIL] ${name}${detail ? ' - ' + detail : ''}`);
  }
}

async function request(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json', 'x-test-suite': 'true' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  let data = null;
  try {
    data = await res.json();
  } catch (err) {}

  return { status: res.status, ok: res.ok, body: data };
}

async function runAdminWriteTest() {
  console.log('======================================================================');
  console.log('  ParkSmart - Admin Write-Path MySQL Integration Test');
  console.log('======================================================================\n');

  let adminToken = null;
  let testLotId = null;
  let testBayId = null;

  try {
    // 1. Log in as admin
    console.log('--- Step 1: Admin Authentication ---');
    const loginRes = await request('/auth/login', 'POST', {
      email: 'admin@parksmart.com',
      password: '123456',
      role: 'Admin'
    });
    const isLoginOk = loginRes.status === 200 && !!loginRes.body?.data?.token;
    report('1. Admin login (admin@parksmart.com)', isLoginOk);
    if (!isLoginOk) throw new Error('Admin authentication failed');
    adminToken = loginRes.body.data.token;

    // 2. Add lot 'Test Lot X', verify returned ID, verify row in MySQL
    console.log('\n--- Step 2: Add Parking Facility ---');
    const lotPayload = {
      Lot_Name: 'Test Lot X',
      Location: 'Zone 9 Highway Corridor, Indore',
      Total_Bays: 24,
      Open_Time: '06:00',
      Close_Time: '23:00'
    };
    const addLotRes = await request('/admin/lots', 'POST', lotPayload, adminToken);
    testLotId = addLotRes.body?.data?.Lot_ID;
    const isLotCreated = addLotRes.status === 201 && !!testLotId;
    report('2a. POST /api/admin/lots returns 201 with Lot_ID', isLotCreated, `Lot_ID: ${testLotId}`);

    const [lotRows] = await pool.query('SELECT * FROM parking_lot WHERE Lot_ID = ?', [testLotId]);
    const isLotInDb = lotRows.length === 1 &&
                      lotRows[0].Lot_Name === 'Test Lot X' &&
                      Number(lotRows[0].Total_Bays) === 24;
    report('2b. Verify row exists in MySQL parking_lot with exact Lot_Name and Total_Bays', isLotInDb);

    // 3. Add bay in 'Test Lot X', verify row in parking_bay
    console.log('\n--- Step 3: Add Bay in Test Facility ---');
    const bayPayload = {
      Lot_ID: testLotId,
      Bay_Number: 'TX-99',
      Floor: 'Floor 1',
      Bay_Type: 'Regular',
      Status: 'Available'
    };
    const addBayRes = await request('/admin/bays', 'POST', bayPayload, adminToken);
    testBayId = addBayRes.body?.data?.Bay_ID;
    const isBayCreated = addBayRes.status === 201 && !!testBayId;
    report('3a. POST /api/admin/bays returns 201 with Bay_ID', isBayCreated, `Bay_ID: ${testBayId}`);

    const [bayRows] = await pool.query('SELECT * FROM parking_bay WHERE Bay_ID = ?', [testBayId]);
    const isBayInDb = bayRows.length === 1 &&
                      bayRows[0].Bay_Number === 'TX-99' &&
                      bayRows[0].Lot_ID === testLotId &&
                      bayRows[0].Bay_Type === 'Regular';
    report('3b. Verify row in MySQL parking_bay table', isBayInDb);

    // 4. Update bay type to EV, verify row in parking_bay reflects change
    console.log('\n--- Step 4: Update Bay Type to EV ---');
    const updateBayRes = await request(`/admin/bays/${testBayId}`, 'PUT', {
      Lot_ID: testLotId,
      Bay_Number: 'TX-99',
      Floor: 'Floor 1',
      Bay_Type: 'EV',
      Status: 'Available'
    }, adminToken);
    const isBayUpdated = updateBayRes.status === 200 && updateBayRes.body?.success === true;
    report('4a. PUT /api/admin/bays/:id returns 200', isBayUpdated);

    const [updatedBayRows] = await pool.query('SELECT Bay_Type FROM parking_bay WHERE Bay_ID = ?', [testBayId]);
    const isBayTypeEvInDb = updatedBayRows[0]?.Bay_Type === 'EV';
    report('4b. Verify MySQL parking_bay.Bay_Type updated to EV', isBayTypeEvInDb);

    // 5. Delete the bay, verify row gone
    console.log('\n--- Step 5: Delete Bay ---');
    const delBayRes = await request(`/admin/bays/${testBayId}`, 'DELETE', null, adminToken);
    const isBayDeleted = delBayRes.status === 200 && delBayRes.body?.success === true;
    report('5a. DELETE /api/admin/bays/:id returns 200', isBayDeleted);

    const [postDelBayRows] = await pool.query('SELECT * FROM parking_bay WHERE Bay_ID = ?', [testBayId]);
    const isBayGoneFromDb = postDelBayRows.length === 0;
    report('5b. Verify bay row completely removed from MySQL parking_bay', isBayGoneFromDb);

    // 6. Delete the lot, verify row gone and Total_Bays consistent
    console.log('\n--- Step 6: Delete Lot ---');
    const delLotRes = await request(`/admin/lots/${testLotId}`, 'DELETE', null, adminToken);
    const isLotDeleted = delLotRes.status === 200 && delLotRes.body?.success === true;
    report('6a. DELETE /api/admin/lots/:id returns 200', isLotDeleted);

    const [postDelLotRows] = await pool.query('SELECT * FROM parking_lot WHERE Lot_ID = ?', [testLotId]);
    const [baysLeft] = await pool.query('SELECT COUNT(*) AS c FROM parking_bay WHERE Lot_ID = ?', [testLotId]);
    const isLotGoneFromDb = postDelLotRows.length === 0 && Number(baysLeft[0].c) === 0;
    report('6b. Verify lot row and all cascaded bays removed from MySQL', isLotGoneFromDb);

  } catch (err) {
    console.error('[ERROR during admin-write-test]:', err.message);
  } finally {
    // 7. Clean up: ensure no test artifact remains in DB
    console.log('\n--- Step 7: DB Artifact Cleanup ---');
    try {
      if (testBayId) {
        await pool.query('DELETE FROM parking_bay WHERE Bay_ID = ?', [testBayId]);
      }
      if (testLotId) {
        await pool.query('DELETE FROM parking_bay WHERE Lot_ID = ?', [testLotId]);
        await pool.query('DELETE FROM parking_lot WHERE Lot_ID = ?', [testLotId]);
      }
      const [leftoverLots] = await pool.query("SELECT COUNT(*) AS c FROM parking_lot WHERE Lot_Name = 'Test Lot X'");
      const isClean = Number(leftoverLots[0].c) === 0;
      report('7. Verify DB clean (zero leftover test artifacts)', isClean);
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr.message);
    }

    console.log('\n======================================================================');
    console.log(`  Admin Test Summary: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('======================================================================\n');

    process.exit(passedTests === totalTests ? 0 : 1);
  }
}

runAdminWriteTest();
