/**
 * BIIS API Test Cases
 * 
 * Run with: node server/tests/api.test.js
 * Requires: Backend server running on PORT (default 5001)
 * 
 * Tests all API endpoints in sequence:
 *   1. Health Check
 *   2. Auth (register, login, me, logout)
 *   3. Seats (list, stats, halls)
 *   4. Applications (submit, list, approve, pay, cancel, resident-check)
 *   5. Seat Changes (submit, list)
 *   6. Residents (list, update)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const BASE = process.env.TEST_URL || 'http://localhost:5001';
let studentCookie = '';
let provostCookie = '';
let testApplicationId = null;
let testStudentEmail = `test_student_${Date.now()}@test.edu`;
let testHallId = null;

let passed = 0;
let failed = 0;
const results = [];

function log(status, name, detail = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  results.push({ status, name, detail });
  if (status === 'PASS') passed++;
  else failed++;
  console.log(`  ${icon} ${name}${detail ? ' — ' + detail : ''}`);
}

async function req(method, path, body = null, cookie = '') {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    redirect: 'manual',
  };
  if (cookie) opts.headers['Cookie'] = cookie;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const setCookie = res.headers.get('set-cookie');
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = text; }

  return { status: res.status, data, cookie: setCookie || cookie };
}

// ==================== TEST SUITES ====================

async function testHealth() {
  console.log('\n📋 Health Check');
  const r = await req('GET', '/api/health');
  log(r.status === 200 && r.data.status === 'ok' ? 'PASS' : 'FAIL',
    'GET /api/health', `status=${r.status}`);
}

async function testAuth() {
  console.log('\n📋 Authentication');

  // First get halls (public endpoint) so we can register with hall_id
  let r = await req('GET', '/api/seats/halls');
  log(r.status === 200 && Array.isArray(r.data.halls) ? 'PASS' : 'FAIL',
    'GET /seats/halls — public (for registration)', `count=${r.data.halls?.length}`);
  if (r.data.halls?.length > 0) testHallId = r.data.halls[0].id;

  // Register — missing fields
  r = await req('POST', '/api/auth/register', { name: 'Test' });
  log(r.status === 400 ? 'PASS' : 'FAIL',
    'Register — missing fields returns 400', `status=${r.status}`);

  // Register — student without hall returns 400
  r = await req('POST', '/api/auth/register', {
    name: 'No Hall', email: 'nohall@test.edu', password: 'test123',
    role: 'student', student_id: '9999000', department: 'CSE', year: 2
  });
  log(r.status === 400 ? 'PASS' : 'FAIL',
    'Register — student without hall returns 400', `status=${r.status}`);

  // Register — new student with hall
  r = await req('POST', '/api/auth/register', {
    name: 'Test Student', email: testStudentEmail, password: 'test123',
    role: 'student', student_id: '9999001', department: 'CSE', year: 2,
    hall_id: testHallId
  });
  log(r.status === 201 && r.data.user?.hall_id === testHallId ? 'PASS' : 'FAIL',
    'Register — new student with hall', `status=${r.status}, hall_id=${r.data.user?.hall_id}`);

  // Register — duplicate email
  r = await req('POST', '/api/auth/register', {
    name: 'Dup', email: testStudentEmail, password: 'test123',
    role: 'student', hall_id: testHallId
  });
  log(r.status === 409 ? 'PASS' : 'FAIL',
    'Register — duplicate email returns 409', `status=${r.status}`);

  // Login — wrong password
  r = await req('POST', '/api/auth/login', { email: testStudentEmail, password: 'wrong' });
  log(r.status === 401 ? 'PASS' : 'FAIL',
    'Login — wrong password returns 401', `status=${r.status}`);

  // Login — student (hall_id should be in session)
  r = await req('POST', '/api/auth/login', { email: testStudentEmail, password: 'test123' });
  log(r.status === 200 && r.data.user?.hall_id === testHallId ? 'PASS' : 'FAIL',
    'Login — student has hall_id in session', `status=${r.status}, hall_id=${r.data.user?.hall_id}`);
  studentCookie = r.cookie;

  // Me — authenticated
  r = await req('GET', '/api/auth/me', null, studentCookie);
  log(r.status === 200 && r.data.user?.email === testStudentEmail ? 'PASS' : 'FAIL',
    'GET /me — returns current user', `email=${r.data.user?.email}`);

  // Me — unauthenticated
  r = await req('GET', '/api/auth/me');
  log(r.status === 401 ? 'PASS' : 'FAIL',
    'GET /me — unauthenticated returns 401', `status=${r.status}`);

  // Login — provost
  r = await req('POST', '/api/auth/login', { email: 'provost1@biis.edu', password: 'provost123' });
  log(r.status === 200 && r.data.user?.role === 'provost' ? 'PASS' : 'FAIL',
    'Login — provost success', `status=${r.status}, role=${r.data.user?.role}`);
  provostCookie = r.cookie;

  // Login — nonexistent user
  r = await req('POST', '/api/auth/login', { email: 'noone@x.com', password: 'x' });
  log(r.status === 401 ? 'PASS' : 'FAIL',
    'Login — nonexistent user returns 401', `status=${r.status}`);
}

async function testSeats() {
  console.log('\n📋 Seats');

  // List seats — unauthenticated
  let r = await req('GET', '/api/seats');
  log(r.status === 401 ? 'PASS' : 'FAIL',
    'GET /seats — unauthenticated returns 401', `status=${r.status}`);

  // List seats — student sees only their hall's rooms
  r = await req('GET', '/api/seats', null, studentCookie);
  const allSameHall = r.data.rooms?.every(rm => rm.hall_id === testHallId);
  log(r.status === 200 && Array.isArray(r.data.rooms) && allSameHall ? 'PASS' : 'FAIL',
    'GET /seats — student sees only their hall rooms', `count=${r.data.rooms?.length}, allSameHall=${allSameHall}`);

  // Stats — student sees only their hall
  r = await req('GET', '/api/seats/stats', null, studentCookie);
  log(r.status === 200 && Array.isArray(r.data.stats) ? 'PASS' : 'FAIL',
    'GET /seats/stats — returns stats', `halls=${r.data.stats?.length}`);

  // Halls — public endpoint, returns all halls
  r = await req('GET', '/api/seats/halls');
  log(r.status === 200 && Array.isArray(r.data.halls) ? 'PASS' : 'FAIL',
    'GET /seats/halls — public returns all halls', `count=${r.data.halls?.length}`);

  // Filter by floor
  r = await req('GET', '/api/seats?floor=1', null, studentCookie);
  log(r.status === 200 ? 'PASS' : 'FAIL',
    'GET /seats?floor=1 — filter by floor', `rooms=${r.data.rooms?.length}`);
}

async function testApplications() {
  console.log('\n📋 Applications');

  if (!testHallId) { log('FAIL', 'SKIP — no hall found'); return; }

  // Resident check — not a resident
  let r = await req('GET', '/api/applications/resident-check', null, studentCookie);
  log(r.status === 200 && r.data.isResident === false ? 'PASS' : 'FAIL',
    'Resident check — test student is not resident', `isResident=${r.data.isResident}`);

  // Submit — missing reason returns 400 (hall auto from session)
  r = await req('POST', '/api/applications', {}, studentCookie);
  log(r.status === 400 ? 'PASS' : 'FAIL',
    'Submit — missing reason returns 400', `status=${r.status}`);

  // Submit — unauthenticated
  r = await req('POST', '/api/applications', { reason: 'test' });
  log(r.status === 401 ? 'PASS' : 'FAIL',
    'Submit — unauthenticated returns 401', `status=${r.status}`);

  // Submit — valid application (no hall_id needed, auto from session)
  r = await req('POST', '/api/applications', {
    reason: 'I am from a remote district, 300km away. My family income is very low and I cannot afford housing near university. Financial hardship, scholarship student.'
  }, studentCookie);
  log(r.status === 201 && r.data.application ? 'PASS' : 'FAIL',
    'Submit — valid application (hall auto from session)', `id=${r.data.application?.id}, score=${r.data.application?.ai_score}`);
  testApplicationId = r.data.application?.id;

  // Submit — duplicate pending
  r = await req('POST', '/api/applications', {
    reason: 'duplicate test'
  }, studentCookie);
  log(r.status === 409 ? 'PASS' : 'FAIL',
    'Submit — duplicate pending returns 409', `status=${r.status}`);

  // List — student sees own
  r = await req('GET', '/api/applications', null, studentCookie);
  log(r.status === 200 && r.data.applications?.some(a => a.id === testApplicationId) ? 'PASS' : 'FAIL',
    'List — student sees own application', `count=${r.data.applications?.length}`);

  // List — provost sees applications
  r = await req('GET', '/api/applications', null, provostCookie);
  log(r.status === 200 && Array.isArray(r.data.applications) ? 'PASS' : 'FAIL',
    'List — provost sees applications', `count=${r.data.applications?.length}`);

  // List — provost filter by status
  r = await req('GET', '/api/applications?status=pending', null, provostCookie);
  log(r.status === 200 ? 'PASS' : 'FAIL',
    'List — provost filter pending', `count=${r.data.applications?.length}`);

  // Submit — provost cannot submit
  r = await req('POST', '/api/applications', {
    reason: 'provost trying'
  }, provostCookie);
  log(r.status === 403 ? 'PASS' : 'FAIL',
    'Submit — provost blocked returns 403', `status=${r.status}`);
}

async function testApprovalAndPayment() {
  console.log('\n📋 Approval & Payment Flow');

  if (!testApplicationId) { log('FAIL', 'SKIP — no application to test'); return; }

  // Deny — invalid status
  let r = await req('PATCH', `/api/applications/${testApplicationId}`, {
    status: 'invalid'
  }, provostCookie);
  log(r.status === 400 ? 'PASS' : 'FAIL',
    'Approve — invalid status returns 400', `status=${r.status}`);

  // Student cannot approve
  r = await req('PATCH', `/api/applications/${testApplicationId}`, {
    status: 'approved'
  }, studentCookie);
  log(r.status === 403 ? 'PASS' : 'FAIL',
    'Approve — student blocked returns 403', `status=${r.status}`);

  // Provost approves
  r = await req('PATCH', `/api/applications/${testApplicationId}`, {
    status: 'approved', feedback: 'Approved for testing'
  }, provostCookie);
  log(r.status === 200 && r.data.application?.status === 'approved' ? 'PASS' : 'FAIL',
    'Approve — provost approves', `payment_status=${r.data.application?.payment_status}`);

  // Check payment_status is pending and deadline is set
  r = await req('GET', '/api/applications', null, studentCookie);
  const approved = r.data.applications?.find(a => a.id === testApplicationId);
  log(approved?.payment_status === 'pending' && approved?.payment_deadline ? 'PASS' : 'FAIL',
    'Approved — has payment_status=pending and deadline', 
    `deadline=${approved?.payment_deadline?.substring(0, 19)}`);

  // Pay — unauthenticated
  r = await req('POST', `/api/applications/${testApplicationId}/pay`);
  log(r.status === 401 ? 'PASS' : 'FAIL',
    'Pay — unauthenticated returns 401', `status=${r.status}`);

  // Pay — success
  r = await req('POST', `/api/applications/${testApplicationId}/pay`, {}, studentCookie);
  log(r.status === 200 && r.data.application?.payment_status === 'paid' ? 'PASS' : 'FAIL',
    'Pay — student pays successfully', `payment_status=${r.data.application?.payment_status}`);

  // Pay — already paid
  r = await req('POST', `/api/applications/${testApplicationId}/pay`, {}, studentCookie);
  log(r.status === 400 ? 'PASS' : 'FAIL',
    'Pay — already paid returns 400', `status=${r.status}`);

  // Resident check — now a resident
  r = await req('GET', '/api/applications/resident-check', null, studentCookie);
  log(r.status === 200 && r.data.isResident === true ? 'PASS' : 'FAIL',
    'Resident check — now is resident after payment', `hall=${r.data.resident?.hall_name}`);

  // Submit — resident blocked
  r = await req('POST', '/api/applications', {
    reason: 'resident trying to apply again'
  }, studentCookie);
  log(r.status === 409 ? 'PASS' : 'FAIL',
    'Submit — resident blocked from applying', `error=${r.data.error?.substring(0, 40)}`);
}

async function testCancellation() {
  console.log('\n📋 Cancellation');

  // Create a new student for cancel test (with hall_id)
  const cancelEmail = `cancel_${Date.now()}@test.edu`;
  let r = await req('POST', '/api/auth/register', {
    name: 'Cancel Test', email: cancelEmail, password: 'test123',
    role: 'student', student_id: '9999002', department: 'EEE', year: 1,
    hall_id: testHallId
  });
  const cancelCookie = r.cookie;

  // Submit application (no hall_id in body)
  r = await req('POST', '/api/applications', {
    reason: 'Testing cancellation flow'
  }, cancelCookie);
  const cancelAppId = r.data.application?.id;
  log(r.status === 201 ? 'PASS' : 'FAIL',
    'Submit — for cancel test', `id=${cancelAppId}`);

  // Cancel — success (pending)
  r = await req('POST', `/api/applications/${cancelAppId}/cancel`, {}, cancelCookie);
  log(r.status === 200 && r.data.application?.status === 'cancelled' ? 'PASS' : 'FAIL',
    'Cancel — pending application cancelled', `status=${r.data.application?.status}`);

  // Cancel — already cancelled
  r = await req('POST', `/api/applications/${cancelAppId}/cancel`, {}, cancelCookie);
  log(r.status === 400 ? 'PASS' : 'FAIL',
    'Cancel — already cancelled returns 400', `status=${r.status}`);

  // Cancel with wrong user
  r = await req('POST', `/api/applications/${cancelAppId}/cancel`, {}, provostCookie);
  log(r.status === 403 ? 'PASS' : 'FAIL',
    'Cancel — provost cannot cancel student app', `status=${r.status}`);
}

async function testSeatChanges() {
  console.log('\n📋 Seat Changes');

  // List — student
  let r = await req('GET', '/api/seat-changes', null, studentCookie);
  log(r.status === 200 && Array.isArray(r.data.seatChanges) ? 'PASS' : 'FAIL',
    'List — student seat changes', `count=${r.data.seatChanges?.length}`);

  // List — provost
  r = await req('GET', '/api/seat-changes', null, provostCookie);
  log(r.status === 200 ? 'PASS' : 'FAIL',
    'List — provost seat changes', `count=${r.data.seatChanges?.length}`);

  // List — unauthenticated
  r = await req('GET', '/api/seat-changes');
  log(r.status === 401 ? 'PASS' : 'FAIL',
    'List — unauthenticated returns 401', `status=${r.status}`);
}

async function testResidents() {
  console.log('\n📋 Residents');

  // List — provost
  let r = await req('GET', '/api/residents', null, provostCookie);
  log(r.status === 200 && Array.isArray(r.data.residents) ? 'PASS' : 'FAIL',
    'List — provost sees residents', `count=${r.data.residents?.length}`);

  // List — student blocked
  r = await req('GET', '/api/residents', null, studentCookie);
  log(r.status === 403 ? 'PASS' : 'FAIL',
    'List — student blocked returns 403', `status=${r.status}`);

  // List — unauthenticated
  r = await req('GET', '/api/residents');
  log(r.status === 401 ? 'PASS' : 'FAIL',
    'List — unauthenticated returns 401', `status=${r.status}`);
}

async function testLogout() {
  console.log('\n📋 Logout');

  let r = await req('POST', '/api/auth/logout', null, studentCookie);
  log(r.status === 200 ? 'PASS' : 'FAIL',
    'Logout — student', `status=${r.status}`);

  // Verify session is destroyed
  r = await req('GET', '/api/auth/me', null, studentCookie);
  log(r.status === 401 ? 'PASS' : 'FAIL',
    'After logout — /me returns 401', `status=${r.status}`);
}

async function cleanup() {
  console.log('\n🧹 Cleanup');
  const pool = require('../src/db');
  try {
    // Release seats that were assigned to test users
    await pool.query(`
      UPDATE seats SET status = 'available' 
      WHERE id IN (
        SELECT seat_id FROM residents WHERE student_id IN (
          SELECT id FROM users WHERE email LIKE '%@test.edu'
        )
      )
    `);
    await pool.query(`DELETE FROM residents WHERE student_id IN (SELECT id FROM users WHERE email LIKE '%@test.edu')`);
    await pool.query(`DELETE FROM applications WHERE student_id IN (SELECT id FROM users WHERE email LIKE '%@test.edu')`);
    await pool.query(`DELETE FROM users WHERE email LIKE '%@test.edu'`);
    console.log('  🗑️  Test data cleaned up');
  } catch (e) {
    console.log('  ⚠️  Cleanup error:', e.message);
  }
  await pool.end();
}

// ==================== RUNNER ====================

async function run() {
  console.log('═══════════════════════════════════════');
  console.log('  BIIS API Test Suite');
  console.log(`  Target: ${BASE}`);
  console.log('═══════════════════════════════════════');

  try {
    await testHealth();
    await testAuth();
    await testSeats();
    await testApplications();
    await testApprovalAndPayment();
    await testCancellation();
    await testSeatChanges();
    await testResidents();
    await testLogout();
  } catch (err) {
    console.error('\n💥 Fatal error:', err.message);
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('═══════════════════════════════════════');

  // Cleanup test data
  await cleanup();

  process.exit(failed > 0 ? 1 : 0);
}

run();
