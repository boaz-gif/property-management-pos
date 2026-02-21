require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { logger, errorLogger } = require('./src/utils/logger');
const errorHandler = require('./src/middleware/errorHandler');
const { HTTP_STATUS } = require('./src/utils/constants');
const LeaseCronJobs = require('./src/jobs/leaseCronJobs');

const cronEnabled = process.env.NODE_ENV !== 'test' && process.env.DISABLE_CRON !== 'true';
if (cronEnabled) {
  require('./src/jobs/adminDashboardCron');
  require('./src/jobs/tenantPaymentCron');
}

// Import security middleware
const { helmetConfig, corsConfig, securityHeaders, requestSizeLimit } = require('./src/middleware/securityConfig');
const { sanitizeAll } = require('./src/middleware/inputSanitization');
const { authenticate } = require('./src/middleware/auth');
const { apiLimiter } = require('./src/middleware/rateLimiter');
const { spanMiddleware, markMiddlewareDone } = require('./src/utils/spanTracker');

// Import routes
const authRoutes = require('./src/routes/auth/auth');
const propertyRoutes = require('./src/routes/properties/properties');
const tenantRoutes = require('./src/routes/tenants/tenants');
const paymentRoutes = require('./src/routes/payments/payments');
const maintenanceRoutes = require('./src/routes/maintenance/maintenance');
const notificationRoutes = require('./src/routes/communications/notifications');
const documentRoutes = require('./src/routes/tenants/documents');
const auditRoutes = require('./src/routes/auth/audit');
const adminDashboardRoutes = require('./src/routes/dashboard/adminDashboardRoutes');
const tenantPortalRoutes = require('./src/routes/tenants/tenant-portal');
const organizationRoutes = require('./src/routes/auth/organizations');
const teamRoutes = require('./src/routes/auth/teams');
const workflowRoutes = require('./src/routes/maintenance/workflows');
const conversationRoutes = require('./src/routes/communications/conversations');
const dashboardWidgetRoutes = require('./src/routes/dashboard/dashboardWidgets');
const privacyRoutes = require('./src/routes/tenants/privacy');
const MpesaController = require('./src/controllers/mpesaController');
const SocketIOConfig = require('./src/utils/socketIOConfig');
const cacheService = require('./src/utils/cacheService');

// Initialize Express app
const app = express();

// Trust proxy in production (important for rate limiting behind reverse proxies)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Create HTTP server for Socket.io
const server = http.createServer(app);

let io = null;
if (process.env.NODE_ENV !== 'test') {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST']
    }
  });
  global.io = io;
} else {
  global.io = null;
}

// ==========================================
// SECURITY MIDDLEWARE (Priority order matters)
// ==========================================

// 1. Helmet security headers
app.use(helmetConfig);

// 2. Additional custom security headers
app.use(securityHeaders);

// 3. CORS configuration
app.use(corsConfig);

// 4. Body parsing middleware with size limits
app.use(express.json(requestSizeLimit.json));
app.use(express.urlencoded(requestSizeLimit.urlencoded));

// 5. Input sanitization for all requests
app.use(sanitizeAll);

// 6. Logging middleware
app.use(logger);

// 7. Request span tracking (behind PERF_SPAN_TRACKING feature flag)
app.use(spanMiddleware);

// Initialize Socket.io configuration
if (io) {
  SocketIOConfig.initialize(io);
}

// Initialize lease cron jobs
if (cronEnabled) {
  LeaseCronJobs.initialize();
}
// Initialize admin dashboard cron jobs (module initializes on import)

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Add this endpoint for debugging date validation
app.get('/debug/date-info', (req, res) => {
  const TenantService = require('./src/services/tenantService');
  const dateInfo = TenantService.getDateInfo();
  
  res.json({
    message: 'Date validation debugging information',
    ...dateInfo,
    test_dates: {
      today_yyyy_mm_dd: new Date().toISOString().split('T')[0],
      today_mm_dd_yyyy: `${new Date().getMonth() + 1}/${new Date().getDate()}/${new Date().getFullYear()}`,
      thirty_days_ago_yyyy_mm_dd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      thirty_days_ago_mm_dd_yyyy: (() => {
        const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
      })(),
      one_year_future_yyyy_mm_dd: (() => {
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        return date.toISOString().split('T')[0];
      })(),
      one_year_future_mm_dd_yyyy: (() => {
        const date = new Date();
        date.setFullYear(date.getFullYear() + 1);
        return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
      })()
    }
  });
});

// API routes (will be added later)
app.get('/api', (req, res) => {
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Property Management API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      properties: '/api/properties',
      tenants: '/api/tenants',
      payments: '/api/payments',
      maintenance: '/api/maintenance',
      conversations: '/api/conversations',
      notifications: '/api/notifications',
      documents: '/api/documents'
    }
  });
});

// Mark end of middleware chain for span tracking
app.use(markMiddlewareDone);

// Auth routes - no API limiter (they have their own rate limiters)
app.use('/api/auth', authRoutes);

// API rate limiting + authentication for all other routes
// IMPORTANT: apiLimiter uses req.user which is set by authenticate middleware
app.use('/api/properties', authenticate, apiLimiter, propertyRoutes);
app.use('/api/tenants', authenticate, apiLimiter, tenantRoutes);
app.use('/api/tenant', authenticate, apiLimiter, tenantPortalRoutes);
app.post('/api/payments/mpesa/callback', MpesaController.callback);
app.use('/api/payments', authenticate, apiLimiter, paymentRoutes);
app.use('/api/maintenance', authenticate, apiLimiter, maintenanceRoutes);
app.use('/api/conversations', authenticate, apiLimiter, conversationRoutes);
app.use('/api/notifications', authenticate, apiLimiter, notificationRoutes);
app.use('/api/documents', authenticate, apiLimiter, documentRoutes);
app.use('/api/audit', authenticate, apiLimiter, auditRoutes);
app.use('/api/admin/dashboard', authenticate, apiLimiter, adminDashboardRoutes);
app.use('/api/dashboard/widgets', authenticate, apiLimiter, dashboardWidgetRoutes);
app.use('/api/privacy', authenticate, apiLimiter, privacyRoutes);
app.use('/api/organizations', authenticate, apiLimiter, organizationRoutes);
app.use('/api', authenticate, apiLimiter, teamRoutes);
app.use('/api', authenticate, apiLimiter, workflowRoutes);

// Error handling middleware
app.use(errorLogger);
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server only if run directly
if (require.main === module) {
  const host = process.env.HOST || '127.0.0.1';
  const startPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 5002;
  const maxAttempts = process.env.PORT_FALLBACK_ATTEMPTS ? parseInt(process.env.PORT_FALLBACK_ATTEMPTS, 10) : 20;

  const logStartup = (port) => {
    cacheService.init();
    
    console.log(`Server running on http://${host}:${port}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`API Documentation: http://${host}:${port}/api`);
    console.log(`Socket.io ready for real-time updates`);
  };

  const buildPortCandidates = () => {
    const base = Number.isFinite(startPort) ? startPort : 5002;
    const attempts = Number.isFinite(maxAttempts) ? maxAttempts : 20;

    const candidates = [];
    for (let i = 0; i <= attempts; i++) candidates.push(base + i);

    candidates.push(5500, 7000, 8000, 10000, 12000, 15000);
    candidates.push(20000 + Math.floor(Math.random() * 10000));
    candidates.push(30000 + Math.floor(Math.random() * 10000));
    candidates.push(40000 + Math.floor(Math.random() * 10000));

    candidates.push(0);

    return [...new Set(candidates)].filter((p) => Number.isFinite(p) && p >= 0 && p <= 65535);
  };

  const portCandidates = buildPortCandidates();

  const tryListen = (index) => {
    const port = portCandidates[index];
    if (port === undefined) {
      console.error(`Failed to start server: no available ports could be bound on host ${host}.`);
      console.error(`Tip: check excluded ports via: netsh interface ipv4 show excludedportrange protocol=tcp`);
      console.error(`Then set an allowed port: PowerShell: $env:PORT=7000; npm start`);
      process.exitCode = 1;
      return;
    }

    const onError = (err) => {
      server.off('listening', onListening);
      if (err && (err.code === 'EACCES' || err.code === 'EADDRINUSE')) {
        const label = port === 0 ? '0 (ephemeral)' : String(port);
        console.error(`Failed to bind ${host}:${label} (${err.code}). Trying next port...`);
        setTimeout(() => tryListen(index + 1), 50);
        return;
      }

      console.error(`Failed to start server on ${host}:${port} (${err.code || 'UNKNOWN'}).`);
      process.exitCode = 1;
    };

    const onListening = () => {
      server.off('error', onError);
      const addr = server.address();
      const boundPort = typeof addr === 'object' && addr ? addr.port : port;
      logStartup(boundPort);
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  };

  tryListen(0);

  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
  });
}

module.exports = app;
