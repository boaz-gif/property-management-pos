/* eslint-disable no-console */

// Smoke test for Admin Dashboard endpoints.
// Usage: node scripts/smoke-admin-dashboard.js

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:5002/api';

const TEST_ADMIN = {
  name: 'Admin Smoke Test',
  email: 'admin.smoketest@example.com',
  password: 'TestAdmin123!',
  role: 'admin'
};

async function requestJson(path, { method = 'GET', token, body } = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json'
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _nonJsonBody: text };
  }

  return { ok: res.ok, status: res.status, json };
}

function printResult(title, result) {
  const { ok, status, json } = result;
  console.log(`\n=== ${title} ===`);
  console.log(`Status: ${status} (${ok ? 'OK' : 'FAIL'})`);
  if (json && typeof json === 'object') {
    // Print only top-level keys to avoid dumping huge payloads
    console.log('Response keys:', Object.keys(json));
    if (json.error) console.log('Error:', json.error);
    if (json.message) console.log('Message:', json.message);
  } else {
    console.log('Response:', json);
  }
}

async function main() {
  console.log('Admin Dashboard Smoke Test');
  console.log('BASE_URL:', BASE_URL);

  // 0) Health check (non-api)
  try {
    const healthRes = await fetch('http://localhost:5002/health');
    console.log('\n=== Health ===');
    console.log('Status:', healthRes.status);
  } catch (e) {
    console.error('\nHealth check failed. Is backend running on http://localhost:5002 ?');
    console.error(e.message);
    process.exitCode = 1;
    return;
  }

  // 1) Create test admin (register-test is public)
  const reg = await requestJson('/auth/register-test', { method: 'POST', body: TEST_ADMIN });
  printResult('Register Test Admin', reg);

  // 2) Login
  const login = await requestJson('/auth/login', {
    method: 'POST',
    body: { email: TEST_ADMIN.email, password: TEST_ADMIN.password }
  });
  printResult('Login', login);

  const token = login?.json?.data?.token;
  if (!token) {
    console.error('\nNo token returned from login. Cannot proceed with authenticated endpoint tests.');
    process.exitCode = 1;
    return;
  }

  // 3) Smoke test dashboard endpoints
  const overview = await requestJson('/admin/dashboard/overview', { token });
  printResult('GET /admin/dashboard/overview', overview);

  const actionItems = await requestJson('/admin/dashboard/action-items?limit=5&status=pending', { token });
  printResult('GET /admin/dashboard/action-items', actionItems);

  const comparison = await requestJson('/admin/dashboard/properties-comparison', { token });
  printResult('GET /admin/dashboard/properties-comparison', comparison);

  const activity = await requestJson('/admin/dashboard/recent-activity?limit=5', { token });
  printResult('GET /admin/dashboard/recent-activity', activity);

  const financial = await requestJson('/admin/dashboard/financial-summary?period=current_month', { token });
  printResult('GET /admin/dashboard/financial-summary', financial);

  const insights = await requestJson('/admin/dashboard/performance-insights?period=30_days', { token });
  printResult('GET /admin/dashboard/performance-insights', insights);

  const quick = await requestJson('/admin/dashboard/quick-stats', { token });
  printResult('GET /admin/dashboard/quick-stats', quick);

  console.log('\nSmoke test finished.');
}

main().catch((e) => {
  console.error('Smoke test crashed:', e);
  process.exitCode = 1;
});
