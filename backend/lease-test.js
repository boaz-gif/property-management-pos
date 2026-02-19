#!/usr/bin/env node

/**
 * Lease Management Testing Script
 * Tests all lease-related endpoints
 */

const http = require('http');

const BASE_URL = 'http://localhost:5002';
const ADMIN_EMAIL = 'admin1@rental.com';
const ADMIN_PASSWORD = 'password123';

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

// Test 1: Login as admin
async function testLogin() {
  console.log('\n=== TEST 1: Admin Login ===');
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });

    if (response.status === 200 && response.data.token) {
      authToken = response.data.token;
      adminUser = response.data.user;
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

// Test 2: Get lease statistics
async function testGetLeaseStatistics() {
  console.log('\n=== TEST 2: Get Lease Statistics ===');
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

// Test 3: Get expiring leases
async function testGetExpiringLeases() {
  console.log('\n=== TEST 3: Get Expiring Leases (30 days) ===');
  try {
    const response = await makeRequest('GET', '/api/tenants/lease/expiring?days=30');

    if (response.status === 200) {
      console.log('✓ Expiring leases retrieved');
      const count = response.data.data ? response.data.data.length : 0;
      console.log(`  Found ${count} expiring leases`);
      if (count > 0) {
        console.log(`  First lease:`, JSON.stringify(response.data.data[0], null, 2));
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

// Test 4: Get expired leases
async function testGetExpiredLeases() {
  console.log('\n=== TEST 4: Get Expired Leases ===');
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

// Test 5: Get all tenants to find one with lease info
async function testGetAllTenants() {
  console.log('\n=== TEST 5: Get All Tenants ===');
  try {
    const response = await makeRequest('GET', '/api/tenants');

    if (response.status === 200 && response.data.data && response.data.data.length > 0) {
      const tenantWithLease = response.data.data.find(t => t.lease_start_date || t.lease_end_date);
      if (tenantWithLease) {
        tenantId = tenantWithLease.id;
        console.log('✓ Found tenant with lease information');
        console.log(`  Tenant ID: ${tenantId}`);
        console.log(`  Lease Start: ${tenantWithLease.lease_start_date}`);
        console.log(`  Lease End: ${tenantWithLease.lease_end_date}`);
        console.log(`  Lease Status: ${tenantWithLease.lease_status}`);
        return true;
      } else {
        tenantId = response.data.data[0].id;
        console.log('⚠ No tenant with lease info found, using first tenant');
        console.log(`  Tenant ID: ${tenantId}`);
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

// Test 6: Get individual tenant lease status
async function testGetTenantLeaseStatus() {
  if (!tenantId) {
    console.log('\n=== TEST 6: Get Tenant Lease Status - SKIPPED (no tenant ID) ===');
    return false;
  }

  console.log('\n=== TEST 6: Get Individual Tenant Lease Status ===');
  try {
    const response = await makeRequest('GET', `/api/tenants/${tenantId}/lease`);

    if (response.status === 200 && response.data.data) {
      console.log('✓ Tenant lease status retrieved');
      console.log(`  Response:`, JSON.stringify(response.data.data, null, 2));
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

// Test 7: Get tenant lease history
async function testGetTenantLeaseHistory() {
  if (!tenantId) {
    console.log('\n=== TEST 7: Get Tenant Lease History - SKIPPED (no tenant ID) ===');
    return false;
  }

  console.log('\n=== TEST 7: Get Tenant Lease History ===');
  try {
    const response = await makeRequest('GET', `/api/tenants/${tenantId}/lease/history`);

    if (response.status === 200) {
      console.log('✓ Tenant lease history retrieved');
      const count = response.data.data ? response.data.data.length : 0;
      console.log(`  Found ${count} lease history records`);
      if (count > 0) {
        console.log(`  First record:`, JSON.stringify(response.data.data[0], null, 2));
      }
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

// Test 8: Update tenant lease
async function testUpdateTenantLease() {
  if (!tenantId) {
    console.log('\n=== TEST 8: Update Tenant Lease - SKIPPED (no tenant ID) ===');
    return false;
  }

  console.log('\n=== TEST 8: Update Tenant Lease ===');
  try {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const leaseData = {
      lease_start_date: new Date().toISOString().split('T')[0],
      lease_end_date: futureDate.toISOString().split('T')[0],
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

  // Test login first
  if (!(await testLogin())) {
    console.log('\n✗ Cannot proceed: Admin login failed');
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
    console.log('\n✓ All lease management tests passed!');
    console.log('\n✓✓✓ Phase 2 Step 3 Testing: SUCCESSFUL ✓✓✓');
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
