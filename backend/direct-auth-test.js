const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'propertydb',
  port: process.env.DB_PORT || 5432,
});

async function testAuthentication() {
  try {
    console.log('🧪 Testing Authentication Flow...');
    console.log('=' .repeat(50));
    
    // Test 1: Check super admin user exists
    console.log('\n1️⃣ Checking super admin user in database...');
    const userQuery = 'SELECT * FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, ['super@admin.com']);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Super admin user not found in database');
      return false;
    }
    
    const superAdmin = userResult.rows[0];
    console.log('✅ Super admin found:', {
      id: superAdmin.id,
      name: superAdmin.name,
      email: superAdmin.email,
      role: superAdmin.role
    });
    
    // Test 2: Verify password hash is not a placeholder
    console.log('\n2️⃣ Checking password hash...');
    if (superAdmin.password === '$2b$10$placeholder_hash') {
      console.log('❌ Password is still placeholder hash');
      return false;
    }
    console.log('✅ Password hash is properly generated');
    
    // Test 3: Test password verification
    console.log('\n3️⃣ Testing password verification...');
    const isValidPassword = await bcrypt.compare('SuperAdmin2025', superAdmin.password);
    
    if (!isValidPassword) {
      console.log('❌ Password verification failed');
      return false;
    }
    console.log('✅ Password verification passed');
    
    // Test 4: Test invalid password
    console.log('\n4️⃣ Testing invalid password...');
    const isInvalidPassword = await bcrypt.compare('WrongPassword', superAdmin.password);
    
    if (isInvalidPassword) {
      console.log('❌ Invalid password was accepted (this should not happen)');
      return false;
    }
    console.log('✅ Invalid password correctly rejected');
    
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('=' .repeat(50));
    console.log('✅ Super admin authentication is working correctly');
    console.log('📧 Login credentials:');
    console.log('   Email: super@admin.com');
    console.log('   Password: SuperAdmin2025');
    console.log('=' .repeat(50));
    
    return true;
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    return false;
  } finally {
    await pool.end();
  }
}

testAuthentication();
