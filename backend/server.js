require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { logger, errorLogger } = require('./src/utils/logger');
const errorHandler = require('./src/middleware/errorHandler');
const { HTTP_STATUS } = require('./src/utils/constants');

// Import routes
const authRoutes = require('./src/routes/auth');
const propertyRoutes = require('./src/routes/properties');
const tenantRoutes = require('./src/routes/tenants');
const paymentRoutes = require('./src/routes/payments');
const maintenanceRoutes = require('./src/routes/maintenance');
const notificationRoutes = require('./src/routes/notifications');
const documentRoutes = require('./src/routes/documents');

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(logger);

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
      notifications: '/api/notifications',
      documents: '/api/documents'
    }
  });
});

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/documents', documentRoutes);

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
  const PORT = process.env.PORT || 5001;
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`API Documentation: http://localhost:${PORT}/api`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
  });
});

module.exports = app;