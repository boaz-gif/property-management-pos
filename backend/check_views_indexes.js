const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'property_management',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function checkViewsAndIndexes() {
  try {
    const client = await pool.connect();
    
    // Check views
    console.log('--- VIEWS ---');
    const viewsQuery = `
      SELECT table_name, view_definition 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    const viewsResult = await client.query(viewsQuery);
    viewsResult.rows.forEach(view => {
      console.log(`View: ${view.table_name}`);
    });
    
    // Check indexes
    console.log('\n--- INDEXES ---');
    const indexesQuery = `
      SELECT schemaname, tablename, indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY tablename, indexname;
    `;
    const indexesResult = await client.query(indexesQuery);
    indexesResult.rows.forEach(idx => {
      console.log(`${idx.tablename}: ${idx.indexname}`);
    });
    
    // Check foreign keys
    console.log('\n--- FOREIGN KEYS ---');
    const fkQuery = `
      SELECT 
        tc.table_name, 
        tc.constraint_name, 
        ccu.table_name AS foreign_table_name, 
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints tc 
      JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name 
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_schema = 'public' 
      ORDER BY tc.table_name;
    `;
    const fkResult = await client.query(fkQuery);
    fkResult.rows.forEach(fk => {
      console.log(`${fk.table_name} -> ${fk.foreign_table_name} (${fk.foreign_column_name})`);
    });
    
    client.release();
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkViewsAndIndexes();
