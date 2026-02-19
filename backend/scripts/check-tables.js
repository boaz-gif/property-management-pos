const pool = require('../src/config/database');

async function checkTables() {
  try {
    // Check properties table columns
    const propertiesResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'properties' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('Properties table columns:');
    propertiesResult.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });

    // Check tenants table columns
    const tenantsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tenants' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\nTenants table columns:');
    tenantsResult.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });

    // Check payments table columns
    const paymentsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payments' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\nPayments table columns:');
    paymentsResult.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
