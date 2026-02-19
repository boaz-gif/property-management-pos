const Cache = require('../src/utils/cache');
const Tenant = require('../src/models/Tenant');

class CachePerformanceTester {
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

  async testCacheConnection() {
    // Test basic Redis connection
    await this.runTest('Cache Connection Test', async () => {
      const stats = await Cache.getCacheStats();
      return stats;
    });

    // Test cache set/get operations
    await this.runTest('Cache Set/Get Test', async () => {
      const testKey = 'test:performance:key';
      const testValue = { message: 'Hello Redis!', timestamp: Date.now() };
      
      // Set value
      const setResult = await Cache.cacheQuery(testKey, async () => testValue, 60);
      
      // Get value (should be from cache)
      const getResult = await Cache.cacheQuery(testKey, async () => {
        throw new Error('Should not execute this');
      }, 60);
      
      // Clean up
      await Cache.invalidateKey(testKey);
      
      return { setResult, getResult };
    });
  }

  async testTenantQueryCaching() {
    const testUser = {
      role: 'admin',
      properties: [1, 2, 3],
      id: 1
    };

    // First query - should be cache miss
    await this.runTest('Tenant Query - Cache Miss', async () => {
      return await Tenant.findAll(testUser, { page: 1, limit: 10 });
    });

    // Second query - should be cache hit
    await this.runTest('Tenant Query - Cache Hit', async () => {
      return await Tenant.findAll(testUser, { page: 1, limit: 10 });
    });

    // Different pagination - should be cache miss
    await this.runTest('Tenant Query - Different Page', async () => {
      return await Tenant.findAll(testUser, { page: 2, limit: 10 });
    });

    // Same query again - should be cache hit
    await this.runTest('Tenant Query - Cache Hit Again', async () => {
      return await Tenant.findAll(testUser, { page: 2, limit: 10 });
    });
  }

  async testCacheInvalidation() {
    const testUser = {
      role: 'admin',
      properties: [1, 2, 3],
      id: 1
    };

    // Query to populate cache
    await this.runTest('Cache Invalidation - Populate Cache', async () => {
      return await Tenant.findAll(testUser, { page: 1, limit: 10 });
    });

    // Invalidate cache
    await this.runTest('Cache Invalidation - Invalidate', async () => {
      await Cache.invalidateMaterializedViews();
      return 'Cache invalidated';
    });

    // Query again - should be cache miss
    await this.runTest('Cache Invalidation - After Invalidation', async () => {
      return await Tenant.findAll(testUser, { page: 1, limit: 10 });
    });
  }

  async testCachePerformance() {
    // Test cache performance with multiple operations
    await this.runTest('Cache Performance - Multiple Operations', async () => {
      const operations = [];
      
      // Test multiple cache operations
      for (let i = 0; i < 10; i++) {
        const key = `perf:test:${i}`;
        const value = { id: i, data: `test data ${i}` };
        
        operations.push(
          Cache.cacheQuery(key, async () => value, 60)
        );
      }
      
      const results = await Promise.all(operations);
      return results.length;
    });

    // Test cache hit performance
    await this.runTest('Cache Performance - Cache Hits', async () => {
      const operations = [];
      
      // These should all be cache hits
      for (let i = 0; i < 10; i++) {
        const key = `perf:test:${i}`;
        
        operations.push(
          Cache.cacheQuery(key, async () => {
            throw new Error('Should not execute on cache hit');
          }, 60)
        );
      }
      
      const results = await Promise.all(operations);
      return results.length;
    });
  }

  async testCacheMemoryUsage() {
    await this.runTest('Cache Memory Usage', async () => {
      const stats = await Cache.getCacheStats();
      return stats;
    });
  }

  async generateReport() {
    console.log('\n📊 CACHE PERFORMANCE TEST REPORT');
    console.log('='.repeat(50));

    const successfulTests = this.results.filter(r => r.success);
    const failedTests = this.results.filter(r => !r.success);

    console.log(`\n✅ Successful Tests: ${successfulTests.length}/${this.results.length}`);
    console.log(`❌ Failed Tests: ${failedTests.length}/${this.results.length}`);

    if (successfulTests.length > 0) {
      console.log('\n🚀 Cache Performance Results:');
      successfulTests.forEach(test => {
        const status = test.duration < 50 ? '🟢' : test.duration < 200 ? '🟡' : '🔴';
        console.log(`${status} ${test.name}: ${test.duration}ms`);
      });

      const avgDuration = successfulTests.reduce((sum, test) => sum + test.duration, 0) / successfulTests.length;
      console.log(`\n📈 Average Cache Response Time: ${avgDuration.toFixed(2)}ms`);

      // Analyze cache performance
      const cacheMissTests = successfulTests.filter(t => t.name.includes('Cache Miss'));
      const cacheHitTests = successfulTests.filter(t => t.name.includes('Cache Hit'));
      
      if (cacheMissTests.length > 0) {
        const avgMissTime = cacheMissTests.reduce((sum, test) => sum + test.duration, 0) / cacheMissTests.length;
        console.log(`📊 Average Cache Miss Time: ${avgMissTime.toFixed(2)}ms`);
      }
      
      if (cacheHitTests.length > 0) {
        const avgHitTime = cacheHitTests.reduce((sum, test) => sum + test.duration, 0) / cacheHitTests.length;
        console.log(`📊 Average Cache Hit Time: ${avgHitTime.toFixed(2)}ms`);
      }
    }

    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`❌ ${test.name}: ${test.error}`);
      });
    }

    // Performance benchmarks
    console.log('\n🎯 Cache Performance Benchmarks:');
    console.log('- Cache Response Time < 50ms: Excellent');
    console.log('- Cache Response Time < 200ms: Good');
    console.log('- Cache Response Time > 200ms: Needs Optimization');

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
    console.log('🚀 Starting Cache Performance Test...\n');
    
    try {
      await this.testCacheConnection();
      await this.testTenantQueryCaching();
      await this.testCacheInvalidation();
      await this.testCachePerformance();
      await this.testCacheMemoryUsage();
      
      const report = await this.generateReport();
      
      return report;
    } catch (error) {
      console.error('❌ Cache performance test failed:', error.message);
      throw error;
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new CachePerformanceTester();
  tester.runAllTests()
    .then(report => {
      console.log('\n🎉 Cache performance testing completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Cache performance testing failed:', error);
      process.exit(1);
    });
}

module.exports = CachePerformanceTester;
