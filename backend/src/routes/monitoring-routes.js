const express = require('express');
const performanceMonitor = require('../utils/performance-monitor');
const Cache = require('../utils/cache');
const rateLimiter = require('../middleware/rate-limiter');
const auth = require('../middleware/auth');
const pool = require('../config/database');
const { getSpans, getCascadeReport, detectCascades, clearSpans } = require('../utils/spanTracker');

const router = express.Router();

// Apply rate limiting to monitoring endpoints
router.use(rateLimiter.limit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  keyGenerator: (req) => `monitoring:${req.user?.id || 'anonymous'}`
}));

// Get performance report
router.get('/report', auth.authenticate, auth.requireRole('admin'), async (req, res) => {
  try {
    const { timeRange = '1h' } = req.query;
    const report = performanceMonitor.getReport(timeRange);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Performance report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate performance report'
    });
  }
});

// Get health status
router.get('/health', async (req, res) => {
  try {
    const health = await performanceMonitor.healthCheck();
    
    res.status(health.status === 'healthy' ? 200 : 503).json({
      success: health.status === 'healthy',
      data: health
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

// Get real-time metrics
router.get('/metrics', auth.authenticate, auth.requireRole('admin'), async (req, res) => {
  try {
    const metrics = {
      uptime: Date.now() - performanceMonitor.startTime,
      timestamp: new Date().toISOString(),
      requests: Object.fromEntries(performanceMonitor.metrics.requests),
      database: Object.fromEntries(performanceMonitor.metrics.database),
      cache: Object.fromEntries(performanceMonitor.metrics.cache),
      errors: Object.fromEntries(performanceMonitor.metrics.errors),
      custom: Object.fromEntries(performanceMonitor.metrics.custom)
    };
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics'
    });
  }
});

// Get database performance
router.get('/database', auth.authenticate, auth.requireRole('admin'), async (req, res) => {
  try {
    const pool = require('../config/database');
    const dbStats = pool.getPoolStats();
    
    // Get additional database stats
    const { rows } = await pool.query(`
      SELECT 
        datname as database_name,
        numbackends as active_connections,
        xact_commit as transactions_committed,
        xact_rollback as transactions_rolled_back,
        blks_read as blocks_read,
        blks_hit as blocks_hit,
        tup_returned as tuples_returned,
        tup_fetched as tuples_fetched,
        tup_inserted as tuples_inserted,
        tup_updated as tuples_updated,
        tup_deleted as tuples_deleted
      FROM pg_stat_database 
      WHERE datname = current_database()
    `);
    
    const dbStatsDetailed = rows[0] || {};
    
    res.json({
      success: true,
      data: {
        connectionPool: dbStats,
        databaseStats: dbStatsDetailed,
        cacheHitRatio: dbStatsDetailed.blocks_read > 0 
          ? ((dbStatsDetailed.blocks_hit / (dbStatsDetailed.blocks_read + dbStatsDetailed.blocks_hit)) * 100).toFixed(2)
          : 0
      }
    });
  } catch (error) {
    console.error('Database metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch database metrics'
    });
  }
});

// Get cache performance
router.get('/cache', auth.authenticate, auth.requireRole('admin'), async (req, res) => {
  try {
    const cacheStats = await Cache.getCacheStats();
    
    res.json({
      success: true,
      data: cacheStats
    });
  } catch (error) {
    console.error('Cache metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache metrics'
    });
  }
});

// Get rate limiting stats
router.get('/rate-limits', auth.authenticate, auth.requireRole('admin'), async (req, res) => {
  try {
    const { key } = req.query;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Key parameter is required'
      });
    }
    
    const stats = await rateLimiter.getStats(key);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Rate limit stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rate limit stats'
    });
  }
});

// Get system metrics
router.get('/system', auth.authenticate, auth.requireRole('admin'), async (req, res) => {
  try {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const systemMetrics = {
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch
    };
    
    res.json({
      success: true,
      data: systemMetrics
    });
  } catch (error) {
    console.error('System metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system metrics'
    });
  }
});

// Reset metrics
router.post('/reset', auth.authenticate, auth.requireRole('admin'), async (req, res) => {
  try {
    performanceMonitor.reset();
    
    res.json({
      success: true,
      message: 'Performance metrics reset successfully'
    });
  } catch (error) {
    console.error('Reset metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset metrics'
    });
  }
});

// Get slow queries
router.get('/slow-queries', auth.authenticate, auth.requireRole('admin'), async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const { rows } = await pool.query(`
      SELECT 
        query,
        calls,
        total_exec_time,
        mean_exec_time,
        rows,
        100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
      FROM pg_stat_statements 
      WHERE mean_exec_time > 100 
      ORDER BY mean_exec_time DESC 
      LIMIT $1
    `, [parseInt(limit)]);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Slow queries error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch slow queries'
    });
  }
});

// Get materialized view refresh status
router.get('/materialized-views', auth.authenticate, auth.requireRole('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        schemaname,
        matviewname,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size,
        pg_stat_get_last_vacuum_time(c.oid) as last_vacuum,
        pg_stat_get_last_autovacuum_time(c.oid) as last_autovacuum
      FROM pg_matviews m
      JOIN pg_class c ON c.relname = m.matviewname
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||matviewname) DESC
    `);
    
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Materialized views error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch materialized view stats'
    });
  }
});

// Performance alerts endpoint
router.get('/alerts', auth.authenticate, auth.requireRole('admin'), async (req, res) => {
  try {
    const health = await performanceMonitor.healthCheck();
    const alerts = [];
    
    // Check for performance issues
    if (health.status !== 'healthy') {
      alerts.push({
        level: 'critical',
        type: 'system_health',
        message: 'System health check failed',
        details: health.checks
      });
    }
    
    // Check database connection pool
    const dbStats = require('../config/database').getPoolStats();
    if (dbStats.waitingCount > 5) {
      alerts.push({
        level: 'warning',
        type: 'database_pool',
        message: 'High database connection waiting count',
        details: { waitingCount: dbStats.waitingCount }
      });
    }
    
    // Check memory usage
    const memUsage = process.memoryUsage();
    const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    if (memoryUsagePercent > 80) {
      alerts.push({
        level: 'warning',
        type: 'memory',
        message: 'High memory usage',
        details: { usagePercent: memoryUsagePercent.toFixed(2) }
      });
    }
    
    // Check error rates
    const recentErrors = Array.from(performanceMonitor.metrics.errors.values())
      .reduce((sum, error) => sum + error.count, 0);
    if (recentErrors > 50) {
      alerts.push({
        level: 'warning',
        type: 'error_rate',
        message: 'High error rate detected',
        details: { errorCount: recentErrors }
      });
    }
    
    res.json({
      success: true,
      data: {
        alerts,
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.level === 'critical').length,
        warningAlerts: alerts.filter(a => a.level === 'warning').length
      }
    });
  } catch (error) {
    console.error('Performance alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance alerts'
    });
  }
});

// Get recent request spans / traces
router.get('/traces', auth.authenticate, auth.requireRole('admin'), async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const spans = getSpans(parseInt(limit, 10));

    res.json({
      success: true,
      data: {
        spans,
        count: spans.length,
      }
    });
  } catch (error) {
    console.error('Traces error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trace data'
    });
  }
});

// Get cascade detection report
router.get('/cascades', auth.authenticate, auth.requireRole('admin'), async (req, res) => {
  try {
    const { actionId } = req.query;
    const report = getCascadeReport();
    const cascades = detectCascades(actionId || undefined);

    res.json({
      success: true,
      data: {
        summary: report,
        cascades: cascades.slice(0, 50), // Limit response size
      }
    });
  } catch (error) {
    console.error('Cascade detection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cascade data'
    });
  }
});

// Clear span tracking data
router.post('/traces/clear', auth.authenticate, auth.requireRole('admin'), async (req, res) => {
  try {
    clearSpans();
    res.json({
      success: true,
      message: 'Span tracking data cleared'
    });
  } catch (error) {
    console.error('Clear traces error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear trace data'
    });
  }
});

module.exports = router;
