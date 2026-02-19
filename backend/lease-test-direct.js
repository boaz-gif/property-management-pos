#!/usr/bin/env node

/**
 * Lease Management Testing Script
 * Uses existing admin to create test tenant and verify lease endpoints
 */

const http = require('http');
const db = require('./src/utils/database');

const BASE_URL = 'http://localhost:5002';
const EXISTING_ADMIN_EMAIL = 'admin1@rental.com';
const TEST_TENANT_EMAIL = `tenant_${Date.now()}@test.com`;
const TEST_PASSWORD = 'password123';

let authToken = null;
let adminUser = null;
let tenantId = null;
let propertyId = null;

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: responseData ? JSON.parse(responseData) : null,
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: responseData,
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test 1: Get admin users directly from DB and try with valid token
async function testGetValidAdmin() {
  console.log('\n=== TEST 1: Getting Admin Credentials ===');
  try {
    const result = await db.query('SELECT id, email, role FROM users WHERE role = $1 LIMIT 1', ['admin']);
    if (result.rows.length > 0) {
      console.log(`✓ Admin user found: ${result.rows[0].email} (ID: ${result.rows[0].id})`);
      // Use token directly from a test endpoint
      return true;
    } else {
      console.log('✗ No admin users found in database');
      return false;
    }
  } catch (error) {
    console.log('✗ Error getting admin:', error.message);
    return false;
  }
}

// Test 2: Try getting all tenants without auth to see if endpoint works
async function testGetTenantsNoAuth() {
  console.log('\n=== TEST 2: Test Endpoints (No Auth) ===');
  try {
    // Try with empty token to see endpoint structure
    const response = await makeRequest('GET', '/api/tenants');
    
    if (response.status === 401) {
      console.log('✓ Endpoint exists and requires authentication');
      return true;
    } else if (response.status === 200) {
      console.log('⚠ Endpoint works without auth (unexpected)');
      return true;
    } else {
      console.log('✗ Endpoint error:', response.status);
      return false;
    }
  } catch (error) {
    console.log('✗ Error testing endpoints:', error.message);
    return false;
  }
}

// Test 3: Create test tenant using SQL directly
async function testCreateTenantDirect() {
  console.log('\n=== TEST 3: Create Test Tenant (Direct DB) ===');
  try {
    // Get first property
    const propResult = await db.query('SELECT id FROM properties LIMIT 1');
    if (propResult.rows.length > 0) {
      propertyId = propResult.rows[0].id;
      
      // Create test tenant
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      const insertResult = await db.query(`
        INSERT INTO users (name, email, password, role, property_id, unit, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING id, email, role
      `, [
        'Test Tenant',
        TEST_TENANT_EMAIL,
        TEST_PASSWORD,
        'tenant',
        propertyId,
        'Unit 101',
        'active'
      ]);

      if (insertResult.rows.length > 0) {
        tenantId = insertResult.rows[0].id;
        console.log(`✓ Test tenant created: ${insertResult.rows[0].email} (ID: ${tenantId})`);
        
        // Now add lease info
        await db.query(`
          UPDATE users
          SET 
            lease_start_date = $1,
            lease_end_date = $2,
            lease_status = 'active',
            updated_at = NOW()
          WHERE id = $3
        `, [
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0],
          tenantId
        ]);
        
        console.log(`✓ Lease dates added to tenant`);
        return true;
      } else {
        console.log('✗ Failed to create test tenant');
        return false;
      }
    } else {
      console.log('✗ No properties found in database');
      return false;
    }
  } catch (error) {
    console.log('✗ Error creating test tenant:', error.message);
    return false;
  }
}

// Test 4: Login test tenant
async function testLoginTenant() {
  console.log('\n=== TEST 4: Login Test Tenant ===');
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      email: TEST_TENANT_EMAIL,
      password: TEST_PASSWORD,
    });

    if (response.status === 200 && response.data.data && response.data.data.token) {
      authToken = response.data.data.token;
      adminUser = response.data.data.user;
      console.log('✓ Tenant login successful');
      console.log(`  User ID: ${adminUser.id}, Role: ${adminUser.role}`);
      return true;
    } else {
      console.log('✗ Tenant login failed:', response.data);
      return false;
    }
  } catch (error) {
    console.log('✗ Error during login:', error.message);
    return false;
  }
}

// Test 5: Get individual tenant lease status
async function testGetTenantLeaseStatus() {
  if (!tenantId) {
    console.log('\n=== TEST 5: Get Tenant Lease Status - SKIPPED (no tenant ID) ===');
    return false;
  }

  console.log('\n=== TEST 5: Get Individual Tenant Lease Status ===');
  try {
    const response = await makeRequest('GET', `/api/tenants/${tenantId}/lease`);

    if (response.status === 200 && response.data.data) {
      console.log('✓ Tenant lease status retrieved');
      console.log(`  Status: ${response.data.data.lease_status || 'Not set'}`);
      console.log(`  Lease Start: ${response.data.data.lease_start_date || 'Not set'}`);
      console.log(`  Lease End: ${response.data.data.lease_end_date || 'Not set'}`);
      console.log(`  Days Remaining: ${response.data.data.days_remaining || 'N/A'}`);
      return true;
    } else {
      console.log('✗ Failed to get tenant lease status:', response.data);
      return false;
    }
  } catch (error) {
    console.log('✗ Error getting tenant lease status:', error.message);
    return false;
  }
}

// Test 6: Get tenant lease history
async function testGetTenantLeaseHistory() {
  if (!tenantId) {
    console.log('\n=== TEST 6: Get Tenant Lease History - SKIPPED (no tenant ID) ===');
    return false;
  }

  console.log('\n=== TEST 6: Get Tenant Lease History ===');
  try {
    const response = await makeRequest('GET', `/api/tenants/${tenantId}/lease/history`);

    if (response.status === 200) {
      console.log('✓ Tenant lease history retrieved');
      const count = response.data.data ? response.data.data.length : 0;
      console.log(`  Found ${count} lease history records`);
      return true;
    } else {
      console.log('✗ Failed to get tenant lease history:', response.data);
      return false;
    }
  } catch (error) {
    console.log('✗ Error getting tenant lease history:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('=====================================');
  console.log('  LEASE MANAGEMENT TESTING SUITE');
  console.log('=====================================');

  const results = [];

  // Setup
  await testGetValidAdmin();
  await testGetTenantsNoAuth();
  
  // Create tenant with lease info
  if (!(await testCreateTenantDirect())) {
    console.log('\n✗ Cannot proceed: Test tenant creation failed');
    await db.pool.end();
    return;
  }

  // Login
  if (!(await testLoginTenant())) {
    console.log('\n✗ Cannot proceed: Tenant login failed');
    await db.pool.end();
    return;
  }

  // Run lease tests
  results.push(await testGetTenantLeaseStatus());
  results.push(await testGetTenantLeaseHistory());

  // Summary
  console.log('\n=====================================');
  console.log('  TEST SUMMARY');
  console.log('=====================================');
  const passedTests = results.filter(r => r).length;
  const totalTests = results.length;
  console.log(`Passed: ${passedTests}/${totalTests}`);

  if (passedTests === totalTests && totalTests > 0) {
    console.log('\n✓✓✓ ALL LEASE MANAGEMENT TESTS PASSED ✓✓✓');
    console.log('✓✓✓ Phase 2 Step 3 Backend Testing: SUCCESSFUL ✓✓✓\n');
  } else if (totalTests === 0) {
    console.log('\n⚠ No tests were run');
  } else {
    console.log('\n⚠ Some tests failed. Review output above.');
  }

  await db.pool.end();
  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
