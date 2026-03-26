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

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const BASE = process.env.TEST_URL || "http://localhost:5001";
let studentCookie = "";
let provostCookie = "";
let testApplicationId = null;
let testStudentEmail = `test_student_${Date.now()}@test.edu`;
let testHallId = null;

let passed = 0;
let failed = 0;
const results = [];

function log(status, name, detail = "") {
  const icon = status === "PASS" ? "✅" : "❌";
  results.push({ status, name, detail });
  if (status === "PASS") passed++;
  else failed++;
  console.log(`  ${icon} ${name}${detail ? " — " + detail : ""}`);
}
async function req(method, path, body = null, cookie = "") {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
    redirect: "manual",
  };
  if (cookie) opts.headers["Cookie"] = cookie;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const setCookie = res.headers.get("set-cookie");
  let data = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, data, cookie: setCookie || cookie };
}

// ==================== TEST SUITES ====================

async function testHealth() {
  console.log("\nHealth Check");
  const r = await req("GET", "/api/health");
  log(
    r.status === 200 && r.data.status === "ok" ? "PASS" : "FAIL",
    "GET /api/health",
    `status=${r.status}`,
  );
}

async function testAuth() {
  console.log("\n📋 Authentication");

  // Register — missing fields
  let r = await req("POST", "/api/auth/register", { name: "Test" });
  log(
    r.status === 400 ? "PASS" : "FAIL",
    "Register — missing fields returns 400",
    `status=${r.status}`,
  );

  // Register — new student
  r = await req("POST", "/api/auth/register", {
    name: "Test Student",
    email: testStudentEmail,
    password: "test123",
    role: "student",
    student_id: "9999001",
    department: "CSE",
    year: 2,
  });
  log(
    r.status === 201 && r.data.user ? "PASS" : "FAIL",
    "Register — new student",
    `status=${r.status}, id=${r.data.user?.id}`,
  );

  // Register — duplicate email
  r = await req("POST", "/api/auth/register", {
    name: "Dup",
    email: testStudentEmail,
    password: "test123",
    role: "student",
  });
  log(
    r.status === 409 ? "PASS" : "FAIL",
    "Register — duplicate email returns 409",
    `status=${r.status}`,
  );

  // Login — wrong password
  r = await req("POST", "/api/auth/login", {
    email: testStudentEmail,
    password: "wrong",
  });
  log(
    r.status === 401 ? "PASS" : "FAIL",
    "Login — wrong password returns 401",
    `status=${r.status}`,
  );

  // Login — student
  r = await req("POST", "/api/auth/login", {
    email: testStudentEmail,
    password: "test123",
  });
  log(
    r.status === 200 && r.data.user ? "PASS" : "FAIL",
    "Login — student success",
    `status=${r.status}, role=${r.data.user?.role}`,
  );
  studentCookie = r.cookie;

  // Me — authenticated
  r = await req("GET", "/api/auth/me", null, studentCookie);
  log(
    r.status === 200 && r.data.user?.email === testStudentEmail
      ? "PASS"
      : "FAIL",
    "GET /me — returns current user",
    `email=${r.data.user?.email}`,
  );

  // Me — unauthenticated
  r = await req("GET", "/api/auth/me");
  log(
    r.status === 401 ? "PASS" : "FAIL",
    "GET /me — unauthenticated returns 401",
    `status=${r.status}`,
  );

  // Login — provost
  r = await req("POST", "/api/auth/login", {
    email: "provost1@biis.edu",
    password: "provost123",
  });
  log(
    r.status === 200 && r.data.user?.role === "provost" ? "PASS" : "FAIL",
    "Login — provost success",
    `status=${r.status}, role=${r.data.user?.role}`,
  );
  provostCookie = r.cookie;

  // Get provost's hall (so tests use the correct hall)
  r = await req("GET", "/api/seats/halls", null, provostCookie);
  if (r.data.halls?.length > 0) {
    // Provost's applications endpoint filters by their hall, so we fetch that
    const appsRes = await req("GET", "/api/applications", null, provostCookie);
    // Use halls list and pick the first one matching provost's managed halls
    // Provost1 manages the first hall in seed data order
    testHallId = r.data.halls[0].id;
  }

  // Login — nonexistent user
  r = await req("POST", "/api/auth/login", {
    email: "noone@x.com",
    password: "x",
  });
  log(
    r.status === 401 ? "PASS" : "FAIL",
    "Login — nonexistent user returns 401",
    `status=${r.status}`,
  );
}

async function testResidents() {
  console.log("\n📋 Residents");

  // List — provost
  let r = await req("GET", "/api/residents", null, provostCookie);
  log(
    r.status === 200 && Array.isArray(r.data.residents) ? "PASS" : "FAIL",
    "List — provost sees residents",
    `count=${r.data.residents?.length}`,
  );

  // List — student blocked
  r = await req("GET", "/api/residents", null, studentCookie);
  log(
    r.status === 403 ? "PASS" : "FAIL",
    "List — student blocked returns 403",
    `status=${r.status}`,
  );

  // List — unauthenticated
  r = await req("GET", "/api/residents");
  log(
    r.status === 401 ? "PASS" : "FAIL",
    "List — unauthenticated returns 401",
    `status=${r.status}`,
  );
}

async function testSeats() {
  console.log("\n📋 Seats");

  // List seats — unauthenticated
  let r = await req("GET", "/api/seats");
  log(
    r.status === 401 ? "PASS" : "FAIL",
    "GET /seats — unauthenticated returns 401",
    `status=${r.status}`,
  );

  // List seats
  r = await req("GET", "/api/seats", null, studentCookie);
  log(
    r.status === 200 && Array.isArray(r.data.rooms) ? "PASS" : "FAIL",
    "GET /seats — returns rooms array",
    `count=${r.data.rooms?.length}`,
  );

  // Stats
  r = await req("GET", "/api/seats/stats", null, studentCookie);
  log(
    r.status === 200 && r.data.stats ? "PASS" : "FAIL",
    "GET /seats/stats — returns stats",
    `total=${r.data.stats?.total_seats}`,
  );

  // Halls
  r = await req("GET", "/api/seats/halls", null, studentCookie);
  log(
    r.status === 200 && Array.isArray(r.data.halls) ? "PASS" : "FAIL",
    "GET /seats/halls — returns halls",
    `count=${r.data.halls?.length}`,
  );
  // testHallId already set from provost login — don't overwrite
  if (!testHallId && r.data.halls?.length > 0) testHallId = r.data.halls[0].id;

  // Filter by hall
  if (testHallId) {
    r = await req(
      "GET",
      `/api/seats?hall_id=${testHallId}`,
      null,
      studentCookie,
    );
    log(
      r.status === 200 ? "PASS" : "FAIL",
      "GET /seats?hall_id — filter by hall",
      `rooms=${r.data.rooms?.length}`,
    );
  }
}

async function testApplications() {
  console.log('\n📋 Applications');

  if (!testHallId) { log('FAIL', 'SKIP — no hall found'); return; }

  // Resident check — not a resident
  let r = await req('GET', '/api/applications/resident-check', null, studentCookie);
  log(r.status === 200 && r.data.isResident === false ? 'PASS' : 'FAIL',
    'Resident check — test student is not resident', `isResident=${r.data.isResident}`);

  // Submit — missing fields
  r = await req('POST', '/api/applications', { hall_id: testHallId }, studentCookie);
  log(r.status === 400 ? 'PASS' : 'FAIL',
    'Submit — missing reason returns 400', `status=${r.status}`);

  // Submit — unauthenticated
  r = await req('POST', '/api/applications', { hall_id: testHallId, reason: 'test' });
  log(r.status === 401 ? 'PASS' : 'FAIL',
    'Submit — unauthenticated returns 401', `status=${r.status}`);

  // Submit — valid application
  r = await req('POST', '/api/applications', {
    hall_id: testHallId,
    reason: 'I am from a remote district, 300km away. My family income is very low and I cannot afford housing near university. Financial hardship, scholarship student.'
  }, studentCookie);
  log(r.status === 201 && r.data.application ? 'PASS' : 'FAIL',
    'Submit — valid application', `id=${r.data.application?.id}, score=${r.data.application?.ai_score}`);
  testApplicationId = r.data.application?.id;

  // Submit — duplicate pending
  r = await req('POST', '/api/applications', {
    hall_id: testHallId, reason: 'duplicate test'
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
    hall_id: testHallId, reason: 'provost trying'
  }, provostCookie);
  log(r.status === 403 ? 'PASS' : 'FAIL',
    'Submit — provost blocked returns 403', `status=${r.status}`);
}

async function run() {
  console.log("═══════════════════════════════════════");
  console.log("  BIIS API Test Suite");
  console.log(`  Target: ${BASE}`);
  console.log("═══════════════════════════════════════");

  try {
    await testHealth();
    await testAuth();
    await testResidents();
    await testSeats();
    await testApplications();
    await testApprovalAndPayment();
    await testCancellation();
    await testSeatChanges();
    await testLogout();
  } catch (err) {
    console.error("\nFatal error:", err.message);
  }

  console.log("\n═══════════════════════════════════════");
  console.log(
    `  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`,
  );
  console.log("═══════════════════════════════════════");

  // Cleanup test data
  await cleanup();

  process.exit(failed > 0 ? 1 : 0);
}

run();
