const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Create Redis client for rate limiting (optional - can use memory store for simple setups)
let redisClient = null;
let RedisStore = null;
let store = undefined; // Initialize store at module level

try {
  if (process.env.REDIS_URL) {
    const redis = require('redis');
    RedisStore = require('rate-limit-redis');
    redisClient = redis.createClient({
      url: process.env.REDIS_URL
    });
    redisClient.connect();
    store = new RedisStore({
      client: redisClient,
      prefix: 'rate-limit:'
    });
    console.log('Redis client initialized for rate limiting');
  }
} catch (error) {
  console.warn('Redis not available, using memory store for rate limiting');
}

// Helper function to get client IP (handles IPv6 and IPv4)
const getClientIp = (req) => {
  // Check X-Forwarded-For header first (for proxies)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  // Fallback to req.ip
  return req.ip || req.connection.remoteAddress || '127.0.0.1';
};

// Default rate limiter settings
const defaultLimiterOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health check
    if (req.path === '/health') return true;
    return false;
  }
};

/**
 * General API rate limiter
 * - Authenticated users: per-user (user.id)
 * - Unauthenticated users: per-IP
 * 100 requests per 15 minutes
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Role-based limits: super_admin → 2000, admin → 1000, tenant → 500, anonymous → 200
  max: (req) => {
    if (!req.user) return 200;
    switch (req.user.role) {
      case 'super_admin': return 2000;
      case 'admin':       return 1000;
      case 'tenant':      return 500;
      default:            return 300;
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: store,

  keyGenerator: (req) => {
    // If authenticated, rate limit per user
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }
    // Otherwise fallback to IP
    return ipKeyGenerator(req);
  },

  handler: (req, res) => {
    const retryAfter = 15 * 60;
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      error: 'Too many requests. Please slow down.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter
    });
  }
});

/**
 * Authentication endpoints rate limiter
 * 5 attempts per 15 minutes per email
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  store: store,

  keyGenerator: (req) => {
    // Use email as key for login endpoint to be more specific
    if (req.body && req.body.email) {
      return `auth:${req.body.email}`;
    }
    return ipKeyGenerator(req);
  },

  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts. Try again in 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 15 * 60
    });
  }
});

/**
 * Registration endpoints rate limiter
 * 3 attempts per hour per IP
 */
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  store: store,

  keyGenerator: (req) => {
    // Use email as key for registration endpoint
    if (req.body && req.body.email) {
      return `register:${req.body.email}`;
    }
    return ipKeyGenerator(req);
  },

  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many registration attempts. Try again in 1 hour.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 60 * 60
    });
  }
});

/**
 * Refresh token rate limiter
 * 10 attempts per 15 minutes per user
 */
const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: store,

  keyGenerator: (req) => {
    // Use user ID if available, otherwise IP
    if (req.user && req.user.id) {
      return `refresh:${req.user.id}`;
    }
    return ipKeyGenerator(req);
  },

  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many refresh token attempts. Try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 15 * 60
    });
  }
});

/**
 * Password reset rate limiter
 * 3 attempts per hour
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
  store: store,
  keyGenerator: (req, res) => {
    if (req.body && req.body.email) {
      return `password-reset-${req.body.email}`;
    }
    return ipKeyGenerator(req);
  }
});

/**
 * Strict rate limiter for sensitive operations
 * 10 requests per hour
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many requests for this sensitive operation, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  store: store
});

/**
 * Create a custom rate limiter with specific settings
 * @param {Object} options - Rate limiter options
 * @returns {Function} Rate limiter middleware
 */
function createCustomLimiter(options = {}) {
  return rateLimit({
    ...defaultLimiterOptions,
    ...options,
    store: store
  });
}

module.exports = {
  apiLimiter,
  authLimiter,
  registrationLimiter,
  refreshTokenLimiter,
  passwordResetLimiter,
  strictLimiter,
  createCustomLimiter
};