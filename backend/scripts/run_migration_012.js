
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to database');

    const migrationPath = path.join(__dirname, '../database/migrations/012_tenant_portal_tables.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    await client.query(migrationSql);
    console.log('Migration completed successfully.');

  } catch (err) {
    console.error('Error executing migration:', err);
  } finally {
    await client.end();
  }
}

runMigration();
