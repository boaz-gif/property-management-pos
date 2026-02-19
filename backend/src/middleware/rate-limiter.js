const redisClient = require('../config/redis');

class RateLimiter {
  constructor() {
    this.defaultLimits = {
      // General API limits
      default: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per window
        message: 'Too many requests from this IP, please try again later.'
      },
      // Strict limits for sensitive operations
      strict: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // 10 requests per window
        message: 'Rate limit exceeded for this operation.'
      },
      // Authentication limits
      auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts per window
        message: 'Too many authentication attempts, please try again later.'
      },
      // File upload limits
      upload: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 20, // 20 uploads per hour
        message: 'Upload limit exceeded, please try again later.'
      },
      // Search limits
      search: {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 30, // 30 searches per minute
        message: 'Search rate limit exceeded, please slow down.'
      }
    };
  }

  // Main rate limiting middleware
  limit(options = {}) {
    const {
      keyGenerator = this.defaultKeyGenerator,
      windowMs = this.defaultLimits.default.windowMs,
      max = this.defaultLimits.default.max,
      message = this.defaultLimits.default.message,
      skipSuccessfulRequests = false,
      skipFailedRequests = false,
      onLimitReached = null
    } = options;

    return async (req, res, next) => {
      try {
        const key = keyGenerator(req);
        const now = Date.now();
        const windowStart = now - windowMs;

        // Use Redis for distributed rate limiting
        const result = await this.checkRateLimit(key, windowStart, now, max);

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - result.count));
        res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

        if (result.exceeded) {
          const retryAfter = Math.ceil(windowMs / 1000);
          res.setHeader('Retry-After', retryAfter);
          res.setHeader('X-RateLimit-Retry-After', retryAfter);

          // Call custom handler if provided
          if (onLimitReached) {
            await onLimitReached(req, res);
          }

          return res.status(429).json({
            error: message,
            retryAfter: retryAfter,
            limit: max,
            windowMs: windowMs
          });
        }

        // Track request for skip logic
        const originalSend = res.send;
        res.send = function(data) {
          const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
          
          if ((skipSuccessfulRequests && isSuccess) || (skipFailedRequests && !isSuccess)) {
            // Decrement counter since we're skipping this request
            RateLimiter.prototype.decrementCounter(key).catch(console.error);
          }

          return originalSend.call(this, data);
        };

        next();
      } catch (error) {
        console.error('Rate limiter error:', error.message);
        // Fail open - allow request if rate limiter fails
        next();
      }
    };
  }

  // Check rate limit using Redis
  async checkRateLimit(key, windowStart, now, max) {
    if (!redisClient.isConnected) {
      // Fallback to memory-based limiting if Redis is unavailable
      return this.memoryBasedCheck(key, windowStart, now, max);
    }

    try {
      // Use Redis sorted set for sliding window
      const pipeline = redisClient.client.multi();
      
      // Remove old entries outside the window
      pipeline.zRemRangeByScore(key, 0, windowStart);
      
      // Add current request
      pipeline.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
      
      // Count requests in window
      pipeline.zCard(key);
      
      // Set expiration
      pipeline.expire(key, Math.ceil((now - windowStart) / 1000) + 1);
      
      const results = await pipeline.exec();
      const count = results[2][1]; // zCard result
      
      return {
        count: count,
        exceeded: count > max,
        resetTime: now + (15 * 60 * 1000) // 15 minutes from now
      };
    } catch (error) {
      console.error('Redis rate limiter error:', error.message);
      return this.memoryBasedCheck(key, windowStart, now, max);
    }
  }

  // Memory-based fallback
  memoryBasedCheck(key, windowStart, now, max) {
    if (!this.memoryStore) {
      this.memoryStore = new Map();
    }

    if (!this.memoryStore.has(key)) {
      this.memoryStore.set(key, []);
    }

    const requests = this.memoryStore.get(key);
    
    // Remove old requests
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    this.memoryStore.set(key, validRequests);

    // Add current request
    validRequests.push(now);

    return {
      count: validRequests.length,
      exceeded: validRequests.length > max,
      resetTime: now + (15 * 60 * 1000)
    };
  }

  // Decrement counter (for skip logic)
  async decrementCounter(key) {
    if (!redisClient.isConnected) return;

    try {
      // Remove the most recent entry
      const now = Date.now();
      await redisClient.client.zRemRangeByRank(key, -1, -1);
    } catch (error) {
      console.error('Decrement counter error:', error.message);
    }
  }

  // Default key generator
  defaultKeyGenerator(req) {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const userId = req.user?.id || 'anonymous';
    return `rate_limit:${userId}:${ip}:${req.path}`;
  }

  // IP-based key generator
  ipKeyGenerator(req) {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    return `rate_limit:ip:${ip}:${req.path}`;
  }

  // User-based key generator
  userKeyGenerator(req) {
    const userId = req.user?.id || 'anonymous';
    return `rate_limit:user:${userId}:${req.path}`;
  }

  // Custom key generator
  customKeyGenerator(identifier) {
    return (req) => `rate_limit:custom:${identifier}:${req.path}`;
  }

  // Preset limiters
  default() {
    return this.limit(this.defaultLimits.default);
  }

  strict() {
    return this.limit(this.defaultLimits.strict);
  }

  auth() {
    return this.limit({
      ...this.defaultLimits.auth,
      keyGenerator: this.ipKeyGenerator
    });
  }

  upload() {
    return this.limit(this.defaultLimits.upload);
  }

  search() {
    return this.limit(this.defaultLimits.search);
  }

  // Dynamic rate limiting based on user tier
  dynamic(userTierLimits = {}) {
    return async (req, res, next) => {
      const userTier = req.user?.tier || 'default';
      const limits = userTierLimits[userTier] || this.defaultLimits.default;

      const limiter = this.limit({
        ...limits,
        keyGenerator: this.userKeyGenerator
      });

      return limiter(req, res, next);
    };
  }

  // Progressive rate limiting (increasing strictness)
  progressive(options = {}) {
    const {
      stages = [
        { windowMs: 60 * 1000, max: 10 },    // 10 per minute
        { windowMs: 60 * 1000, max: 5 },     // 5 per minute
        { windowMs: 60 * 1000, max: 1 }      // 1 per minute
      ],
      cooldownMs = 15 * 60 * 1000, // 15 minutes cooldown
      keyGenerator = this.defaultKeyGenerator
    } = options;

    return async (req, res, next) => {
      const key = `${keyGenerator(req)}:progressive`;
      const now = Date.now();

      try {
        // Get current stage
        const stageKey = await redisClient.get(key);
        let currentStage = 0;
        
        if (stageKey) {
          const stageData = JSON.parse(stageKey);
          if (now - stageData.lastViolation < cooldownMs) {
            currentStage = Math.min(stageData.stage + 1, stages.length - 1);
          } else {
            // Reset stage after cooldown
            currentStage = 0;
          }
        }

        const limit = stages[currentStage];
        const result = await this.checkRateLimit(key, now - limit.windowMs, now, limit.max);

        res.setHeader('X-RateLimit-Limit', limit.max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, limit.max - result.count));
        res.setHeader('X-RateLimit-Stage', currentStage + 1);

        if (result.exceeded) {
          // Update stage
          await redisClient.set(key, JSON.stringify({
            stage: currentStage,
            lastViolation: now
          }), 'EX', Math.ceil(cooldownMs / 1000));

          return res.status(429).json({
            error: `Rate limit exceeded. Current stage: ${currentStage + 1}/${stages.length}`,
            stage: currentStage + 1,
            maxStages: stages.length,
            cooldownMinutes: Math.ceil(cooldownMs / 60000)
          });
        }

        next();
      } catch (error) {
        console.error('Progressive rate limiter error:', error.message);
        next();
      }
    };
  }

  // Rate limit statistics
  async getStats(key) {
    if (!redisClient.isConnected) {
      return { error: 'Redis not available' };
    }

    try {
      const now = Date.now();
      const windowStart = now - (15 * 60 * 1000); // 15 minutes
      
      await redisClient.client.zRemRangeByScore(key, 0, windowStart);
      const count = await redisClient.client.zCard(key);
      
      return {
        key: key,
        currentCount: count,
        windowStart: new Date(windowStart),
        windowEnd: new Date(now),
        windowMs: 15 * 60 * 1000
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Reset rate limit for a key
  async reset(key) {
    if (!redisClient.isConnected) {
      if (this.memoryStore) {
        this.memoryStore.delete(key);
      }
      return true;
    }

    try {
      await redisClient.client.del(key);
      return true;
    } catch (error) {
      console.error('Reset rate limit error:', error.message);
      return false;
    }
  }

  // Cleanup expired entries
  async cleanup() {
    if (!redisClient.isConnected) return;

    try {
      const pattern = 'rate_limit:*';
      const keys = await redisClient.client.keys(pattern);
      
      if (keys.length > 0) {
        const pipeline = redisClient.client.multi();
        keys.forEach(key => {
          pipeline.zRemRangeByScore(key, 0, Date.now() - (24 * 60 * 60 * 1000)); // Remove entries older than 24 hours
        });
        await pipeline.exec();
        
        console.log(`🧹 Cleaned up ${keys.length} rate limit entries`);
      }
    } catch (error) {
      console.error('Rate limiter cleanup error:', error.message);
    }
  }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

// Schedule cleanup every hour
setInterval(() => {
  rateLimiter.cleanup();
}, 60 * 60 * 1000);

module.exports = rateLimiter;
