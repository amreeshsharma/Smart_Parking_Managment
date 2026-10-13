/**
 * Comprehensive Checklist Verifier
 * Tests Security, API, Error cases, and Database conformity
 */

const API_BASE = 'http://localhost:5000/api';

async function run() {
  console.log('--- Running Automated Security & Logic Verification ---');
  let passCount = 0;
  let totalCount = 0;

  function assert(condition, label) {
    totalCount++;
    if (condition) {
      console.log(`[PASS] ${label}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${label}`);
    }
  }

  // 1. Password check in login response
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-test-suite': 'true' },
    body: JSON.stringify({ email: 'user@parksmart.com', password: '123456', role: 'User' })
  });
  const loginData = await loginRes.json();
  assert(loginRes.ok && loginData.data?.token, 'Login successful');
  assert(!JSON.stringify(loginData).toLowerCase().includes('password_hash') && loginData.data?.user?.Password === undefined, 'No password field in login response');
  const userToken = loginData.data.token;

  // 2. Admin login response check
  const adminRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-test-suite': 'true' },
    body: JSON.stringify({ email: 'admin@parksmart.com', password: '123456', role: 'Admin' })
  });
  const adminData = await adminRes.json();
  assert(adminRes.ok && adminData.data?.token, 'Admin login successful');
  assert(!JSON.stringify(adminData).toLowerCase().includes('password_hash') && adminData.data?.user?.Password === undefined, 'No password field in admin response');
  const adminToken = adminData.data.token;

  // 3. Admin stats security check: User token returns 403
  const userAccessAdmin = await fetch(`${API_BASE}/admin/stats`, {
    headers: { 'Authorization': `Bearer ${userToken}`, 'x-test-suite': 'true' }
  });
  assert(userAccessAdmin.status === 403, 'User accessing /admin/stats returns 403 Forbidden');

  // 4. Vehicles without token returns 401
  const noTokenVehicles = await fetch(`${API_BASE}/vehicles`);
  assert(noTokenVehicles.status === 401, 'Accessing /api/vehicles without token returns 401 Unauthorized');

  // 5. SQL Injection test in login email
  const sqliLogin = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-test-suite': 'true' },
    body: JSON.stringify({ email: "' OR 1=1 --", password: 'random', role: 'User' })
  });
  assert(sqliLogin.status === 400 || sqliLogin.status === 401, 'SQL injection attempt rejected safely with 400/401');

  // 6. XSS safety in vehicle brand
  const xssVehicle = await fetch(`${API_BASE}/vehicles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`,
      'x-test-suite': 'true'
    },
    body: JSON.stringify({
      Vehicle_Number: 'MP07-XSS-99',
      Brand: '<script>alert(1)</script>',
      Color: 'Red',
      RFID_Tag: 'RFID-XSS99'
    })
  });
  const xssData = await xssVehicle.json();
  assert(xssVehicle.ok, 'Vehicle with script tag created without crashing server');
  assert(xssData.data.Brand === '<script>alert(1)</script>', 'Brand stored verbatim as string');

  // Clean up the XSS vehicle
  if (xssData.data?.Vehicle_ID) {
    await fetch(`${API_BASE}/vehicles/${xssData.data.Vehicle_ID}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${userToken}`, 'x-test-suite': 'true' }
    });
  }

  // 7. Ownership check: User 1 sees only User 1's vehicles
  const user1Vehicles = await fetch(`${API_BASE}/vehicles`, {
    headers: { 'Authorization': `Bearer ${userToken}`, 'x-test-suite': 'true' }
  });
  const u1VList = await user1Vehicles.json();
  const allBelongToU1 = u1VList.data.every(v => v.User_ID === 1);
  assert(allBelongToU1 && u1VList.data.length > 0, 'User 1 only sees vehicles belonging to User 1');

  // 8. Ownership check: User 1 sees only User 1's reservations
  const user1Res = await fetch(`${API_BASE}/reservations`, {
    headers: { 'Authorization': `Bearer ${userToken}`, 'x-test-suite': 'true' }
  });
  const u1RList = await user1Res.json();
  const allResU1 = u1RList.data.every(r => r.User_ID === 1);
  assert(allResU1, 'User 1 only sees reservations belonging to User 1');

  // 9. Rate limiting test: make 12 requests without 'x-test-suite' header to /auth/login
  console.log('Testing rate limiter (12 rapid login requests)...');
  let rateLimited = false;
  for (let i = 0; i < 12; i++) {
    const rlRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `rl_test_${i}@example.com`, password: 'wrong', role: 'User' })
    });
    if (rlRes.status === 429) {
      rateLimited = true;
      break;
    }
  }
  assert(rateLimited, 'Auth endpoint enforces rate limiting (returns 429 on excessive requests)');

  console.log(`\nResults: ${passCount}/${totalCount} tests passed.`);
}

run().catch(console.error);
