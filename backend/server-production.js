const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import middleware and routes
const performanceMonitor = require('./src/utils/performance-monitor');
const responseOptimizer = require('./src/middleware/response-optimizer');
const rateLimiter = require('./src/middleware/rate-limiter');

// Import routes
const monitoringRoutes = require('./src/routes/system/monitoring-routes');
const optimizedTenantRoutes = require('./src/routes/tenants/optimized-tenant-routes');
const protectedRoutes = require('./src/routes/system/protected-routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Performance monitoring
app.use(performanceMonitor.trackRequest);

// Global rate limiting
app.use(rateLimiter.default());

// Health check endpoint (no auth required)
app.get('/health', async (req, res) => {
  try {
    const health = await performanceMonitor.healthCheck();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// API Routes
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/tenants', optimizedTenantRoutes);
app.use('/api', protectedRoutes);

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Property Management POS API',
    version: '2.0.0',
    status: 'Production Ready',
    endpoints: {
      health: '/health',
      monitoring: '/api/monitoring/*',
      tenants: '/api/tenants/*',
      protected: '/api/*'
    },
    features: [
      'Redis Caching',
      'Rate Limiting',
      'Response Optimization',
      'Performance Monitoring',
      'Materialized Views',
      'Database Indexes'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.headers['x-request-id']
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Property Management POS Server running on port ${PORT}`);
  console.log(`📊 Performance monitoring enabled`);
  console.log(`🔴 Redis caching enabled`);
  console.log(`⚡ Rate limiting enabled`);
  console.log(`📈 Monitoring dashboard: http://localhost:${PORT}/api/monitoring/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  performanceMonitor.stopCollection();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  performanceMonitor.stopCollection();
  process.exit(0);
});

module.exports = app;
