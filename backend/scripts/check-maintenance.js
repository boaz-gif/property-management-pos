const pool = require('../src/config/database');

async function checkMaintenanceTable() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'maintenance' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('Maintenance table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMaintenanceTable();
