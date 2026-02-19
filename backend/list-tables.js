const db = require('./src/utils/database');

(async () => {
  try {
    const result = await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('Tables:');
    result.rows.forEach(r => console.log(' -', r.table_name));
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
