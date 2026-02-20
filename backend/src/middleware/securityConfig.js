const helmet = require('helmet');
const cors = require('cors');

/**
 * Configure Helmet security headers
 * Provides protection against various web vulnerabilities
 */
const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    },
    reportOnly: false
  },

  // Disable X-Powered-By header
  hidePoweredBy: true,

  // Prevent browsers from MIME-type sniffing
  noSniff: true,

  // Enable XSS filter in older browsers
  xssFilter: true,

  // Clickjacking protection
  frameguard: {
    action: 'deny'
  },

  // HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  },

  // Referrer policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // Permissions Policy (formerly Feature Policy)
  permissionsPolicy: {
    geolocation: ['()'],
    microphone: ['()'],
    camera: ['()'],
    magnetometer: ['()'],
    gyroscope: ['()'],
    accelerometer: ['()'],
    payment: ['()']
  }
});

/**
 * Configure CORS with strict security settings
 */
const corsConfig = cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.ADMIN_FRONTEND_URL || 'http://localhost:3001'
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
    'Accept',
    'Accept-Language',
    'Content-Language',
    'X-Trace-Id',
    'X-Action-Id',
    'Cache-Control',
    'If-None-Match',
    'Accept-Encoding'
  ],
  exposedHeaders: [
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
    'X-Total-Count'
  ],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
});

/**
 * Create custom CORS config for specific routes
 * @param {string|Array} origins - Allowed origins
 * @returns {Function} CORS middleware
 */
function createCorsConfig(origins) {
  const allowedOrigins = Array.isArray(origins) ? origins : [origins];
  
  return cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    maxAge: 86400
  });
}

/**
 * Security headers middleware
 * Additional custom security headers beyond Helmet
 */
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Disable MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Disable content sniffing
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Add HSTS header (only on HTTPS)
  if (process.env.NODE_ENV === 'production' && req.protocol === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Remove server info
  res.removeHeader('Server');
  res.removeHeader('X-Powered-By');

  next();
};

/**
 * Request size limiting middleware
 */
const requestSizeLimit = {
  json: { limit: '10mb' },
  urlencoded: { limit: '10mb', extended: true }
};

module.exports = {
  helmetConfig,
  corsConfig,
  createCorsConfig,
  securityHeaders,
  requestSizeLimit
};
