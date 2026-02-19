const express = require('express');
const rateLimiter = require('../middleware/rate-limiter');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply general rate limiting to all routes
router.use(rateLimiter.default());

// Authentication routes with strict rate limiting
router.post('/auth/login', 
  rateLimiter.auth(),
  (req, res) => {
    // Login logic here
    res.json({ message: 'Login endpoint' });
  }
);

router.post('/auth/register',
  rateLimiter.auth(),
  (req, res) => {
    // Register logic here
    res.json({ message: 'Register endpoint' });
  }
);

router.post('/auth/forgot-password',
  rateLimiter.auth(),
  (req, res) => {
    // Forgot password logic here
    res.json({ message: 'Forgot password endpoint' });
  }
);

// Search endpoints with search-specific rate limiting
router.get('/search/tenants',
  rateLimiter.search(),
  auth.authenticate,
  (req, res) => {
    // Search tenants logic here
    res.json({ message: 'Search tenants endpoint' });
  }
);

router.get('/search/properties',
  rateLimiter.search(),
  auth.authenticate,
  (req, res) => {
    // Search properties logic here
    res.json({ message: 'Search properties endpoint' });
  }
);

// File upload endpoints with upload-specific rate limiting
router.post('/upload/documents',
  rateLimiter.upload(),
  auth.authenticate,
  (req, res) => {
    // Upload documents logic here
    res.json({ message: 'Upload documents endpoint' });
  }
);

// Admin endpoints with progressive rate limiting
router.get('/admin/reports',
  auth.authenticate,
  auth.requireRole('admin'),
  rateLimiter.progressive({
    stages: [
      { windowMs: 60 * 1000, max: 20 },  // 20 per minute
      { windowMs: 60 * 1000, max: 10 },  // 10 per minute
      { windowMs: 60 * 1000, max: 5 }    // 5 per minute
    ]
  }),
  (req, res) => {
    // Admin reports logic here
    res.json({ message: 'Admin reports endpoint' });
  }
);

// Dynamic rate limiting based on user tier
router.get('/premium/data',
  auth.authenticate,
  rateLimiter.dynamic({
    free: { windowMs: 60 * 1000, max: 10 },      // 10 per minute for free users
    basic: { windowMs: 60 * 1000, max: 50 },     // 50 per minute for basic users
    premium: { windowMs: 60 * 1000, max: 200 },  // 200 per minute for premium users
    enterprise: { windowMs: 60 * 1000, max: 1000 } // 1000 per minute for enterprise users
  }),
  (req, res) => {
    // Premium data logic here
    res.json({ message: 'Premium data endpoint', userTier: req.user.tier });
  }
);

// Custom rate limiting with key generator
router.get('/api-keys/:keyId/data',
  auth.authenticate,
  rateLimiter.limit({
    windowMs: 60 * 1000,
    max: 100,
    keyGenerator: (req) => `api_key:${req.params.keyId}`,
    message: 'API key rate limit exceeded'
  }),
  (req, res) => {
    // API key specific data logic here
    res.json({ message: 'API key data endpoint', keyId: req.params.keyId });
  }
);

// Rate limiting with custom handlers
router.post('/critical-operations',
  auth.authenticate,
  rateLimiter.limit({
    windowMs: 60 * 1000,
    max: 5,
    onLimitReached: async (req, res) => {
      // Log the rate limit violation
      console.warn(`Rate limit violation for user ${req.user.id} on critical operation`);
      
      // Send notification (in real app, you might use email, SMS, etc.)
      // await notificationService.notifyAdmins(`Rate limit violation: ${req.user.id}`);
      
      // You can also implement additional security measures here
      // await securityService.flagSuspiciousActivity(req.user.id);
    }
  }),
  (req, res) => {
    // Critical operation logic here
    res.json({ message: 'Critical operation endpoint' });
  }
);

// Rate limit statistics endpoint (admin only)
router.get('/admin/rate-limits/stats',
  auth.authenticate,
  auth.requireRole('admin'),
  async (req, res) => {
    try {
      const { key } = req.query;
      
      if (!key) {
        return res.status(400).json({ error: 'Key parameter is required' });
      }
      
      const stats = await rateLimiter.getStats(key);
      res.json(stats);
    } catch (error) {
      console.error('Rate limit stats error:', error);
      res.status(500).json({ error: 'Failed to fetch rate limit stats' });
    }
  }
);

// Reset rate limit endpoint (admin only)
router.post('/admin/rate-limits/reset',
  auth.authenticate,
  auth.requireRole('admin'),
  async (req, res) => {
    try {
      const { key } = req.body;
      
      if (!key) {
        return res.status(400).json({ error: 'Key parameter is required' });
      }
      
      const success = await rateLimiter.reset(key);
      
      if (success) {
        res.json({ message: 'Rate limit reset successfully', key });
      } else {
        res.status(500).json({ error: 'Failed to reset rate limit' });
      }
    } catch (error) {
      console.error('Rate limit reset error:', error);
      res.status(500).json({ error: 'Failed to reset rate limit' });
    }
  }
);

module.exports = router;
