// test/booking-flow-test.js - Automated booking flow verification test suite
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

async function runBookingFlowTest() {
  console.log('======================================================================');
  console.log('  ParkSmart - Booking Flow MySQL Integration Test');
  console.log('======================================================================\n');

  let testUserId = null;
  let userToken = null;
  let testVehicleId = null;
  let testBayId = null;
  let testResId = null;
  let testPaymentId = null;

  try {
    // 1. Register fresh test user and log in
    console.log('--- Step 1: User Registration & Login ---');
    const emailSuffix = Date.now().toString().slice(-6);
    const regRes = await request('/auth/register', 'POST', {
      Name: 'Flow Test Driver',
      Email: `flow_${emailSuffix}@parksmart.test`,
      Phone: `91${emailSuffix}12`,
      Password: 'Password@123',
      Role: 'User'
    });
    const isRegOk = regRes.status === 201 && !!regRes.body?.data?.token;
    report('1. Register fresh test user and receive JWT', isRegOk, regRes.body?.data?.user?.Email);
    if (!isRegOk) throw new Error('User registration failed');
    userToken = regRes.body.data.token;
    testUserId = regRes.body.data.user.User_ID;

    // 2. Register vehicle 'MP09-TEST-99'
    console.log('\n--- Step 2: Register Vehicle ---');
    const vehRes = await request('/vehicles', 'POST', {
      Vehicle_Number: 'MP09-TEST-99',
      Brand: 'Hyundai Creta',
      Color: '#10B981'
    }, userToken);
    testVehicleId = vehRes.body?.data?.Vehicle_ID;
    const isVehOk = vehRes.status === 201 && !!testVehicleId;
    report('2. Register vehicle MP09-TEST-99', isVehOk, `Vehicle_ID: ${testVehicleId}`);

    // 3. Find an available bay
    console.log('\n--- Step 3: Find Available Bay ---');
    const baysRes = await request('/lots/1/bays', 'GET');
    const availBay = (baysRes.body?.data || []).find(b => b.Status === 'Available');
    if (!availBay) throw new Error('No available bays in lot 1');
    testBayId = availBay.Bay_ID;
    report('3. Pick available bay from facility', true, `Bay #${testBayId} (${availBay.Bay_Number})`);

    // 4. Create reservation for tomorrow 10:00 to 12:00
    console.log('\n--- Step 4: Create Reservation ---');
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const createRes = await request('/reservations', 'POST', {
      Vehicle_ID: testVehicleId,
      Bay_ID: testBayId,
      Booking_Date: tomorrow,
      Start_Time: '10:00:00',
      End_Time: '12:00:00'
    }, userToken);
    testResId = createRes.body?.data?.Reservation_ID;
    testPaymentId = createRes.body?.data?.Payment_ID;
    const isResCreated = createRes.status === 201 && !!testResId;
    report('4. POST /api/reservations returns 201', isResCreated, `Reservation_ID: ${testResId}`);

    // 5. Verify reservation row in MySQL with Status = 'Upcoming' or 'Active'
    console.log('\n--- Step 5: Verify Reservation Row in MySQL ---');
    const [resRows] = await pool.query('SELECT * FROM reservation WHERE Reservation_ID = ?', [testResId]);
    const isResInDb = resRows.length === 1 &&
                      (resRows[0].Status === 'Upcoming' || resRows[0].Status === 'Active') &&
                      resRows[0].Vehicle_ID === testVehicleId &&
                      resRows[0].Bay_ID === testBayId;
    report('5. Verify reservation row in MySQL with Status Upcoming/Active', isResInDb, `Status: ${resRows[0]?.Status}`);

    // 6. Verify payment row in MySQL with Payment_Type = 'Reservation Fee'
    console.log('\n--- Step 6: Verify Payment Row in MySQL ---');
    const [payRows] = await pool.query('SELECT * FROM payment WHERE Reservation_ID = ?', [testResId]);
    const isPayInDb = payRows.length === 1 &&
                      payRows[0].Payment_Type === 'Reservation Fee' &&
                      Number(payRows[0].Amount) > 0;
    report('6. Verify payment row in MySQL with Payment_Type Reservation Fee', isPayInDb, `Amount: ₹${payRows[0]?.Amount}`);

    // 7. Verify bay status in MySQL updated to 'Reserved'
    console.log('\n--- Step 7: Verify Bay Status Updated ---');
    const [bayRows] = await pool.query('SELECT Status FROM parking_bay WHERE Bay_ID = ?', [testBayId]);
    const isBayReserved = bayRows[0]?.Status === 'Reserved';
    report('7. Verify bay status in MySQL updated to Reserved', isBayReserved, `Status: ${bayRows[0]?.Status}`);

    // 8. Call GET /api/reservations as this user, verify reservation in list
    console.log('\n--- Step 8: GET /api/reservations ---');
    const listRes = await request('/reservations', 'GET', null, userToken);
    const userResList = listRes.body?.data || [];
    const isInList = userResList.some(r => r.Reservation_ID === testResId);
    report('8. GET /api/reservations includes the newly created reservation', isInList, `List count: ${userResList.length}`);

    // 9. Cancel the reservation
    console.log('\n--- Step 9: Cancel Reservation ---');
    const cancelRes = await request(`/reservations/${testResId}/cancel`, 'PATCH', null, userToken);
    const isCancelOk = cancelRes.status === 200 && cancelRes.body?.success === true;
    report('9. PATCH /api/reservations/:id/cancel returns 200', isCancelOk);

    // 10. Verify reservation Status = 'Cancelled' and bay status returned to 'Available'
    console.log('\n--- Step 10: Verify Cancellation & Bay Release in MySQL ---');
    const [cancelledResRows] = await pool.query('SELECT Status FROM reservation WHERE Reservation_ID = ?', [testResId]);
    const isCancelledInDb = cancelledResRows[0]?.Status === 'Cancelled';
    report('10a. Verify reservation row in MySQL updated to Status = Cancelled', isCancelledInDb);

    const [freedBayRows] = await pool.query('SELECT Status FROM parking_bay WHERE Bay_ID = ?', [testBayId]);
    const isBayFreedInDb = freedBayRows[0]?.Status === 'Available';
    report('10b. Verify bay status in MySQL returned to Available', isBayFreedInDb, `Status: ${freedBayRows[0]?.Status}`);

  } catch (err) {
    console.error('[ERROR during booking-flow-test]:', err.message);
  } finally {
    // 11. Clean up: delete test reservation, test payment, test vehicle, test user
    console.log('\n--- Step 11: DB Artifact Cleanup ---');
    try {
      if (testResId) {
        await pool.query('DELETE FROM payment WHERE Reservation_ID = ?', [testResId]);
        await pool.query('DELETE FROM reservation WHERE Reservation_ID = ?', [testResId]);
      }
      if (testVehicleId) {
        await pool.query('DELETE FROM vehicle WHERE Vehicle_ID = ?', [testVehicleId]);
      }
      if (testUserId) {
        await pool.query('DELETE FROM users WHERE User_ID = ?', [testUserId]);
      }
      if (testBayId) {
        await pool.query("UPDATE parking_bay SET Status = 'Available' WHERE Bay_ID = ?", [testBayId]);
      }

      const [leftoverRes] = await pool.query('SELECT COUNT(*) AS c FROM vehicle WHERE Vehicle_Number = ?', ['MP09-TEST-99']);
      const isClean = Number(leftoverRes[0].c) === 0;
      report('11. Verify DB clean (zero test artifacts remain)', isClean);
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr.message);
    }

    console.log('\n======================================================================');
    console.log(`  Booking Flow Summary: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
    console.log('======================================================================\n');

    process.exit(passedTests === totalTests ? 0 : 1);
  }
}

runBookingFlowTest();
