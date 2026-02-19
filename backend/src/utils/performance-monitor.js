const EventEmitter = require('events');
const redisClient = require('../config/redis');
const pool = require('../config/database');

class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      requests: new Map(),
      database: new Map(),
      cache: new Map(),
      errors: new Map(),
      custom: new Map()
    };
    
    this.startTime = Date.now();
    this.interval = null;
    this.enabled = process.env.PERFORMANCE_MONITORING !== 'false';
    
    if (this.enabled) {
      this.startCollection();
    }
  }

  // Start collecting metrics
  startCollection() {
    // Collect metrics every 30 seconds
    this.interval = setInterval(() => {
      this.collectMetrics();
    }, 30000);

    console.log('📊 Performance monitoring started');
  }

  // Stop collecting metrics
  stopCollection() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('📊 Performance monitoring stopped');
    }
  }

  // Track request performance
  trackRequest(req, res, next) {
    if (!this.enabled) return next();

    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    // Add request ID to response headers
    res.setHeader('X-Request-ID', requestId);

    // Track response
    const originalSend = res.send;
    res.send = function(data) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Record metrics
      PerformanceMonitor.prototype.recordRequestMetrics({
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        userId: req.user?.id,
        responseSize: Buffer.byteLength(JSON.stringify(data), 'utf8')
      });

      return originalSend.call(this, data);
    };

    next();
  }

  // Record request metrics
  recordRequestMetrics(metrics) {
    const key = `${metrics.method}:${metrics.path}`;
    const timestamp = Date.now();
    
    if (!this.metrics.requests.has(key)) {
      this.metrics.requests.set(key, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errors: 0,
        statusCodeDistribution: {},
        lastUpdated: timestamp
      });
    }

    const requestMetrics = this.metrics.requests.get(key);
    requestMetrics.count++;
    requestMetrics.totalDuration += metrics.duration;
    requestMetrics.minDuration = Math.min(requestMetrics.minDuration, metrics.duration);
    requestMetrics.maxDuration = Math.max(requestMetrics.maxDuration, metrics.duration);
    requestMetrics.lastUpdated = timestamp;

    // Track status codes
    const statusCode = metrics.statusCode;
    requestMetrics.statusCodeDistribution[statusCode] = (requestMetrics.statusCodeDistribution[statusCode] || 0) + 1;

    // Track errors
    if (statusCode >= 400) {
      requestMetrics.errors++;
      this.recordError('http', {
        path: metrics.path,
        method: metrics.method,
        statusCode,
        duration: metrics.duration,
        userId: metrics.userId,
        timestamp
      });
    }

    // Emit event for real-time monitoring
    this.emit('request', metrics);
  }

  // Track database query performance
  trackDatabaseQuery(query, duration, error = null) {
    if (!this.enabled) return;

    const queryType = this.getQueryType(query);
    const timestamp = Date.now();
    
    if (!this.metrics.database.has(queryType)) {
      this.metrics.database.set(queryType, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errors: 0,
        lastUpdated: timestamp
      });
    }

    const dbMetrics = this.metrics.database.get(queryType);
    dbMetrics.count++;
    dbMetrics.totalDuration += duration;
    dbMetrics.minDuration = Math.min(dbMetrics.minDuration, duration);
    dbMetrics.maxDuration = Math.max(dbMetrics.maxDuration, duration);
    dbMetrics.lastUpdated = timestamp;

    if (error) {
      dbMetrics.errors++;
      this.recordError('database', {
        queryType,
        error: error.message,
        duration,
        timestamp
      });
    }

    this.emit('database', { queryType, duration, error, timestamp });
  }

  // Track cache performance
  trackCacheOperation(operation, key, hit, duration) {
    if (!this.enabled) return;

    const timestamp = Date.now();
    
    if (!this.metrics.cache.has(operation)) {
      this.metrics.cache.set(operation, {
        count: 0,
        hits: 0,
        misses: 0,
        totalDuration: 0,
        lastUpdated: timestamp
      });
    }

    const cacheMetrics = this.metrics.cache.get(operation);
    cacheMetrics.count++;
    cacheMetrics.totalDuration += duration;
    cacheMetrics.lastUpdated = timestamp;

    if (hit) {
      cacheMetrics.hits++;
    } else {
      cacheMetrics.misses++;
    }

    this.emit('cache', { operation, key, hit, duration, timestamp });
  }

  // Record custom metrics
  recordCustomMetric(name, value, tags = {}) {
    if (!this.enabled) return;

    const timestamp = Date.now();
    
    if (!this.metrics.custom.has(name)) {
      this.metrics.custom.set(name, {
        values: [],
        sum: 0,
        count: 0,
        min: Infinity,
        max: 0,
        lastUpdated: timestamp
      });
    }

    const customMetrics = this.metrics.custom.get(name);
    customMetrics.values.push({ value, timestamp, tags });
    customMetrics.sum += value;
    customMetrics.count++;
    customMetrics.min = Math.min(customMetrics.min, value);
    customMetrics.max = Math.max(customMetrics.max, value);
    customMetrics.lastUpdated = timestamp;

    // Keep only last 1000 values to prevent memory issues
    if (customMetrics.values.length > 1000) {
      customMetrics.values = customMetrics.values.slice(-1000);
    }

    this.emit('custom', { name, value, tags, timestamp });
  }

  // Record errors
  recordError(type, errorData) {
    const timestamp = Date.now();
    
    if (!this.metrics.errors.has(type)) {
      this.metrics.errors.set(type, {
        count: 0,
        lastErrors: [],
        lastUpdated: timestamp
      });
    }

    const errorMetrics = this.metrics.errors.get(type);
    errorMetrics.count++;
    errorMetrics.lastUpdated = timestamp;

    // Keep last 100 errors
    errorMetrics.lastErrors.push({ ...errorData, timestamp });
    if (errorMetrics.lastErrors.length > 100) {
      errorMetrics.lastErrors = errorMetrics.lastErrors.slice(-100);
    }

    this.emit('error', { type, ...errorData, timestamp });
  }

  // Collect system metrics
  async collectMetrics() {
    try {
      const timestamp = Date.now();
      
      // Database metrics
      const dbStats = pool.getPoolStats();
      this.recordCustomMetric('database.connections.active', dbStats.totalCount - dbStats.idleCount);
      this.recordCustomMetric('database.connections.idle', dbStats.idleCount);
      this.recordCustomMetric('database.connections.waiting', dbStats.waitingCount);
      this.recordCustomMetric('database.connections.total', dbStats.totalCount);

      // Redis metrics
      if (redisClient.isConnected) {
        const redisStats = await redisClient.getStats();
        if (redisStats && redisStats.memory) {
          this.recordCustomMetric('redis.memory.used', this.parseMemorySize(redisStats.memory.used));
        }
      }

      // System metrics
      const memUsage = process.memoryUsage();
      this.recordCustomMetric('system.memory.rss', memUsage.rss);
      this.recordCustomMetric('system.memory.heap_used', memUsage.heapUsed);
      this.recordCustomMetric('system.memory.heap_total', memUsage.heapTotal);
      this.recordCustomMetric('system.memory.external', memUsage.external);

      // Uptime
      this.recordCustomMetric('system.uptime', Date.now() - this.startTime);

      // Emit metrics collection event
      this.emit('metrics-collected', { timestamp });

    } catch (error) {
      console.error('Error collecting metrics:', error.message);
    }
  }

  // Get query type from SQL
  getQueryType(query) {
    if (!query) return 'unknown';
    
    const upperQuery = query.toUpperCase().trim();
    if (upperQuery.startsWith('SELECT')) return 'select';
    if (upperQuery.startsWith('INSERT')) return 'insert';
    if (upperQuery.startsWith('UPDATE')) return 'update';
    if (upperQuery.startsWith('DELETE')) return 'delete';
    if (upperQuery.startsWith('CREATE')) return 'create';
    if (upperQuery.startsWith('DROP')) return 'drop';
    if (upperQuery.startsWith('ALTER')) return 'alter';
    
    return 'other';
  }

  // Parse memory size string
  parseMemorySize(sizeStr) {
    if (!sizeStr) return 0;
    
    const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
    
    if (match) {
      const [, value, unit] = match;
      return parseFloat(value) * (units[unit.toUpperCase()] || 1);
    }
    
    return 0;
  }

  // Generate request ID
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get performance report
  getReport(timeRange = '1h') {
    const now = Date.now();
    const ranges = {
      '1h': now - 60 * 60 * 1000,
      '24h': now - 24 * 60 * 60 * 1000,
      '7d': now - 7 * 24 * 60 * 60 * 1000
    };
    
    const cutoff = ranges[timeRange] || ranges['1h'];
    
    return {
      timeRange,
      generatedAt: new Date().toISOString(),
      uptime: now - this.startTime,
      requests: this.summarizeMetrics(this.metrics.requests, cutoff),
      database: this.summarizeMetrics(this.metrics.database, cutoff),
      cache: this.summarizeMetrics(this.metrics.cache, cutoff),
      errors: this.summarizeErrors(this.metrics.errors, cutoff),
      custom: this.summarizeCustom(this.metrics.custom, cutoff)
    };
  }

  // Summarize metrics
  summarizeMetrics(metrics, cutoff) {
    const summary = {};
    
    for (const [key, data] of metrics.entries()) {
      if (data.lastUpdated < cutoff) continue;
      
      summary[key] = {
        count: data.count,
        avgDuration: data.count > 0 ? data.totalDuration / data.count : 0,
        minDuration: data.minDuration === Infinity ? 0 : data.minDuration,
        maxDuration: data.maxDuration,
        errors: data.errors || 0,
        errorRate: data.count > 0 ? (data.errors / data.count) * 100 : 0,
        lastUpdated: new Date(data.lastUpdated).toISOString()
      };

      // Add request-specific data
      if (data.statusCodeDistribution) {
        summary[key].statusCodeDistribution = data.statusCodeDistribution;
      }

      // Add cache-specific data
      if (data.hits !== undefined) {
        summary[key].hits = data.hits;
        summary[key].misses = data.misses;
        summary[key].hitRate = data.count > 0 ? (data.hits / data.count) * 100 : 0;
      }
    }
    
    return summary;
  }

  // Summarize errors
  summarizeErrors(errors, cutoff) {
    const summary = {};
    
    for (const [type, data] of errors.entries()) {
      if (data.lastUpdated < cutoff) continue;
      
      summary[type] = {
        count: data.count,
        recentErrors: data.lastErrors.filter(error => error.timestamp >= cutoff),
        lastUpdated: new Date(data.lastUpdated).toISOString()
      };
    }
    
    return summary;
  }

  // Summarize custom metrics
  summarizeCustom(custom, cutoff) {
    const summary = {};
    
    for (const [name, data] of custom.entries()) {
      if (data.lastUpdated < cutoff) continue;
      
      const recentValues = data.values.filter(v => v.timestamp >= cutoff);
      
      summary[name] = {
        count: data.count,
        avg: data.count > 0 ? data.sum / data.count : 0,
        min: data.min === Infinity ? 0 : data.min,
        max: data.max,
        current: recentValues.length > 0 ? recentValues[recentValues.length - 1].value : 0,
        lastUpdated: new Date(data.lastUpdated).toISOString()
      };
    }
    
    return summary;
  }

  // Health check
  async healthCheck() {
    try {
      const now = Date.now();
      const uptime = now - this.startTime;
      
      // Check database
      const dbStats = pool.getPoolStats();
      const dbHealthy = dbStats.waitingCount < 10; // Less than 10 waiting connections
      
      // Check Redis
      const redisHealthy = redisClient.isConnected;
      
      // Check memory usage
      const memUsage = process.memoryUsage();
      const memoryHealthy = memUsage.heapUsed < 500 * 1024 * 1024; // Less than 500MB
      
      // Check error rate
      const recentErrors = Array.from(this.metrics.errors.values())
        .reduce((sum, error) => sum + error.count, 0);
      const errorRateHealthy = recentErrors < 100; // Less than 100 errors
      
      const healthy = dbHealthy && redisHealthy && memoryHealthy && errorRateHealthy;
      
      return {
        status: healthy ? 'healthy' : 'unhealthy',
        uptime,
        checks: {
          database: { status: dbHealthy ? 'pass' : 'fail', details: dbStats },
          redis: { status: redisHealthy ? 'pass' : 'fail' },
          memory: { status: memoryHealthy ? 'pass' : 'fail', details: memUsage },
          errors: { status: errorRateHealthy ? 'pass' : 'fail', count: recentErrors }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Reset metrics
  reset() {
    this.metrics = {
      requests: new Map(),
      database: new Map(),
      cache: new Map(),
      errors: new Map(),
      custom: new Map()
    };
    this.startTime = Date.now();
    
    console.log('📊 Performance metrics reset');
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;
