const EventEmitter = require('events');
const performanceMonitor = require('./performance-monitor');

class AlertSystem extends EventEmitter {
  constructor() {
    super();
    this.alerts = new Map();
    this.thresholds = {
      // Performance thresholds
      responseTime: {
        warning: 500,  // 500ms
        critical: 1000 // 1 second
      },
      errorRate: {
        warning: 5,   // 5%
        critical: 10  // 10%
      },
      memoryUsage: {
        warning: 80,  // 80%
        critical: 90  // 90%
      },
      cpuUsage: {
        warning: 70,  // 70%
        critical: 85  // 85%
      },
      databaseConnections: {
        warning: 40,  // 40 connections
        critical: 45  // 45 connections
      },
      cacheHitRate: {
        warning: 70,  // 70%
        critical: 50  // 50%
      },
      rateLimitViolations: {
        warning: 10,  // 10 violations per minute
        critical: 25  // 25 violations per minute
      }
    };
    
    this.alertHistory = [];
    this.cooldownPeriod = 5 * 60 * 1000; // 5 minutes
    this.enabled = process.env.ALERT_SYSTEM_ENABLED !== 'false';
    
    if (this.enabled) {
      this.startMonitoring();
    }
  }

  startMonitoring() {
    console.log('🚨 Alert system started');
    
    // Monitor performance metrics every 30 seconds
    setInterval(() => {
      this.checkPerformanceMetrics();
    }, 30000);

    // Listen to performance monitor events
    performanceMonitor.on('request', (data) => {
      this.checkRequestPerformance(data);
    });

    performanceMonitor.on('error', (data) => {
      this.checkErrorRate(data);
    });

    performanceMonitor.on('database', (data) => {
      this.checkDatabasePerformance(data);
    });

    performanceMonitor.on('cache', (data) => {
      this.checkCachePerformance(data);
    });
  }

  async checkPerformanceMetrics() {
    try {
      const health = await performanceMonitor.healthCheck();
      const memUsage = process.memoryUsage();
      
      // Check memory usage
      const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      this.checkThreshold('memoryUsage', memoryUsagePercent, {
        type: 'system',
        severity: this.getSeverity(memoryUsagePercent, this.thresholds.memoryUsage),
        message: `Memory usage at ${memoryUsagePercent.toFixed(1)}%`,
        details: {
          used: memUsage.heapUsed,
          total: memUsage.heapTotal,
          external: memUsage.external
        }
      });

      // Check database connections
      if (health.checks && health.checks.database) {
        const waitingCount = health.checks.database.details.waitingCount || 0;
        this.checkThreshold('databaseConnections', waitingCount, {
          type: 'database',
          severity: this.getSeverity(waitingCount, this.thresholds.databaseConnections, true),
          message: `${waitingCount} database connections waiting`,
          details: health.checks.database.details
        });
      }

    } catch (error) {
      console.error('Error checking performance metrics:', error.message);
    }
  }

  checkRequestPerformance(data) {
    if (data.duration > this.thresholds.responseTime.critical) {
      this.createAlert('slow_request', {
        type: 'performance',
        severity: 'critical',
        message: `Slow request detected: ${data.method} ${data.path} took ${data.duration}ms`,
        details: data
      });
    } else if (data.duration > this.thresholds.responseTime.warning) {
      this.createAlert('slow_request_warning', {
        type: 'performance',
        severity: 'warning',
        message: `Slow request warning: ${data.method} ${data.path} took ${data.duration}ms`,
        details: data
      });
    }
  }

  checkErrorRate(data) {
    // Calculate error rate over the last minute
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    let recentErrors = 0;
    let totalRequests = 0;
    
    // This would be enhanced with proper metrics storage
    // For now, we'll trigger alerts on individual errors
    if (data.statusCode >= 500) {
      this.createAlert('server_error', {
        type: 'error',
        severity: 'critical',
        message: `Server error: ${data.error || 'Unknown error'}`,
        details: data
      });
    } else if (data.statusCode >= 400) {
      this.createAlert('client_error', {
        type: 'error',
        severity: 'warning',
        message: `Client error: ${data.error || 'Bad request'}`,
        details: data
      });
    }
  }

  checkDatabasePerformance(data) {
    if (data.duration > 1000) { // 1 second
      this.createAlert('slow_database_query', {
        type: 'database',
        severity: 'warning',
        message: `Slow database query: ${data.queryType} took ${data.duration}ms`,
        details: data
      });
    }

    if (data.error) {
      this.createAlert('database_error', {
        type: 'database',
        severity: 'critical',
        message: `Database error: ${data.error}`,
        details: data
      });
    }
  }

  checkCachePerformance(data) {
    // Monitor cache hit rate
    if (data.operation === 'get' && !data.hit) {
      this.createAlert('cache_miss', {
        type: 'cache',
        severity: 'info',
        message: `Cache miss for key: ${data.key}`,
        details: data
      });
    }
  }

  checkThreshold(metric, value, alertConfig) {
    const threshold = this.thresholds[metric];
    if (!threshold) return;

    if (value >= threshold.critical) {
      this.createAlert(`${metric}_critical`, {
        ...alertConfig,
        severity: 'critical'
      });
    } else if (value >= threshold.warning) {
      this.createAlert(`${metric}_warning`, {
        ...alertConfig,
        severity: 'warning'
      });
    }
  }

  getSeverity(value, threshold, isHigherWorse = false) {
    if (isHigherWorse) {
      if (value >= threshold.critical) return 'critical';
      if (value >= threshold.warning) return 'warning';
    } else {
      if (value <= threshold.critical) return 'critical';
      if (value <= threshold.warning) return 'warning';
    }
    return 'info';
  }

  createAlert(id, config) {
    const now = Date.now();
    
    // Check cooldown period
    const lastAlert = this.alerts.get(id);
    if (lastAlert && (now - lastAlert.timestamp) < this.cooldownPeriod) {
      return; // Still in cooldown period
    }

    const alert = {
      id,
      timestamp: now,
      ...config
    };

    // Store alert
    this.alerts.set(id, alert);
    this.alertHistory.push(alert);

    // Keep only last 1000 alerts in history
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-1000);
    }

    // Emit alert event
    this.emit('alert', alert);

    // Log alert
    this.logAlert(alert);

    // Send notifications based on severity
    this.sendNotification(alert);
  }

  logAlert(alert) {
    const timestamp = new Date(alert.timestamp).toISOString();
    const emoji = this.getSeverityEmoji(alert.severity);
    
    console.log(`${emoji} [${timestamp}] ${alert.severity.toUpperCase()}: ${alert.message}`);
    
    if (alert.details) {
      console.log('   Details:', JSON.stringify(alert.details, null, 2));
    }
  }

  getSeverityEmoji(severity) {
    const emojis = {
      critical: '🚨',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return emojis[severity] || 'ℹ️';
  }

  async sendNotification(alert) {
    // In production, this would integrate with:
    // - Email services (SendGrid, AWS SES)
    // - Slack/Discord webhooks
    // - SMS services (Twilio)
    // - Push notifications
    // - PagerDuty/OpsGenie for critical alerts

    try {
      switch (alert.severity) {
        case 'critical':
          await this.sendCriticalNotification(alert);
          break;
        case 'warning':
          await this.sendWarningNotification(alert);
          break;
        case 'info':
          await this.sendInfoNotification(alert);
          break;
      }
    } catch (error) {
      console.error('Failed to send notification:', error.message);
    }
  }

  async sendCriticalNotification(alert) {
    // Critical alerts should trigger immediate notifications
    console.log('🚨 CRITICAL ALERT - Immediate notification required!');
    
    // In production:
    // - Send SMS to on-call engineers
    // - Create PagerDuty incident
    // - Send Slack message to critical channel
    // - Email all administrators
  }

  async sendWarningNotification(alert) {
    // Warning alerts can be batched
    console.log('⚠️ WARNING ALERT - Notification queued');
    
    // In production:
    // - Send to Slack warning channel
    // - Email administrators
    // - Log to monitoring system
  }

  async sendInfoNotification(alert) {
    // Info alerts for logging only
    console.log('ℹ️ INFO ALERT - Logged for monitoring');
    
    // In production:
    // - Log to monitoring system
    // - Store for analytics
  }

  // Get current active alerts
  getActiveAlerts() {
    const now = Date.now();
    const activeAlerts = [];
    
    for (const [id, alert] of this.alerts.entries()) {
      // Consider alerts active if they're less than 5 minutes old
      if ((now - alert.timestamp) < 5 * 60 * 1000) {
        activeAlerts.push(alert);
      }
    }
    
    return activeAlerts;
  }

  // Get alert history
  getAlertHistory(limit = 100, severity = null) {
    let history = [...this.alertHistory].reverse();
    
    if (severity) {
      history = history.filter(alert => alert.severity === severity);
    }
    
    return history.slice(0, limit);
  }

  // Get alert statistics
  getAlertStats(timeRange = '1h') {
    const now = Date.now();
    const ranges = {
      '1h': now - 60 * 60 * 1000,
      '24h': now - 24 * 60 * 60 * 1000,
      '7d': now - 7 * 24 * 60 * 60 * 1000
    };
    
    const cutoff = ranges[timeRange] || ranges['1h'];
    const recentAlerts = this.alertHistory.filter(alert => alert.timestamp >= cutoff);
    
    const stats = {
      total: recentAlerts.length,
      bySeverity: {
        critical: recentAlerts.filter(a => a.severity === 'critical').length,
        warning: recentAlerts.filter(a => a.severity === 'warning').length,
        info: recentAlerts.filter(a => a.severity === 'info').length
      },
      byType: {},
      timeRange,
      generatedAt: new Date().toISOString()
    };
    
    // Count by type
    recentAlerts.forEach(alert => {
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
    });
    
    return stats;
  }

  // Clear alerts
  clearAlerts() {
    this.alerts.clear();
    console.log('🧹 All alerts cleared');
  }

  // Update thresholds
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('📊 Alert thresholds updated');
  }

  // Test alert system
  testAlert() {
    this.createAlert('test_alert', {
      type: 'test',
      severity: 'info',
      message: 'Test alert - Alert system is working correctly',
      details: {
        timestamp: new Date().toISOString(),
        test: true
      }
    });
  }
}

// Create singleton instance
const alertSystem = new AlertSystem();

module.exports = alertSystem;
