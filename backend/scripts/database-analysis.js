const pool = require('../src/config/database');
const fs = require('fs');
const path = require('path');

class DatabaseAnalyzer {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      schema: {},
      performance: {},
      indexes: {},
      queries: {},
      recommendations: []
    };
  }

  async analyzeSchema() {
    console.log('🔍 Analyzing database schema...');
    
    // Get all tables
    const tablesQuery = `
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
      FROM information_schema.tables t 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    this.results.schema.tables = tablesResult.rows;
    
    // Get detailed table information
    for (const table of tablesResult.rows) {
      const columnsQuery = `
        SELECT column_name, data_type, character_maximum_length, 
               is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position;
      `;
      
      const columnsResult = await pool.query(columnsQuery, [table.table_name]);
      table.columns = columnsResult.rows;
    }
    
    console.log(`✅ Found ${tablesResult.rows.length} tables`);
  }

  async analyzeTableSizes() {
    console.log('📊 Analyzing table sizes...');
    
    const query = `
      SELECT 
        schemaname,
        relname as table_name,
        pg_size_pretty(pg_total_relation_size(relid)) as total_size,
        pg_size_pretty(pg_relation_size(relid)) as table_size,
        pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) as index_size,
        n_live_tup as row_count,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(relid) DESC;
    `;
    
    const result = await pool.query(query);
    this.results.performance.tableSizes = result.rows;
    console.log(`✅ Analyzed ${result.rows.length} tables`);
  }

  async analyzeIndexes() {
    console.log('🔍 Analyzing indexes...');
    
    // Get all indexes
    const query = `
      SELECT 
        schemaname,
        relname as table_name,
        indexrelname as index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        idx_scan as times_used,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY pg_relation_size(indexrelid) DESC;
    `;
    
    const result = await pool.query(query);
    this.results.indexes.all = result.rows;
    
    // Find unused indexes
    const unusedIndexesQuery = `
      SELECT 
        schemaname,
        relname as table_name,
        indexrelname as index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public' AND idx_scan = 0
      ORDER BY pg_relation_size(indexrelid) DESC;
    `;
    
    const unusedResult = await pool.query(unusedIndexesQuery);
    this.results.indexes.unused = unusedResult.rows;
    
    console.log(`✅ Found ${result.rows.length} indexes, ${unusedResult.rows.length} unused`);
  }

  async analyzeSlowQueries() {
    console.log('🐌 Analyzing slow queries...');
    
    try {
      const query = `
        SELECT 
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements
        WHERE mean_exec_time > 100 -- queries taking more than 100ms on average
        ORDER BY mean_exec_time DESC
        LIMIT 20;
      `;
      
      const result = await pool.query(query);
      this.results.queries.slow = result.rows;
      console.log(`✅ Found ${result.rows.length} slow queries`);
    } catch (error) {
      console.log('⚠️  pg_stat_statements extension not available');
      this.results.queries.slow = [];
    }
  }

  async analyzeSequentialScans() {
    console.log('📈 Analyzing sequential scans...');
    
    const query = `
      SELECT 
        schemaname,
        relname as table_name,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch,
        CASE 
          WHEN seq_scan > 0 AND idx_scan > 0 THEN 
            ROUND((seq_scan::numeric / (seq_scan + idx_scan)) * 100, 2)
          ELSE 0
        END as seq_scan_percentage
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND (seq_scan > 1000 OR seq_tup_read > 10000)
      ORDER BY seq_scan_percentage DESC, seq_tup_read DESC;
    `;
    
    const result = await pool.query(query);
    this.results.performance.sequentialScans = result.rows;
    console.log(`✅ Found ${result.rows.length} tables with high sequential scans`);
  }

  generateRecommendations() {
    console.log('💡 Generating recommendations...');
    
    const recommendations = [];
    
    // Large tables without proper indexes
    const largeTables = this.results.performance.tableSizes?.filter(t => 
      parseInt(t.row_count) > 1000
    ) || [];
    
    if (largeTables.length > 0) {
      recommendations.push({
        type: 'INDEXING',
        priority: 'HIGH',
        issue: 'Large tables may need additional indexes',
        tables: largeTables.map(t => t.table_name),
        recommendation: 'Review query patterns and add composite indexes for common WHERE clauses'
      });
    }
    
    // Unused indexes
    if (this.results.indexes.unused?.length > 0) {
      recommendations.push({
        type: 'CLEANUP',
        priority: 'MEDIUM',
        issue: 'Unused indexes consuming space and slowing writes',
        count: this.results.indexes.unused.length,
        recommendation: 'Consider dropping unused indexes to improve write performance',
        indexes: this.results.indexes.unused.map(i => `${i.table_name}.${i.index_name}`)
      });
    }
    
    // High sequential scans
    const highSeqScans = this.results.performance.sequentialScans?.filter(t => 
      t.seq_scan_percentage > 50
    ) || [];
    
    if (highSeqScans.length > 0) {
      recommendations.push({
        type: 'OPTIMIZATION',
        priority: 'HIGH',
        issue: 'Tables with high sequential scan ratios',
        tables: highSeqScans.map(t => `${t.table_name} (${t.seq_scan_percentage}%)`),
        recommendation: 'Add indexes to reduce sequential scans and improve query performance'
      });
    }
    
    // Slow queries
    if (this.results.queries.slow?.length > 0) {
      recommendations.push({
        type: 'QUERY_OPTIMIZATION',
        priority: 'HIGH',
        issue: 'Slow queries detected',
        count: this.results.queries.slow.length,
        recommendation: 'Optimize slow queries through indexing, query rewriting, or materialized views'
      });
    }
    
    this.results.recommendations = recommendations;
    console.log(`✅ Generated ${recommendations.length} recommendations`);
  }

  async saveResults() {
    const outputPath = path.join(__dirname, '..', 'logs', 'database-analysis.json');
    
    // Ensure logs directory exists
    const logsDir = path.dirname(outputPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
    console.log(`📄 Analysis saved to: ${outputPath}`);
    
    // Also save a readable summary
    const summaryPath = path.join(__dirname, '..', 'logs', 'database-analysis-summary.txt');
    const summary = this.generateSummary();
    fs.writeFileSync(summaryPath, summary);
    console.log(`📄 Summary saved to: ${summaryPath}`);
  }

  generateSummary() {
    let summary = `DATABASE PERFORMANCE ANALYSIS SUMMARY\n`;
    summary += `Generated: ${this.results.timestamp}\n`;
    summary += `${'='.repeat(50)}\n\n`;
    
    // Schema summary
    summary += `SCHEMA OVERVIEW:\n`;
    summary += `- Tables: ${this.results.schema.tables?.length || 0}\n`;
    summary += `- Indexes: ${this.results.indexes.all?.length || 0}\n`;
    summary += `- Unused Indexes: ${this.results.indexes.unused?.length || 0}\n\n`;
    
    // Performance summary
    summary += `PERFORMANCE OVERVIEW:\n`;
    if (this.results.performance.tableSizes) {
      const totalSize = this.results.performance.tableSizes.reduce((sum, table) => {
        const sizeStr = table.total_size;
        const sizeMatch = sizeStr.match(/(\d+)/);
        return sum + (sizeMatch ? parseInt(sizeMatch[1]) : 0);
      }, 0);
      summary += `- Total Database Size: ~${totalSize} units\n`;
    }
    summary += `- Slow Queries: ${this.results.queries.slow?.length || 0}\n`;
    summary += `- High Sequential Scan Tables: ${this.results.performance.sequentialScans?.length || 0}\n\n`;
    
    // Recommendations
    summary += `RECOMMENDATIONS:\n`;
    this.results.recommendations.forEach((rec, index) => {
      summary += `${index + 1}. [${rec.priority}] ${rec.type}: ${rec.issue}\n`;
      summary += `   ${rec.recommendation}\n\n`;
    });
    
    return summary;
  }

  async run() {
    console.log('🚀 Starting Database Performance Analysis...\n');
    
    try {
      await this.analyzeSchema();
      await this.analyzeTableSizes();
      await this.analyzeIndexes();
      await this.analyzeSlowQueries();
      await this.analyzeSequentialScans();
      
      this.generateRecommendations();
      await this.saveResults();
      
      console.log('\n✅ Database analysis completed successfully!');
      console.log('📊 Check the logs directory for detailed results and recommendations.');
      
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      throw error;
    } finally {
      await pool.end();
    }
  }
}

// Run the analysis if this file is executed directly
if (require.main === module) {
  const analyzer = new DatabaseAnalyzer();
  analyzer.run().catch(console.error);
}

module.exports = DatabaseAnalyzer;
