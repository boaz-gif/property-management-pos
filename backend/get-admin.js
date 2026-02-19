const db = require('./src/utils/database');

(async () => {
  try {
    const result = await db.query('SELECT id, name, email, role FROM users WHERE role = $1 LIMIT 1', ['admin']);
    if (result.rows.length > 0) {
      console.log('ADMIN:' + result.rows[0].email);
    }
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
