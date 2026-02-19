const pool = require('../src/config/database');

async function verify() {
  const result = {};

  const tablesRes = await pool.query(
    "SELECT to_regclass('public.units') AS units_table, to_regclass('public.tenants') AS tenants_table"
  );
  result.tables = tablesRes.rows[0];

  const columnRes = await pool.query(
    "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tenants' AND column_name='unit_id') AS tenants_has_unit_id"
  );
  result.columns = columnRes.rows[0];

  const indexesRes = await pool.query(
    "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN ('idx_units_property_id','uq_units_property_unit_number','idx_tenants_unit_id','uq_active_tenant_per_unit_string') ORDER BY indexname"
  );
  result.indexes = indexesRes.rows.map((r) => r.indexname);

  const migrationRes = await pool.query(
    "SELECT COUNT(*)::int AS applied FROM schema_migrations WHERE filename = '023_phase8_units.sql'"
  );
  result.schema_migrations = migrationRes.rows[0];

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

