require('dotenv').config();
const { Pool } = require('pg');

console.log('DB Config:');
console.log('  Host:', process.env.DB_HOST);
console.log('  Port:', process.env.DB_PORT);
console.log('  Database:', process.env.DB_NAME);
console.log('  User:', process.env.DB_USER);
console.log('  Password:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
console.log('  Password type:', typeof process.env.DB_PASSWORD);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.query('SELECT NOW()')
  .then(r => {
    console.log('✅ Success:', r.rows[0]);
    pool.end();
  })
  .catch(e => {
    console.log('❌ Error:', e.message);
    pool.end();
  });
