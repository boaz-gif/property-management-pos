require('dotenv').config();
const Database = require('./src/utils/database');
const pool = require('./src/config/database');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await Database.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful!');
    console.log('Current time:', result.rows[0].current_time);
    
    // Check if users table exists
    const tableCheck = await Database.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Users table exists');
      
      // Check current user count
      const userCount = await Database.query('SELECT COUNT(*) as count FROM users');
      console.log(`📊 Current user count: ${userCount.rows[0].count}`);
    } else {
      console.log('❌ Users table does not exist');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('Please check:');
    console.log('1. PostgreSQL is running');
    console.log('2. Database credentials in .env file');
    console.log('3. Database exists');
  } finally {
    await pool.end();
  }
}

testConnection();
