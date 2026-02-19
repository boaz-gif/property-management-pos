const fs = require('fs');
const path = require('path');
const pool = require('../src/config/database');

function quoteIdent(ident) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(ident)) {
    throw new Error(`Unsafe identifier: ${ident}`);
  }
  return `"${ident}"`;
}

function markdownTable(headers, rows) {
  const headerLine = `| ${headers.join(' | ')} |`;
  const sepLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const bodyLines = rows.map((r) => `| ${r.map((v) => (v === null || v === undefined ? '' : String(v).replaceAll('\n', ' '))).join(' | ')} |`);
  return [headerLine, sepLine, ...bodyLines].join('\n');
}

function buildMermaidErDiagram(tables, foreignKeys) {
  const lines = ['erDiagram'];

  for (const table of tables) {
    const cols = table.columns || [];
    lines.push(`  ${table.table_name} {`);
    for (const col of cols) {
      const type = (col.data_type || 'unknown').toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      lines.push(`    ${type} ${col.column_name}`);
    }
    lines.push('  }');
  }

  const uniq = new Set();
  for (const fk of foreignKeys) {
    const from = fk.from_table;
    const to = fk.to_table;
    const key = `${from}->${to}:${fk.constraint_name}`;
    if (uniq.has(key)) continue;
    uniq.add(key);
    lines.push(`  ${from} }o--|| ${to} : "${fk.from_column} -> ${fk.to_column}"`);
  }

  return lines.join('\n');
}

async function run() {
  const client = await pool.connect();
  try {
    const generatedAt = new Date().toISOString();

    const tablesRes = await client.query(`
      SELECT
        n.nspname AS schemaname,
        c.relname AS tablename,
        pg_size_pretty(pg_total_relation_size(c.oid)) AS size,
        pg_total_relation_size(c.oid) AS size_bytes
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
      ORDER BY pg_total_relation_size(c.oid) DESC;
    `);

    const tableRows = [];
    for (const t of tablesRes.rows) {
      const schema = t.schemaname;
      const table = t.tablename;
      const countRes = await client.query(
        `SELECT COUNT(*)::bigint AS row_count FROM ${quoteIdent(schema)}.${quoteIdent(table)};`
      );
      tableRows.push({
        schemaname: schema,
        tablename: table,
        size: t.size,
        size_bytes: Number(t.size_bytes),
        row_count: Number(countRes.rows[0].row_count),
      });
    }

    const columnsRes = await client.query(`
      SELECT
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);

    const pkRes = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        kcu.ordinal_position
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY tc.table_name, kcu.ordinal_position;
    `);

    const uniqueRes = await client.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        kcu.ordinal_position
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'UNIQUE'
      ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;
    `);

    const fkRes = await client.query(`
      SELECT
        tc.table_name AS from_table,
        kcu.column_name AS from_column,
        ccu.table_name AS to_table,
        ccu.column_name AS to_column,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, tc.constraint_name;
    `);

    const indexesRes = await client.query(`
      SELECT
        i.schemaname,
        i.tablename,
        i.indexname,
        i.indexdef
      FROM pg_indexes i
      WHERE i.schemaname = 'public'
      ORDER BY i.tablename, i.indexname;
    `);

    const triggersRes = await client.query(`
      SELECT
        trigger_name,
        event_manipulation,
        event_object_table,
        action_timing,
        action_statement
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name;
    `);

    const auditTablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name LIKE '%audit%' OR table_name LIKE '%log%')
      ORDER BY table_name;
    `);

    const softDeleteRes = await client.query(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'deleted_at'
      ORDER BY table_name;
    `);

    const enumsRes = await client.query(`
      SELECT
        t.typname AS enum_name,
        e.enumlabel AS enum_value,
        e.enumsortorder
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder;
    `);

    const tablesByName = new Map();
    for (const t of tableRows) {
      tablesByName.set(t.tablename, {
        table_name: t.tablename,
        schemaname: t.schemaname,
        size: t.size,
        size_bytes: t.size_bytes,
        row_count: t.row_count,
        columns: [],
        primary_key: [],
        unique_constraints: {},
      });
    }

    for (const c of columnsRes.rows) {
      const table = tablesByName.get(c.table_name);
      if (!table) continue;
      table.columns.push({
        column_name: c.column_name,
        data_type: c.data_type,
        is_nullable: c.is_nullable,
        column_default: c.column_default,
        character_maximum_length: c.character_maximum_length,
        ordinal_position: c.ordinal_position,
      });
    }

    for (const pk of pkRes.rows) {
      const table = tablesByName.get(pk.table_name);
      if (!table) continue;
      table.primary_key.push(pk.column_name);
    }

    for (const u of uniqueRes.rows) {
      const table = tablesByName.get(u.table_name);
      if (!table) continue;
      if (!table.unique_constraints[u.constraint_name]) table.unique_constraints[u.constraint_name] = [];
      table.unique_constraints[u.constraint_name].push(u.column_name);
    }

    const report = {
      generated_at: generatedAt,
      schema: {
        tables: Array.from(tablesByName.values()).sort((a, b) => b.size_bytes - a.size_bytes),
        foreign_keys: fkRes.rows,
        indexes: indexesRes.rows,
        triggers: triggersRes.rows,
        enums: (() => {
          const map = new Map();
          for (const row of enumsRes.rows) {
            if (!map.has(row.enum_name)) map.set(row.enum_name, []);
            map.get(row.enum_name).push(row.enum_value);
          }
          return Array.from(map.entries()).map(([enum_name, values]) => ({ enum_name, values }));
        })(),
        audit_log_tables: auditTablesRes.rows.map((r) => r.table_name),
        soft_delete_tables: softDeleteRes.rows.map((r) => r.table_name),
      },
    };

    const docsDir = path.resolve(__dirname, '..', 'docs', 'db-introspection');
    fs.mkdirSync(docsDir, { recursive: true });
    const jsonPath = path.join(docsDir, 'phase1-introspection.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    const tablesMd = markdownTable(
      ['schema', 'table', 'rows', 'size'],
      report.schema.tables.map((t) => [t.schemaname, t.table_name, t.row_count, t.size])
    );

    const fkMd = markdownTable(
      ['from_table', 'from_column', 'to_table', 'to_column', 'constraint'],
      report.schema.foreign_keys.map((fk) => [fk.from_table, fk.from_column, fk.to_table, fk.to_column, fk.constraint_name])
    );

    const idxMd = markdownTable(
      ['table', 'index', 'definition'],
      report.schema.indexes.map((i) => [i.tablename, i.indexname, i.indexdef])
    );

    const trigMd = markdownTable(
      ['table', 'trigger', 'event', 'timing', 'statement'],
      report.schema.triggers.map((t) => [t.event_object_table, t.trigger_name, t.event_manipulation, t.action_timing, t.action_statement])
    );

    const perTableSections = report.schema.tables
      .map((t) => {
        const colMd = markdownTable(
          ['column', 'type', 'nullable', 'default', 'max_len'],
          (t.columns || []).map((c) => [
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.column_default,
            c.character_maximum_length,
          ])
        );

        const pk = t.primary_key?.length ? t.primary_key.join(', ') : '';
        const uniques = Object.entries(t.unique_constraints || {})
          .map(([name, cols]) => `${name}: (${cols.join(', ')})`)
          .join('\n');

        return [
          `## ${t.table_name}`,
          '',
          `- Rows: ${t.row_count}`,
          `- Size: ${t.size}`,
          `- Primary key: ${pk || '—'}`,
          `- Unique constraints:\n${uniques || '—'}`,
          '',
          colMd,
          '',
        ].join('\n');
      })
      .join('\n');

    const enumsMd = report.schema.enums.length
      ? report.schema.enums.map((e) => `- ${e.enum_name}: ${e.values.join(', ')}`).join('\n')
      : '—';

    const mermaid = buildMermaidErDiagram(
      report.schema.tables.map((t) => ({ table_name: t.table_name, columns: t.columns })),
      report.schema.foreign_keys
    );

    const md = [
      '# Phase 1 Database Introspection Report',
      '',
      `Generated at: ${generatedAt}`,
      '',
      '## Tables (with row counts and sizes)',
      '',
      tablesMd,
      '',
      '## Foreign Keys',
      '',
      fkMd,
      '',
      '## Indexes',
      '',
      idxMd,
      '',
      '## Triggers',
      '',
      trigMd,
      '',
      '## Audit/Log Tables',
      '',
      report.schema.audit_log_tables.length ? report.schema.audit_log_tables.map((t) => `- ${t}`).join('\n') : '—',
      '',
      '## Soft Delete (deleted_at present)',
      '',
      report.schema.soft_delete_tables.length ? report.schema.soft_delete_tables.map((t) => `- ${t}`).join('\n') : '—',
      '',
      '## Enums',
      '',
      enumsMd,
      '',
      '## ERD (Mermaid)',
      '',
      '```mermaid',
      mermaid,
      '```',
      '',
      '## Data Dictionary',
      '',
      perTableSections,
    ].join('\n');

    const mdPath = path.join(docsDir, 'phase1-introspection.md');
    fs.writeFileSync(mdPath, md);

    console.log(`Wrote ${jsonPath}`);
    console.log(`Wrote ${mdPath}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

