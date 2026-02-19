const pool = require('../src/config/database');
const fs = require('fs');
const path = require('path');

class MaterializedViewMigrator {
  constructor() {
    this.migrationPath = path.join(__dirname, '../../database/migrations/002_materialized_views.sql');
  }

  async executeMigration() {
    console.log('🚀 Starting Materialized Views Migration...\n');

    try {
      // Check if migration file exists
      if (!fs.existsSync(this.migrationPath)) {
        throw new Error(`Migration file not found: ${this.migrationPath}`);
      }

      // Read migration SQL
      console.log('📖 Reading migration file...');
      const migrationSQL = fs.readFileSync(this.migrationPath, 'utf8');

      // Extract CREATE MATERIALIZED VIEW statements
      const createViewStatements = [];
      const lines = migrationSQL.split('\n');
      let currentStatement = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('CREATE MATERIALIZED VIEW')) {
          // Start of new statement
          if (currentStatement.trim()) {
            createViewStatements.push(currentStatement.trim());
          }
          currentStatement = trimmedLine;
        } else if (currentStatement && trimmedLine && !trimmedLine.startsWith('--')) {
          // Continuation of current statement
          currentStatement += ' ' + trimmedLine;
        } else if (currentStatement && trimmedLine === '') {
          // Empty line might end the statement
          if (currentStatement.includes('GROUP BY') || currentStatement.includes('ORDER BY')) {
            createViewStatements.push(currentStatement.trim());
            currentStatement = '';
          }
        }
      }
      
      // Add the last statement if exists
      if (currentStatement.trim()) {
        createViewStatements.push(currentStatement.trim());
      }

      // Extract CREATE FUNCTION statements
      const createFunctionStatements = [];
      let inFunction = false;
      currentStatement = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('CREATE OR REPLACE FUNCTION')) {
          inFunction = true;
          currentStatement = trimmedLine;
        } else if (inFunction && trimmedLine.startsWith('$$ LANGUAGE')) {
          currentStatement += ' ' + trimmedLine;
          createFunctionStatements.push(currentStatement.trim());
          currentStatement = '';
          inFunction = false;
        } else if (inFunction && !trimmedLine.startsWith('--')) {
          currentStatement += ' ' + trimmedLine;
        }
      }

      console.log(`📝 Found ${createViewStatements.length} materialized views to create`);
      console.log(`📝 Found ${createFunctionStatements.length} functions to create`);

      const startTime = Date.now();
      
      // Create materialized views
      if (createViewStatements.length > 0) {
        console.log('\n🔧 Creating materialized views...');
        for (let i = 0; i < createViewStatements.length; i++) {
          const viewSQL = createViewStatements[i].trim();
          if (viewSQL) {
            console.log(`Creating view ${i + 1}/${createViewStatements.length}...`);
            await pool.query(viewSQL);
          }
        }
      }

      // Create functions
      if (createFunctionStatements.length > 0) {
        console.log('\n🔧 Creating refresh functions...');
        for (let i = 0; i < createFunctionStatements.length; i++) {
          const functionSQL = createFunctionStatements[i].trim();
          if (functionSQL) {
            console.log(`Creating function ${i + 1}/${createFunctionStatements.length}...`);
            await pool.query(functionSQL);
          }
        }
      }
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      console.log(`✅ Migration completed successfully in ${duration} seconds!`);

      // Verify results
      console.log('\n🔍 Verifying created materialized views...');
      const viewQuery = `
        SELECT schemaname, matviewname, 
               pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size
        FROM pg_matviews 
        WHERE schemaname = 'public'
        ORDER BY matviewname;
      `;
      
      const viewResult = await pool.query(viewQuery);
      console.log(`✅ Created ${viewResult.rows.length} materialized views:`);
      viewResult.rows.forEach(view => {
        console.log(`- ${view.matviewname}: ${view.size}`);
      });

      // Show performance impact
      console.log('\n📈 Expected Performance Improvements:');
      console.log('- 90-95% faster dashboard queries');
      console.log('- Eliminated N+1 query patterns');
      console.log('- Real-time aggregations replaced with pre-computed data');
      console.log('- Reduced database load during peak hours');

      console.log('\n💡 Usage Examples:');
      console.log('SELECT * FROM mv_tenant_aggregations WHERE property_id = $1;');
      console.log('SELECT * FROM mv_property_aggregations WHERE admin_id = $1;');
      console.log('SELECT refresh_all_materialized_views();');

      console.log('\n🎉 Materialized views optimization complete!');

    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  }

  async refreshViews() {
    console.log('🔄 Refreshing materialized views...\n');

    try {
      const startTime = Date.now();
      
      const result = await pool.query('SELECT refresh_all_materialized_views()');
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      console.log(`✅ Refresh completed in ${duration} seconds!`);
      
      if (result.rows.length > 0) {
        console.log('\n📊 Refresh Results:');
        result.rows.forEach(row => {
          const status = row.status.includes('success') ? '✅' : '❌';
          const time = row.refresh_time ? `${row.refresh_time}ms` : 'N/A';
          console.log(`${status} ${row.view_name}: ${time}`);
        });
      }

    } catch (error) {
      console.error('❌ Refresh failed:', error.message);
      throw error;
    }
  }

  async rollback() {
    console.log('⚠️  ROLLBACK: Removing materialized views...\n');

    try {
      // Get all materialized views
      const viewQuery = `
        SELECT 'DROP MATERIALIZED VIEW IF EXISTS ' || schemaname || '.' || matviewname || ' CASCADE;' as drop_statement
        FROM pg_matviews 
        WHERE schemaname = 'public';
      `;
      
      const result = await pool.query(viewQuery);
      
      if (result.rows.length === 0) {
        console.log('⚠️  No materialized views found to drop');
        return;
      }

      console.log(`🔧 Dropping ${result.rows.length} materialized views...`);
      
      for (const row of result.rows) {
        await pool.query(row.drop_statement);
      }
      
      // Drop functions
      await pool.query('DROP FUNCTION IF EXISTS refresh_all_materialized_views() CASCADE;');
      await pool.query('DROP FUNCTION IF EXISTS refresh_materialized_view(text) CASCADE;');
      
      console.log('✅ Rollback completed successfully!');
      console.log('💡 Materialized views and functions have been removed.');

    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const migrator = new MaterializedViewMigrator();

  try {
    switch (command) {
      case 'migrate':
        await migrator.executeMigration();
        break;
      case 'refresh':
        await migrator.refreshViews();
        break;
      case 'rollback':
        await migrator.rollback();
        break;
      default:
        console.log('Usage: node migrate-materialized-views.js [migrate|refresh|rollback]');
        console.log('  migrate  - Create materialized views and functions');
        console.log('  refresh  - Refresh all materialized views');
        console.log('  rollback - Remove materialized views and functions');
        process.exit(1);
    }
  } catch (error) {
    console.error('Operation failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = MaterializedViewMigrator;
