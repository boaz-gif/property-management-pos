const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'property_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function checkDocuments() {
  console.log('=== DOCUMENTS TABLE COLUMNS ===');
  const docs = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'documents' 
    ORDER BY ordinal_position
  `);
  docs.rows.forEach(r => console.log(r.column_name));
  
  console.log('\n=== PROPERTIES WITH ADMIN ===');
  const props = await pool.query(`
    SELECT p.id, p.name, p.admin_id, u.name as admin_name 
    FROM properties p 
    LEFT JOIN users u ON p.admin_id = u.id 
    WHERE p.deleted_at IS NULL
  `);
  props.rows.forEach(r => console.log(r));
}

checkDocuments()
  .then(() => pool.end())
  .catch(err => {
    console.error(err);
    pool.end();
  });
