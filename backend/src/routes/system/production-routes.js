const express = require('express');
const rateLimiter = require('../../middleware/rate-limiter');
const { RateLimitConfig, RATE_LIMITS } = require('../../config/rate-limits');
const auth = require('../../middleware/auth');

const router = express.Router();

// Dynamic rate limiting based on user tier
router.use('/api/data', auth.authenticate, (req, res, next) => {
  const limit = RateLimitConfig.getEffectiveLimit(req.user, 'data', 'read');
  const limiter = rateLimiter.limit(limit);
  return limiter(req, res, next);
});

// Authentication endpoints with strict limits
router.post('/auth/login', 
  rateLimiter.limit(RateLimitConfig.getAuthLimits('login')),
  (req, res) => res.json({ message: 'Login endpoint with strict rate limiting' })
);

router.post('/auth/register',
  rateLimiter.limit(RateLimitConfig.getAuthLimits('register')),
  (req, res) => res.json({ message: 'Register endpoint with strict rate limiting' })
);

// User tier-based API endpoints
router.get('/api/premium-data',
  auth.authenticate,
  rateLimiter.dynamic(RATE_LIMITS.userTiers),
  (req, res) => {
    res.json({
      message: 'Premium data endpoint',
      userTier: req.user.tier || 'free',
      rateLimit: RateLimitConfig.getUserTierLimits(req.user.tier || 'free')
    });
  }
);

// Progressive rate limiting for sensitive operations
router.post('/api/sensitive-operations',
  auth.authenticate,
  rateLimiter.progressive(RateLimitConfig.getProgressiveConfig({
    windowMs: 60 * 1000,
    max: 10
  })),
  (req, res) => {
    res.json({ message: 'Sensitive operation with progressive rate limiting' });
  }
);

// API key rate limiting
router.get('/api/external/:apiKey/data',
  rateLimiter.limit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    keyGenerator: (req) => `api_key:${req.params.apiKey}`,
    message: 'API key rate limit exceeded'
  }),
  (req, res) => {
    res.json({ message: 'External API endpoint with key-based rate limiting' });
  }
);

module.exports = router;
