const fs = require('fs');
const { Pool } = require('pg');

// Load environment variables
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'property_management',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function runIntrospection() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected successfully!');
    
    // Get basic table info
    const tablesQuery = `
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    const result = await client.query(tablesQuery);
    
    console.log('Current tables:');
    result.rows.forEach(row => {
      console.log(`- ${row.table_name} (${row.table_type})`);
    });
    
    // Get column information for main tables
    const mainTables = ['users', 'properties', 'tenants', 'payments', 'maintenance', 'leases'];
    
    for (const table of mainTables) {
      console.log(`\n--- ${table.toUpperCase()} TABLE STRUCTURE ---`);
      
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = '${table}' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `;
      const columnsResult = await client.query(columnsQuery);
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'NO' ? ' NOT NULL' : '';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`  ${col.column_name}: ${col.data_type}${nullable}${defaultVal}`);
      });
    }
    
    client.release();
    console.log('\nIntrospection completed successfully!');
  } catch (error) {
    console.error('Database connection error:', error.message);
    console.log('This is expected if database is not running locally.');
  } finally {
    await pool.end();
  }
}

runIntrospection();
