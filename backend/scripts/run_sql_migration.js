const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

function parseMigration(sql) {
  const marker = '-- ROLLBACK SCRIPT';
  const parts = sql.split(marker);
  const upSql = parts[0].trim();
  const downSql = (parts[1] || '').trim();
  return { upSql, downSql };
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function run() {
  const [, , direction, filename] = process.argv;
  if (!direction || !filename || !['up', 'down'].includes(direction)) {
    throw new Error('Usage: node scripts/run_sql_migration.js <up|down> <migration.sql>');
  }

  const migrationsDir = path.resolve(__dirname, '..', 'database', 'migrations');
  const filePath = path.resolve(migrationsDir, filename);
  if (!filePath.startsWith(migrationsDir + path.sep)) {
    throw new Error('Invalid migration path');
  }

  const sql = fs.readFileSync(filePath, 'utf8');
  const { upSql, downSql } = parseMigration(sql);
  if (direction === 'up' && !upSql) throw new Error('No UP SQL found');
  if (direction === 'down' && !downSql) throw new Error('No DOWN SQL found');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureMigrationsTable(client);

    if (direction === 'up') {
      const already = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [filename]);
      if (already.rows.length > 0) {
        console.log(`Already applied: ${filename}`);
        await client.query('ROLLBACK');
        return;
      }
      await client.query(upSql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
      console.log(`Applied: ${filename}`);
      return;
    }

    const applied = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [filename]);
    if (applied.rows.length === 0) {
      console.log(`Not applied (skipping): ${filename}`);
      await client.query('ROLLBACK');
      return;
    }

    await client.query(downSql);
    await client.query('DELETE FROM schema_migrations WHERE filename = $1', [filename]);
    await client.query('COMMIT');
    console.log(`Rolled back: ${filename}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

