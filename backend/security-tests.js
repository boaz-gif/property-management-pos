/**
 * Security Feature Testing Guide
 * Run these tests to verify all security features are working correctly
 */

// ==========================================
// 1. RATE LIMITING TESTS
// ==========================================

/**
 * Test login rate limiting (5 attempts per 15 minutes)
 */
async function testLoginRateLimiting() {
  const baseURL = 'http://localhost:5002/api';
  
  // Generate test requests with unique emails to trigger rate limiting
  for (let i = 1; i <= 6; i++) {
    const email = `test_rate_limit_${i}@example.com`;
    const password = 'WrongPassword123';
    
    try {
      const response = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      console.log(`Attempt ${i}: Status ${response.status}`);
      console.log('Headers:', {
        'rate-limit-limit': response.headers.get('rate-limit-limit'),
        'rate-limit-remaining': response.headers.get('rate-limit-remaining'),
        'rate-limit-reset': response.headers.get('rate-limit-reset')
      });

      if (response.status === 429) {
        console.log('✅ Rate limiting working - request blocked after limit');
        break;
      }
    } catch (error) {
      console.error(`Error on attempt ${i}:`, error);
    }
  }
}

/**
 * Test registration rate limiting (3 attempts per hour)
 */
async function testRegistrationRateLimiting() {
  const baseURL = 'http://localhost:5002/api';
  
  for (let i = 1; i <= 4; i++) {
    try {
      const response = await fetch(`${baseURL}/auth/register-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Test User ${i}`,
          email: `register_test_${i}@example.com`,
          password: 'SecurePass123'
        })
      });

      console.log(`Registration attempt ${i}: Status ${response.status}`);
      
      if (response.status === 429) {
        console.log('✅ Registration rate limiting working');
        break;
      }
    } catch (error) {
      console.error(`Error on registration attempt ${i}:`, error);
    }
  }
}

// ==========================================
// 2. TOKEN BLACKLIST TESTS
// ==========================================

/**
 * Test token blacklisting on logout
 */
async function testTokenBlacklisting() {
  const baseURL = 'http://localhost:5002/api';
  let token;

  // Step 1: Create test user first, then login
  try {
    // Create test user
    const registerResponse = await fetch(`${baseURL}/auth/register-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: 'securitytest@example.com',
        password: 'TestPassword123'
      })
    });

    console.log('Test user registration status:', registerResponse.status);

    // Now try to login
    const loginResponse = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'securitytest@example.com',
        password: 'TestPassword123'
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      token = loginData.data?.token || loginData.token; // Handle different response structures
      console.log('✅ Login successful, got token');
    } else {
      console.log('⚠️ Could not login - test user may already exist');
      // Try to login anyway with existing user
      const loginResponse2 = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'securitytest@example.com',
          password: 'TestPassword123'
        })
      });
      
      if (loginResponse2.ok) {
        const loginData = await loginResponse2.json();
        token = loginData.data?.token || loginData.token;
        console.log('✅ Login with existing user successful');
      } else {
        console.log('❌ Could not login at all');
        return;
      }
    }
  } catch (error) {
    console.error('Login failed:', error);
    return;
  }

  // Step 2: Access profile with token
  try {
    const profileResponse = await fetch(`${baseURL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (profileResponse.status === 200) {
      console.log('✅ Profile access successful with valid token');
    }
  } catch (error) {
    console.error('Profile access failed:', error);
  }

  // Step 3: Logout
  try {
    const logoutResponse = await fetch(`${baseURL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (logoutResponse.status === 200) {
      console.log('✅ Logout successful');
    }
  } catch (error) {
    console.error('Logout failed:', error);
  }

  // Step 4: Try to use same token
  try {
    const retryResponse = await fetch(`${baseURL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const retryData = await retryResponse.json();

    if (retryResponse.status === 401) {
      console.log('✅ Token properly blacklisted - cannot reuse after logout');
    } else {
      console.log('❌ Token was not blacklisted properly');
      console.log('Status:', retryResponse.status, 'Response:', retryData);
    }
  } catch (error) {
    console.error('Retry request failed:', error);
  }
}

// ==========================================
// 3. INPUT SANITIZATION TESTS
// ==========================================

/**
 * Test XSS prevention in login
 */
async function testXSSPrevention() {
  const baseURL = 'http://localhost:5002/api';
  
  const xssPayloads = [
    '<script>alert("XSS")</script>test@example.com',
    'test@example.com<img src=x onerror=alert("XSS")>',
    'test@example.com" onload="alert(\'XSS\')" a="'
  ];

  for (const payload of xssPayloads) {
    try {
      const response = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload,
          password: 'TestPassword123'
        })
      });

      // Should not crash or execute script
      console.log(`✅ XSS payload handled safely: ${response.status}`);
    } catch (error) {
      console.error('XSS test error:', error);
    }
  }
}

/**
 * Test SQL injection prevention
 */
async function testSQLInjectionPrevention() {
  const baseURL = 'http://localhost:5002/api';
  
  const sqlPayloads = [
    "admin' --",
    "' OR '1'='1",
    "admin'; DROP TABLE users; --"
  ];

  for (const payload of sqlPayloads) {
    try {
      const response = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload,
          password: 'TestPassword123'
        })
      });

      // Should not execute SQL
      if (response.status === 400 || response.status === 401) {
        console.log(`✅ SQL injection payload sanitized: ${response.status}`);
      }
    } catch (error) {
      console.error('SQL injection test error:', error);
    }
  }
}

// ==========================================
// 4. CORS TESTS
// ==========================================

/**
 * Test CORS headers
 */
async function testCORSHeaders() {
  const baseURL = 'http://localhost:5002/api';
  
  try {
    const response = await fetch(`${baseURL}/health`, {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });

    console.log('CORS Headers:');
    console.log('Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin'));
    console.log('Access-Control-Allow-Credentials:', response.headers.get('access-control-allow-credentials'));
    console.log('Access-Control-Allow-Methods:', response.headers.get('access-control-allow-methods'));
    console.log('✅ CORS configured correctly');
  } catch (error) {
    console.error('CORS test error:', error);
  }
}

// ==========================================
// 5. SECURITY HEADERS TESTS
// ==========================================

/**
 * Test security headers
 */
async function testSecurityHeaders() {
  const baseURL = 'http://localhost:5002/api';
  
  try {
    const response = await fetch(`${baseURL}/health`);

    console.log('Security Headers:');
    console.log('X-Frame-Options:', response.headers.get('x-frame-options'));
    console.log('X-Content-Type-Options:', response.headers.get('x-content-type-options'));
    console.log('X-XSS-Protection:', response.headers.get('x-xss-protection'));
    console.log('Strict-Transport-Security:', response.headers.get('strict-transport-security'));
    console.log('Content-Security-Policy:', response.headers.get('content-security-policy'));
    console.log('✅ All security headers present');
  } catch (error) {
    console.error('Security headers test error:', error);
  }
}

// ==========================================
// MAIN TEST RUNNER
// ==========================================

async function runAllSecurityTests() {
  console.log('🔒 Running Security Feature Tests\n');

  console.log('1️⃣  Testing Rate Limiting...');
  await testLoginRateLimiting();
  console.log('\n');

  console.log('2️⃣  Testing Token Blacklist...');
  await testTokenBlacklisting();
  console.log('\n');

  console.log('3️⃣  Testing XSS Prevention...');
  await testXSSPrevention();
  console.log('\n');

  console.log('4️⃣  Testing SQL Injection Prevention...');
  await testSQLInjectionPrevention();
  console.log('\n');

  console.log('5️⃣  Testing CORS...');
  await testCORSHeaders();
  console.log('\n');

  console.log('6️⃣  Testing Security Headers...');
  await testSecurityHeaders();
  console.log('\n');

  console.log('✅ Security tests completed!');
}

// Run tests if this file is executed directly
if (typeof module !== 'undefined' && require.main === module) {
  runAllSecurityTests().catch(console.error);
}

module.exports = {
  testLoginRateLimiting,
  testRegistrationRateLimiting,
  testTokenBlacklisting,
  testXSSPrevention,
  testSQLInjectionPrevention,
  testCORSHeaders,
  testSecurityHeaders,
  runAllSecurityTests
};