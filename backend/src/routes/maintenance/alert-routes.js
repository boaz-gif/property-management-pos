const express = require('express');
const alertSystem = require('../../utils/alert-system');
const rateLimiter = require('../../middleware/rate-limiter');
const auth = require('../../middleware/auth');

const router = express.Router();

// Apply rate limiting to alert endpoints
router.use(rateLimiter.limit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'Too many alert requests, please slow down.'
}));

// Get active alerts
router.get('/active', auth.authenticate, auth.requireRole('admin'), (req, res) => {
  try {
    const activeAlerts = alertSystem.getActiveAlerts();
    
    res.json({
      success: true,
      data: {
        alerts: activeAlerts,
        count: activeAlerts.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get active alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active alerts'
    });
  }
});

// Get alert history
router.get('/history', auth.authenticate, auth.requireRole('admin'), (req, res) => {
  try {
    const { limit = 100, severity, timeRange = '24h' } = req.query;
    
    const history = alertSystem.getAlertHistory(
      parseInt(limit),
      severity
    );
    
    const stats = alertSystem.getAlertStats(timeRange);
    
    res.json({
      success: true,
      data: {
        alerts: history,
        stats,
        filters: { limit, severity, timeRange },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get alert history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert history'
    });
  }
});

// Get alert statistics
router.get('/stats', auth.authenticate, auth.requireRole('admin'), (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    const stats = alertSystem.getAlertStats(timeRange);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get alert stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert statistics'
    });
  }
});

// Clear alerts
router.post('/clear', auth.authenticate, auth.requireRole('admin'), (req, res) => {
  try {
    alertSystem.clearAlerts();
    
    res.json({
      success: true,
      message: 'All alerts cleared successfully'
    });
  } catch (error) {
    console.error('Clear alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear alerts'
    });
  }
});

// Test alert system
router.post('/test', auth.authenticate, auth.requireRole('admin'), (req, res) => {
  try {
    alertSystem.testAlert();
    
    res.json({
      success: true,
      message: 'Test alert sent successfully'
    });
  } catch (error) {
    console.error('Test alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test alert'
    });
  }
});

// Update alert thresholds
router.put('/thresholds', auth.authenticate, auth.requireRole('admin'), (req, res) => {
  try {
    const { thresholds } = req.body;
    
    if (!thresholds || typeof thresholds !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Valid thresholds object is required'
      });
    }
    
    alertSystem.updateThresholds(thresholds);
    
    res.json({
      success: true,
      message: 'Alert thresholds updated successfully',
      data: thresholds
    });
  } catch (error) {
    console.error('Update thresholds error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update alert thresholds'
    });
  }
});

// Get current thresholds
router.get('/thresholds', auth.authenticate, auth.requireRole('admin'), (req, res) => {
  try {
    const thresholds = alertSystem.thresholds;
    
    res.json({
      success: true,
      data: thresholds
    });
  } catch (error) {
    console.error('Get thresholds error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert thresholds'
    });
  }
});

// Alert webhook endpoint for external monitoring
router.post('/webhook', rateLimiter.limit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Webhook rate limit exceeded'
}), (req, res) => {
  try {
    const { alert, source, severity } = req.body;
    
    if (!alert || !source) {
      return res.status(400).json({
        success: false,
        error: 'Alert and source are required'
      });
    }
    
    // Create alert from webhook
    alertSystem.createAlert(`webhook_${source}`, {
      type: 'webhook',
      severity: severity || 'warning',
      message: `External alert from ${source}: ${alert}`,
      details: {
        source,
        originalAlert: alert,
        receivedAt: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      message: 'Webhook alert processed successfully'
    });
  } catch (error) {
    console.error('Webhook alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process webhook alert'
    });
  }
});

module.exports = router;
