const pool = require('../src/config/database');

async function verify() {
  const result = {};

  const tablesRes = await pool.query(
    "SELECT to_regclass('public.property_lease_settings') AS property_lease_settings, to_regclass('public.lease_expiration_reminders') AS lease_expiration_reminders"
  );
  result.tables = tablesRes.rows[0];

  const idxRes = await pool.query(
    "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN ('uq_lease_expiration_reminders_tenant_type')"
  );
  result.indexes = idxRes.rows.map((r) => r.indexname);

  const appliedRes = await pool.query(
    "SELECT COUNT(*)::int AS applied FROM schema_migrations WHERE filename = '025_phase10_lease_notifications.sql'"
  );
  result.schema_migrations = appliedRes.rows[0];

  console.log(JSON.stringify(result, null, 2));
}

verify()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

