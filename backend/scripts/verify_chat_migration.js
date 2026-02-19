const pool = require('../src/config/database');

async function verify() {
  const result = {};

  const tablesRes = await pool.query(
    "SELECT to_regclass('public.conversations') AS conversations_table, to_regclass('public.conversation_participants') AS participants_table, to_regclass('public.messages') AS messages_table"
  );
  result.tables = tablesRes.rows[0];

  const columnsRes = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='conversations' AND column_name IN ('kind','tenant_user_id','admin_user_id') ORDER BY column_name"
  );
  result.conversation_columns = columnsRes.rows.map((r) => r.column_name);

  const indexesRes = await pool.query(
    "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN ('uq_conversations_property_tenant_community','uq_conversations_property_tenant_admin_dm') ORDER BY indexname"
  );
  result.indexes = indexesRes.rows.map((r) => r.indexname);

  const triggersRes = await pool.query(
    "SELECT tgname FROM pg_trigger WHERE tgname IN ('trg_enforce_conversations_tenant_admin_dm_admin','trg_enforce_conversation_participant_rules') ORDER BY tgname"
  );
  result.triggers = triggersRes.rows.map((r) => r.tgname);

  const appliedRes = await pool.query(
    "SELECT COUNT(*)::int AS applied FROM schema_migrations WHERE filename = '024_phase9_chat_channels.sql'"
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

