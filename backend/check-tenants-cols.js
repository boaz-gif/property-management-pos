const db = require('./src/utils/database');

(async () => {
  try {
    const result = await db.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'tenants\' ORDER BY ordinal_position');
    console.log('COLUMNS:');
    result.rows.forEach(r => console.log(r.column_name));
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
