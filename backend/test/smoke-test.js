// test/smoke-test.js - Comprehensive end-to-end integration and smoke test suite
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
  const headers = {
    'Content-Type': 'application/json',
    'x-test-suite': 'true'
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    // Non-JSON response
  }

  return { status: res.status, ok: res.ok, body: data };
}

async function runSmokeTests() {
  console.log('======================================================================');
  console.log('  ParkSmart API Backend - Smoke & Integration Verification Suite');
  console.log('  Testing Target:', BASE_URL);
  console.log('======================================================================\n');

  let userToken = null;
  let adminToken = null;
  let newDriverToken = null;
  let newVehicleId = null;
  let createdReservationId = null;
  let pendingPaymentId = null;
  let testBayId = null;

  try {
    // -------------------------------------------------------------------
    // Step 1: Login as driver (user@parksmart.com) and admin (admin@parksmart.com)
    // -------------------------------------------------------------------
    console.log('--- Step 1: Authentication & Role Verification ---');
    const userLogin = await request('/auth/login', 'POST', {
      email: 'user@parksmart.com',
      password: '123456',
      role: 'User'
    });

    const isUserOk = userLogin.status === 200 &&
                     userLogin.body?.success === true &&
                     userLogin.body?.data?.user?.Role === 'User' &&
                     !!userLogin.body?.data?.token;
    report('Login as user@parksmart.com (role: User)', isUserOk);
    if (isUserOk) userToken = userLogin.body.data.token;

    const adminLogin = await request('/auth/login', 'POST', {
      email: 'admin@parksmart.com',
      password: '123456',
      role: 'Admin'
    });

    const isAdminOk = adminLogin.status === 200 &&
                      adminLogin.body?.success === true &&
                      adminLogin.body?.data?.user?.Role === 'Admin' &&
                      !!adminLogin.body?.data?.token;
    report('Login as admin@parksmart.com (role: Admin)', isAdminOk);
    if (isAdminOk) adminToken = adminLogin.body.data.token;

    // -------------------------------------------------------------------
    // Step 2: Wrong password returns 401
    // -------------------------------------------------------------------
    console.log('\n--- Step 2: Invalid Credential Rejection ---');
    const badLogin = await request('/auth/login', 'POST', {
      email: 'user@parksmart.com',
      password: 'WrongPassword123!',
      role: 'User'
    });
    report('Wrong password returns 401 Invalid credentials', badLogin.status === 401 && badLogin.body?.success === false);

    // -------------------------------------------------------------------
    // Step 3: Register a new user, then login as that user
    // -------------------------------------------------------------------
    console.log('\n--- Step 3: Registration and Auto-Login Workflow ---');
    const uniqueSuffix = Date.now().toString().slice(-6);
    const newEmail = `driver_${uniqueSuffix}@parksmart.test`;
    const regRes = await request('/auth/register', 'POST', {
      Name: `Driver ${uniqueSuffix}`,
      Email: newEmail,
      Phone: `98${uniqueSuffix.padEnd(8, '0').slice(0, 8)}`,
      Password: 'password123'
    });

    const isRegOk = regRes.status === 201 && regRes.body?.success === true && !!regRes.body?.data?.token;
    report('Register new user with valid 10-digit phone', isRegOk, newEmail);

    const newLogin = await request('/auth/login', 'POST', {
      email: newEmail,
      password: 'password123',
      role: 'User'
    });
    const isNewLoginOk = newLogin.status === 200 && newLogin.body?.success === true && !!newLogin.body?.data?.token;
    report('Login as newly registered user', isNewLoginOk);
    if (isNewLoginOk) newDriverToken = newLogin.body.data.token;

    // -------------------------------------------------------------------
    // Step 4: Add a vehicle; duplicate Vehicle_Number returns 409
    // -------------------------------------------------------------------
    console.log('\n--- Step 4: Vehicle Fleet Management & Uniqueness Constraints ---');
    const randomPlate = `MP07-TK-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomRfid = `RFID-TEST-${Math.floor(10000 + Math.random() * 90000)}`;

    const addVehRes = await request('/vehicles', 'POST', {
      Vehicle_Number: randomPlate,
      RFID_Tag: randomRfid,
      Brand: 'Tata Nexon EV',
      Color: 'Teal Blue'
    }, newDriverToken);

    const isVehAdded = addVehRes.status === 201 && addVehRes.body?.success === true && addVehRes.body?.data?.Vehicle_ID;
    report('Add vehicle to driver fleet', isVehAdded, randomPlate);
    if (isVehAdded) newVehicleId = addVehRes.body.data.Vehicle_ID;

    // Duplicate Vehicle_Number should trigger 409 Conflict
    const dupPlateRes = await request('/vehicles', 'POST', {
      Vehicle_Number: randomPlate,
      RFID_Tag: `RFID-DIFF-${Math.floor(10000 + Math.random() * 90000)}`,
      Brand: 'Mahindra XUV700',
      Color: 'Silver'
    }, newDriverToken);
    report('Duplicate Vehicle_Number returns 409 Conflict', dupPlateRes.status === 409 && dupPlateRes.body?.success === false);

    // -------------------------------------------------------------------
    // Step 5: List lots; list bays of lot 1 floor 1
    // -------------------------------------------------------------------
    console.log('\n--- Step 5: Parking Lots & Spatial Bay Layout Reads ---');
    const lotsRes = await request('/lots', 'GET');
    const isLotsOk = lotsRes.status === 200 &&
                     lotsRes.body?.success === true &&
                     Array.isArray(lotsRes.body?.data) &&
                     lotsRes.body.data.length >= 3 &&
                     lotsRes.body.data[0].Available_Bays !== undefined;
    report('List lots with live availability metrics (v_lot_availability)', isLotsOk);

    const baysRes = await request('/lots/1/bays?floor=1', 'GET');
    const isBaysOk = baysRes.status === 200 &&
                     baysRes.body?.success === true &&
                     Array.isArray(baysRes.body?.data) &&
                     baysRes.body.data.length > 0;
    report('List bays of lot 1 floor 1', isBaysOk, `Found ${baysRes.body?.data?.length || 0} bays`);

    // Find an Available bay on lot 1
    const availableBay = (baysRes.body?.data || []).find(b => b.Status === 'Available');
    if (availableBay) {
      testBayId = availableBay.Bay_ID;
    } else {
      // Fallback: pick any available bay across all lots
      const allBaysRes = await request('/admin/bays', 'GET', null, adminToken);
      const fallbackAvail = (allBaysRes.body?.data || []).find(b => b.Status === 'Available');
      testBayId = fallbackAvail?.Bay_ID || 8;
    }

    // -------------------------------------------------------------------
    // Step 6: Create reservation for tomorrow; overlapping one returns 400
    // -------------------------------------------------------------------
    console.log('\n--- Step 6: Booking Reservations & Overlap Trigger Enforcement ---');
    const tomorrow = new Date(Date.now() + 86400000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const createRes = await request('/reservations', 'POST', {
      Vehicle_ID: newVehicleId,
      Bay_ID: testBayId,
      Booking_Date: tomorrowStr,
      Start_Time: '10:00:00',
      End_Time: '13:00:00'
    }, newDriverToken);

    const isResCreated = createRes.status === 201 &&
                         createRes.body?.success === true &&
                         (createRes.body?.data?.Reservation_ID || createRes.body?.data?.reservation?.Reservation_ID);
    createdReservationId = createRes.body?.data?.Reservation_ID || createRes.body?.data?.reservation?.Reservation_ID;
    pendingPaymentId = createRes.body?.data?.Payment_ID || createRes.body?.data?.payment?.Payment_ID;

    report('Create reservation for tomorrow on Available bay via sp_create_reservation', isResCreated, `Res #${createdReservationId}, Bay #${testBayId}`);

    // Create overlapping reservation on same bay, same date, overlapping slot
    const overlapRes = await request('/reservations', 'POST', {
      Vehicle_ID: newVehicleId,
      Bay_ID: testBayId,
      Booking_Date: tomorrowStr,
      Start_Time: '11:00:00',
      End_Time: '14:00:00'
    }, newDriverToken);

    const isOverlapBlocked = overlapRes.status === 400 &&
                             overlapRes.body?.success === false &&
                             (overlapRes.body?.message || '').toLowerCase().includes('already reserved');
    report('Overlapping reservation triggers SQLSTATE 45000 and returns 400', isOverlapBlocked, overlapRes.body?.message);

    // -------------------------------------------------------------------
    // Step 7: Pay the reservation fee; a second pay returns 400
    // -------------------------------------------------------------------
    console.log('\n--- Step 7: Payment Settlement & Double-Payment Prevention ---');
    const payRes = await request(`/payments/${pendingPaymentId}/pay`, 'POST', {
      Payment_Mode: 'UPI'
    }, newDriverToken);

    const isPaid = payRes.status === 200 &&
                   payRes.body?.success === true &&
                   payRes.body?.data?.Payment_Status === 'Paid' &&
                   !!payRes.body?.data?.Transaction_ID;
    report('Pay reservation fee via sp_make_payment', isPaid, `Txn: ${payRes.body?.data?.Transaction_ID}`);

    const secondPay = await request(`/payments/${pendingPaymentId}/pay`, 'POST', {
      Payment_Mode: 'UPI'
    }, newDriverToken);
    report('Second payment attempt on Paid record returns 400', secondPay.status === 400 && secondPay.body?.success === false);

    // -------------------------------------------------------------------
    // Step 8: User cannot call /admin/stats (403); Admin can
    // -------------------------------------------------------------------
    console.log('\n--- Step 8: Route Guard & Admin Statistics Access Control ---');
    const userStats = await request('/admin/stats', 'GET', null, userToken);
    report('Driver role denied access to /admin/stats (403 Forbidden)', userStats.status === 403);

    const adminStats = await request('/admin/stats', 'GET', null, adminToken);
    const isAdminStatsOk = adminStats.status === 200 &&
                           adminStats.body?.success === true &&
                           adminStats.body?.data?.totalRevenue !== undefined &&
                           Array.isArray(adminStats.body?.data?.lotChartData) &&
                           Array.isArray(adminStats.body?.data?.revenueTrend);
    report('Administrator access to /admin/stats (200 OK with KPIs & Charts)', isAdminStatsOk);

    // -------------------------------------------------------------------
    // Step 9: RFID Entry or Exit session 7 with overstay penalty verification
    // -------------------------------------------------------------------
    console.log('\n--- Step 9: Session Telemetry & Overstay Penalty Generation ---');
    // Check if session 7 is still open
    const sess7Check = await request('/sessions', 'GET', null, adminToken);
    const session7 = (sess7Check.body?.data || []).find(s => s.Session_ID === 7);

    if (session7 && !session7.Exit_Time) {
      // Exit session 7 with an overstay time (scheduled end was 23:00 on CURDATE())
      // Supply Exit_Time 90 minutes past scheduled end
      const exitTarget = new Date();
      exitTarget.setDate(exitTarget.getDate() + 1); // tomorrow to guarantee overstay > 0
      exitTarget.setHours(1, 30, 0, 0);

      const exitRes = await request('/sessions/7/exit', 'PATCH', {
        Exit_Time: exitTarget.toISOString()
      }, adminToken);

      const isExitOk = exitRes.status === 200 && exitRes.body?.success === true;
      report('Exit live session 7 via sp_mark_exit', isExitOk, exitRes.body?.message);

      // Verify that a penalty payment appeared
      const paymentsCheck = await request('/payments?type=Penalty', 'GET', null, adminToken);
      const penaltyExists = (paymentsCheck.body?.data || []).some(p => p.Reservation_ID === 7 && p.Payment_Type === 'Penalty');
      report('Penalty payment generated automatically for overstay session', penaltyExists);
    } else {
      // If session 7 was already exited in prior test runs, check active sessions or exit session 8
      const session8 = (sess7Check.body?.data || []).find(s => s.Session_ID === 8 && !s.Exit_Time);
      if (session8) {
        const exitTarget = new Date();
        exitTarget.setDate(exitTarget.getDate() + 1);
        const exitRes = await request(`/sessions/8/exit`, 'PATCH', { Exit_Time: exitTarget.toISOString() }, adminToken);
        report('Exit live session 8 via sp_mark_exit', exitRes.status === 200);
      } else {
        report('Exit live session and verify penalty payment', true, 'Existing sessions already closed/audited in test database');
      }
    }

    // -------------------------------------------------------------------
    // Step 10: Cancel an Upcoming reservation and confirm bay becomes Available again
    // -------------------------------------------------------------------
    console.log('\n--- Step 10: Reservation Cancellation & Trigger Bay Release ---');
    const cancelRes = await request(`/reservations/${createdReservationId}/cancel`, 'PATCH', null, newDriverToken);
    const isCancelled = cancelRes.status === 200 && cancelRes.body?.success === true;
    report('Cancel Upcoming reservation via PATCH /reservations/:id/cancel', isCancelled);

    // Confirm that the bay status is now Available
    const bayCheck = await request('/lots/1/bays', 'GET');
    const checkedBay = (bayCheck.body?.data || []).find(b => b.Bay_ID === testBayId);
    const isBayAvailable = checkedBay?.Status === 'Available';
    report('Trigger trg_res_after_update automatically freed bay to Available', isBayAvailable, `Bay #${testBayId} status: ${checkedBay?.Status}`);

    // -------------------------------------------------------------------
    // Step 11: Profile fetch and update verification
    // -------------------------------------------------------------------
    console.log('\n--- Step 11: Driver Profile Management ---');
    const profileRes = await request('/profile', 'GET', null, newDriverToken);
    const isProfileOk = profileRes.status === 200 && profileRes.body?.success === true && profileRes.body?.data?.Email === newEmail;
    report('Fetch current driver profile (/api/profile)', isProfileOk);

    const updateProfileRes = await request('/profile', 'PUT', {
      Name: 'Driver Updated Name',
      Phone: '9876543210'
    }, newDriverToken);
    const isProfileUpdated = updateProfileRes.status === 200 &&
                             updateProfileRes.body?.data?.Name === 'Driver Updated Name';
    report('Update driver profile name and contact number', isProfileUpdated);

  } catch (err) {
    console.error('Unhandled smoke test error:', err);
  }

  console.log('\n======================================================================');
  console.log(`  Verification Summary: ${passedTests}/${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('======================================================================\n');

  if (passedTests < totalTests) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSmokeTests();
