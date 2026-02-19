const pool = require('../src/config/database');
const Tenant = require('../src/models/Tenant');
const Property = require('../src/models/Property');

class PerformanceTester {
  constructor() {
    this.results = [];
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 Running ${testName}...`);
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const testResult = {
        name: testName,
        duration: duration,
        success: true,
        result: result,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(testResult);
      
      console.log(`✅ ${testName} completed in ${duration}ms`);
      if (result && typeof result === 'object') {
        if (Array.isArray(result)) {
          console.log(`   Returned ${result.length} records`);
        } else if (result.data) {
          console.log(`   Returned ${result.data.length} records`);
          if (result.pagination) {
            console.log(`   Pagination: ${JSON.stringify(result.pagination)}`);
          }
        }
      }
      
      return testResult;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const testResult = {
        name: testName,
        duration: duration,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(testResult);
      console.log(`❌ ${testName} failed in ${duration}ms: ${error.message}`);
      
      return testResult;
    }
  }

  async testMaterializedViews() {
    // Test tenant aggregations view
    await this.runTest('Materialized View - Tenant Aggregations', async () => {
      const result = await pool.query(`
        SELECT COUNT(*) as total_tenants,
               AVG(payment_count) as avg_payments,
               AVG(maintenance_count) as avg_maintenance
        FROM mv_tenant_aggregations
      `);
      return result.rows[0];
    });

    // Test property aggregations view
    await this.runTest('Materialized View - Property Aggregations', async () => {
      const result = await pool.query(`
        SELECT COUNT(*) as total_properties,
               AVG(tenant_count) as avg_tenants,
               AVG(occupancy_rate) as avg_occupancy
        FROM mv_property_aggregations
      `);
      return result.rows[0];
    });

    // Test financial summary view
    await this.runTest('Materialized View - Financial Summary', async () => {
      const result = await pool.query(`
        SELECT COUNT(*) as total_records,
               SUM(collected_amount) as total_collected
        FROM mv_financial_summary
        WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
      `);
      return result.rows[0];
    });
  }

  async testOptimizedQueries() {
    // Create test user object
    const testUser = {
      role: 'admin',
      properties: [1, 2, 3], // Test with sample property IDs
      id: 1
    };

    // Test optimized Tenant.findAll() with pagination
    await this.runTest('Optimized Tenant.findAll() - First Page', async () => {
      return await Tenant.findAll(testUser, { page: 1, limit: 10 });
    });

    // Test optimized Tenant.findAll() with different page
    await this.runTest('Optimized Tenant.findAll() - Second Page', async () => {
      return await Tenant.findAll(testUser, { page: 2, limit: 10 });
    });

    // Test optimized Tenant.findAll() with larger limit
    await this.runTest('Optimized Tenant.findAll() - Large Page', async () => {
      return await Tenant.findAll(testUser, { page: 1, limit: 50 });
    });

    // Test optimized Property.findAll()
    await this.runTest('Optimized Property.findAll()', async () => {
      return await Property.findAll(testUser);
    });
  }

  async testIndexPerformance() {
    // Test query that should use property_admin index
    await this.runTest('Index Test - Property Admin Query', async () => {
      const result = await pool.query(`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT * FROM properties 
        WHERE admin_id = 1 AND deleted_at IS NULL 
        ORDER BY created_at DESC 
        LIMIT 10
      `);
      return result.rows[0]['QUERY PLAN'][0]['Execution Time'];
    });

    // Test query that should use tenant_property index
    await this.runTest('Index Test - Tenant Property Query', async () => {
      const result = await pool.query(`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT * FROM tenants 
        WHERE property_id = 1 AND deleted_at IS NULL 
        ORDER BY created_at DESC 
        LIMIT 10
      `);
      return result.rows[0]['QUERY PLAN'][0]['Execution Time'];
    });

    // Test query that should use payment_tenant_date index
    await this.runTest('Index Test - Payment Query', async () => {
      const result = await pool.query(`
        EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        SELECT * FROM payments 
        WHERE tenant_id = 1 AND deleted_at IS NULL 
        ORDER BY date DESC 
        LIMIT 10
      `);
      return result.rows[0]['QUERY PLAN'][0]['Execution Time'];
    });
  }

  async testConnectionPool() {
    // Test connection pool under load
    await this.runTest('Connection Pool - Concurrent Queries', async () => {
      const queries = [];
      for (let i = 0; i < 10; i++) {
        queries.push(pool.query('SELECT pg_sleep(0.1), $1 as test_id', [i]));
      }
      const results = await Promise.all(queries);
      return results.length;
    });

    // Test connection pool stats
    await this.runTest('Connection Pool - Stats', async () => {
      return pool.getPoolStats();
    });
  }

  async testMaterializedViewRefresh() {
    // Test materialized view refresh function
    await this.runTest('Materialized View - Refresh All', async () => {
      const result = await pool.query('SELECT refresh_all_materialized_views()');
      return result.rows;
    });
  }

  async generateReport() {
    console.log('\n📊 PERFORMANCE TEST REPORT');
    console.log('='.repeat(50));

    const successfulTests = this.results.filter(r => r.success);
    const failedTests = this.results.filter(r => !r.success);

    console.log(`\n✅ Successful Tests: ${successfulTests.length}/${this.results.length}`);
    console.log(`❌ Failed Tests: ${failedTests.length}/${this.results.length}`);

    if (successfulTests.length > 0) {
      console.log('\n🚀 Performance Results:');
      successfulTests.forEach(test => {
        const status = test.duration < 100 ? '🟢' : test.duration < 500 ? '🟡' : '🔴';
        console.log(`${status} ${test.name}: ${test.duration}ms`);
      });

      const avgDuration = successfulTests.reduce((sum, test) => sum + test.duration, 0) / successfulTests.length;
      console.log(`\n📈 Average Response Time: ${avgDuration.toFixed(2)}ms`);
    }

    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`❌ ${test.name}: ${test.error}`);
      });
    }

    // Performance benchmarks
    console.log('\n🎯 Performance Benchmarks:');
    console.log('- Query Response Time < 100ms: Excellent');
    console.log('- Query Response Time < 500ms: Good');
    console.log('- Query Response Time > 500ms: Needs Optimization');

    return {
      total: this.results.length,
      successful: successfulTests.length,
      failed: failedTests.length,
      averageDuration: successfulTests.length > 0 ? 
        successfulTests.reduce((sum, test) => sum + test.duration, 0) / successfulTests.length : 0,
      results: this.results
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Performance Test...\n');
    
    try {
      await this.testMaterializedViews();
      await this.testOptimizedQueries();
      await this.testIndexPerformance();
      await this.testConnectionPool();
      await this.testMaterializedViewRefresh();
      
      const report = await this.generateReport();
      
      return report;
    } catch (error) {
      console.error('❌ Performance test failed:', error.message);
      throw error;
    } finally {
      await pool.end();
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new PerformanceTester();
  tester.runAllTests()
    .then(report => {
      console.log('\n🎉 Performance testing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Performance testing failed:', error);
      process.exit(1);
    });
}

module.exports = PerformanceTester;
