#!/usr/bin/env node

/**
 * Register a test admin and test the lease endpoints
 */

const http = require('http');

const BASE_URL = 'http://localhost:5002';
const TEST_ADMIN_EMAIL = `admin_test_${Date.now()}@rental.com`;
const TEST_ADMIN_PASSWORD = 'password123';

let authToken = null;
let adminUser = null;
let tenantId = null;

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

// Test 1: Register a new admin user
async function testRegisterAdmin() {
  console.log('\n=== TEST 1: Register Admin User ===');
  try {
    const response = await makeRequest('POST', '/api/auth/register', {
      name: 'Test Admin',
      email: TEST_ADMIN_EMAIL,
      password: TEST_ADMIN_PASSWORD,
      role: 'admin'
    });

    if (response.status === 201 && response.data.success) {
      console.log('✓ Admin registration successful');
      console.log(`  Email: ${TEST_ADMIN_EMAIL}`);
      return true;
    } else {
      console.log('✗ Admin registration failed:', response.data);
      return false;
    }
  } catch (error) {
    console.log('✗ Error during registration:', error.message);
    return false;
  }
}

// Test 2: Login as the new admin
async function testLoginAdmin() {
  console.log('\n=== TEST 2: Admin Login ===');
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      email: TEST_ADMIN_EMAIL,
      password: TEST_ADMIN_PASSWORD,
    });

    if (response.status === 200 && response.data.data && response.data.data.token) {
      authToken = response.data.data.token;
      adminUser = response.data.data.user;
      console.log('✓ Admin login successful');
      console.log(`  User ID: ${adminUser.id}, Role: ${adminUser.role}`);
      return true;
    } else {
      console.log('✗ Admin login failed:', response.data);
      return false;
    }
  } catch (error) {
    console.log('✗ Error during login:', error.message);
    return false;
  }
}

// Test 3: Get lease statistics
async function testGetLeaseStatistics() {
  console.log('\n=== TEST 3: Get Lease Statistics ===');
  try {
    const response = await makeRequest('GET', '/api/tenants/lease/stats');

    if (response.status === 200 && response.data.data) {
      console.log('✓ Lease statistics retrieved');
      console.log(`  Response:`, JSON.stringify(response.data.data, null, 2));
      return true;
    } else {
      console.log('✗ Failed to get lease statistics:', response.data);
      return false;
    }
  } catch (error) {
    console.log('✗ Error getting lease statistics:', error.message);
    return false;
  }
}

// Test 4: Get expiring leases
async function testGetExpiringLeases() {
  console.log('\n=== TEST 4: Get Expiring Leases (30 days) ===');
  try {
    const response = await makeRequest('GET', '/api/tenants/lease/expiring?days=30');

    if (response.status === 200) {
      console.log('✓ Expiring leases retrieved');
      const count = response.data.data ? response.data.data.length : 0;
      console.log(`  Found ${count} expiring leases`);
      if (count > 0) {
        console.log(`  Sample:`, response.data.data[0].name);
      }
      return true;
    } else {
      console.log('✗ Failed to get expiring leases:', response.data);
      return false;
    }
  } catch (error) {
    console.log('✗ Error getting expiring leases:', error.message);
    return false;
  }
}

// Test 5: Get expired leases
async function testGetExpiredLeases() {
  console.log('\n=== TEST 5: Get Expired Leases ===');
  try {
    const response = await makeRequest('GET', '/api/tenants/lease/expired');

    if (response.status === 200) {
      console.log('✓ Expired leases retrieved');
      const count = response.data.data ? response.data.data.length : 0;
      console.log(`  Found ${count} expired leases`);
      return true;
    } else {
      console.log('✗ Failed to get expired leases:', response.data);
      return false;
    }
  } catch (error) {
    console.log('✗ Error getting expired leases:', error.message);
    return false;
  }
}

// Test 6: Get all tenants to find one with lease info
async function testGetAllTenants() {
  console.log('\n=== TEST 6: Get All Tenants ===');
  try {
    const response = await makeRequest('GET', '/api/tenants');

    if (response.status === 200 && response.data.data && response.data.data.length > 0) {
      const tenantWithLease = response.data.data.find(t => t.lease_start_date || t.lease_end_date);
      if (tenantWithLease) {
        tenantId = tenantWithLease.id;
        console.log('✓ Found tenant with lease information');
        console.log(`  Tenant ID: ${tenantId}, Name: ${tenantWithLease.name}`);
        console.log(`  Lease Start: ${tenantWithLease.lease_start_date}`);
        console.log(`  Lease End: ${tenantWithLease.lease_end_date}`);
        console.log(`  Lease Status: ${tenantWithLease.lease_status}`);
        return true;
      } else {
        tenantId = response.data.data[0].id;
        console.log('⚠ No tenant with lease info found, using first tenant');
        console.log(`  Tenant ID: ${tenantId}, Name: ${response.data.data[0].name}`);
        return true;
      }
    } else {
      console.log('✗ Failed to get tenants:', response.data);
      return false;
    }
  } catch (error) {
    console.log('✗ Error getting tenants:', error.message);
    return false;
  }
}

// Test 7: Get individual tenant lease status
async function testGetTenantLeaseStatus() {
  if (!tenantId) {
    console.log('\n=== TEST 7: Get Tenant Lease Status - SKIPPED (no tenant ID) ===');
    return false;
  }

  console.log('\n=== TEST 7: Get Individual Tenant Lease Status ===');
  try {
    const response = await makeRequest('GET', `/api/tenants/${tenantId}/lease`);

    if (response.status === 200 && response.data.data) {
      console.log('✓ Tenant lease status retrieved');
      console.log(`  Status: ${response.data.data.lease_status || 'Not set'}`);
      console.log(`  Lease Start: ${response.data.data.lease_start_date || 'Not set'}`);
      console.log(`  Lease End: ${response.data.data.lease_end_date || 'Not set'}`);
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

// Test 8: Get tenant lease history
async function testGetTenantLeaseHistory() {
  if (!tenantId) {
    console.log('\n=== TEST 8: Get Tenant Lease History - SKIPPED (no tenant ID) ===');
    return false;
  }

  console.log('\n=== TEST 8: Get Tenant Lease History ===');
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

// Test 9: Update tenant lease
async function testUpdateTenantLease() {
  if (!tenantId) {
    console.log('\n=== TEST 9: Update Tenant Lease - SKIPPED (no tenant ID) ===');
    return false;
  }

  console.log('\n=== TEST 9: Update Tenant Lease ===');
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Start 30 days ago

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 365); // End 1 year from now

    const leaseData = {
      lease_start_date: startDate.toISOString().split('T')[0],
      lease_end_date: endDate.toISOString().split('T')[0],
    };

    const response = await makeRequest('PUT', `/api/tenants/${tenantId}/lease`, leaseData);

    if (response.status === 200 && response.data.data) {
      console.log('✓ Tenant lease updated successfully');
      console.log(`  Lease Start: ${response.data.data.lease_start_date}`);
      console.log(`  Lease End: ${response.data.data.lease_end_date}`);
      console.log(`  Lease Status: ${response.data.data.lease_status}`);
      return true;
    } else {
      console.log('✗ Failed to update tenant lease:', response.data);
      return false;
    }
  } catch (error) {
    console.log('✗ Error updating tenant lease:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('=====================================');
  console.log('  LEASE MANAGEMENT TESTING SUITE');
  console.log('=====================================');

  const results = [];

  // Register and login first
  if (!(await testRegisterAdmin()) || !(await testLoginAdmin())) {
    console.log('\n✗ Cannot proceed: Admin setup failed');
    return;
  }

  results.push(await testGetLeaseStatistics());
  results.push(await testGetExpiringLeases());
  results.push(await testGetExpiredLeases());
  results.push(await testGetAllTenants());
  results.push(await testGetTenantLeaseStatus());
  results.push(await testGetTenantLeaseHistory());
  results.push(await testUpdateTenantLease());

  // Summary
  console.log('\n=====================================');
  console.log('  TEST SUMMARY');
  console.log('=====================================');
  const passedTests = results.filter(r => r).length;
  const totalTests = results.length;
  console.log(`Passed: ${passedTests}/${totalTests}`);

  if (passedTests === totalTests) {
    console.log('\n✓✓✓ ALL LEASE MANAGEMENT TESTS PASSED ✓✓✓');
    console.log('✓✓✓ Phase 2 Step 3 Backend Testing: SUCCESSFUL ✓✓✓\n');
  } else {
    console.log('\n⚠ Some tests failed. Review output above.');
  }

  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
