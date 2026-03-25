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
  console.log('\nHealth Check');
  const r = await req('GET', '/api/health');
  log(r.status === 200 && r.data.status === 'ok' ? 'PASS' : 'FAIL',
    'GET /api/health', `status=${r.status}`);
}






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
    console.error('\nFatal error:', err.message);
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log('═══════════════════════════════════════');

  // Cleanup test data
  await cleanup();

  process.exit(failed > 0 ? 1 : 0);
}

run();