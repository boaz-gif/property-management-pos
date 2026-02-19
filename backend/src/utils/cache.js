const redisClient = require('../config/redis');
const crypto = require('crypto');

class CacheManager {
  constructor() {
    this.defaultTTL = 3600; // 1 hour
    this.keyPrefix = 'pms:';
    this.enabled = process.env.REDIS_ENABLED !== 'false';
  }

  // Generate cache key with consistent hashing
  generateKey(namespace, identifier, params = {}) {
    const keyParts = [this.keyPrefix, namespace, identifier];
    
    // Add parameters to key if provided
    if (Object.keys(params).length > 0) {
      const paramString = Object.keys(params)
        .sort()
        .map(key => `${key}:${params[key]}`)
        .join('|');
      keyParts.push(crypto.createHash('md5').update(paramString).digest('hex'));
    }
    
    return keyParts.join(':');
  }

  // Cache wrapper for database queries
  async cacheQuery(key, queryFunction, ttl = this.defaultTTL) {
    if (!this.enabled) {
      return await queryFunction();
    }

    try {
      // Try to get from cache first
      const cached = await redisClient.get(key);
      if (cached !== null) {
        console.log(`🎯 Cache HIT: ${key}`);
        return cached;
      }

      // Cache miss - execute query
      console.log(`💾 Cache MISS: ${key}`);
      const result = await queryFunction();
      
      // Cache the result
      if (result !== null && result !== undefined) {
        await redisClient.set(key, result, ttl);
        console.log(`💾 Cache SET: ${key} (TTL: ${ttl}s)`);
      }

      return result;
    } catch (error) {
      console.error(`Cache error for key ${key}:`, error.message);
      // Fallback to direct query on cache error
      return await queryFunction();
    }
  }

  // Cache invalidation patterns
  async invalidatePattern(pattern) {
    if (!this.enabled) return;

    try {
      const keys = await redisClient.client.keys(`${this.keyPrefix}${pattern}*`);
      if (keys.length > 0) {
        await redisClient.client.del(keys);
        console.log(`🗑️  Cache INVALIDATED: ${keys.length} keys matching ${pattern}`);
      }
    } catch (error) {
      console.error(`Cache invalidation error for pattern ${pattern}:`, error.message);
    }
  }

  async invalidateKey(key) {
    if (!this.enabled) return;

    try {
      await redisClient.del(key);
      console.log(`🗑️  Cache INVALIDATED: ${key}`);
    } catch (error) {
      console.error(`Cache invalidation error for key ${key}:`, error.message);
    }
  }

  // Specific cache invalidation methods
  async invalidateTenant(tenantId) {
    await this.invalidatePattern(`tenant:*:${tenantId}*`);
    await this.invalidatePattern(`property:*:*:${tenantId}*`);
    await this.invalidatePattern(`payment:*:${tenantId}*`);
  }

  async invalidateProperty(propertyId) {
    await this.invalidatePattern(`property:${propertyId}*`);
    await this.invalidatePattern(`tenant:*:${propertyId}*`);
    await this.invalidatePattern(`payment:*:${propertyId}*`);
    await this.invalidatePattern(`maintenance:*:${propertyId}*`);
  }

  async invalidateUser(userId) {
    await this.invalidatePattern(`user:${userId}*`);
    await this.invalidatePattern(`tenant:*:${userId}*`);
  }

  async invalidateMaterializedViews() {
    await this.invalidatePattern('mv_*');
  }

  // Cache warming strategies
  async warmCache(warmupData = {}) {
    console.log('🔥 Starting cache warmup...');
    
    const warmupPromises = [];
    
    // Warm up common queries
    if (warmupData.commonProperties) {
      warmupPromises.push(this.warmPropertyCache(warmupData.commonProperties));
    }
    
    if (warmupData.commonTenants) {
      warmupPromises.push(this.warmTenantCache(warmupData.commonTenants));
    }
    
    try {
      await Promise.all(warmupPromises);
      console.log('🔥 Cache warmup completed');
    } catch (error) {
      console.error('Cache warmup error:', error.message);
    }
  }

  async warmPropertyCache(propertyIds) {
    // Implementation for warming property cache
    console.log(`🔥 Warming cache for ${propertyIds.length} properties`);
  }

  async warmTenantCache(tenantIds) {
    // Implementation for warming tenant cache
    console.log(`🔥 Warming cache for ${tenantIds.length} tenants`);
  }

  // Cache statistics
  async getCacheStats() {
    if (!this.enabled) return { enabled: false };

    try {
      const info = await redisClient.getInfo();
      const health = await redisClient.healthCheck();
      
      return {
        enabled: true,
        health: health,
        memory: redisClient.parseMemoryInfo(info),
        uptime: redisClient.parseUptime(info)
      };
    } catch (error) {
      return {
        enabled: true,
        error: error.message
      };
    }
  }

  // Cache middleware for Express
  middleware(options = {}) {
    const {
      ttl = this.defaultTTL,
      keyGenerator = null,
      condition = () => true
    } = options;

    return async (req, res, next) => {
      if (!this.enabled || !condition(req)) {
        return next();
      }

      const cacheKey = keyGenerator 
        ? keyGenerator(req)
        : this.generateKey('api', req.path, req.query);

      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          console.log(`🎯 API Cache HIT: ${cacheKey}`);
          return res.json(cached);
        }

        // Intercept res.json to cache the response
        const originalJson = res.json;
        res.json = function(data) {
          // Only cache successful responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            redisClient.set(cacheKey, data, ttl).catch(console.error);
            console.log(`💾 API Cache SET: ${cacheKey}`);
          }
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        console.error(`API Cache error for ${cacheKey}:`, error.message);
        next();
      }
    };
  }

  // Batch operations
  async mget(keys) {
    if (!this.enabled) return new Array(keys.length).fill(null);
    
    try {
      return await redisClient.mget(keys);
    } catch (error) {
      console.error('Cache MGET error:', error.message);
      return new Array(keys.length).fill(null);
    }
  }

  async mset(keyValuePairs, ttl = this.defaultTTL) {
    if (!this.enabled) return false;
    
    try {
      return await redisClient.mset(keyValuePairs, ttl);
    } catch (error) {
      console.error('Cache MSET error:', error.message);
      return false;
    }
  }

  // Cache tagging system
  async setWithTags(key, value, tags = [], ttl = this.defaultTTL) {
    if (!this.enabled) return false;

    try {
      // Set the main value
      await redisClient.set(key, value, ttl);
      
      // Add key to each tag set
      const tagPromises = tags.map(tag => 
        redisClient.client.sAdd(`tag:${tag}`, key)
      );
      
      await Promise.all(tagPromises);
      
      // Set expiration for tag sets
      const expirePromises = tags.map(tag => 
        redisClient.expire(`tag:${tag}`, ttl)
      );
      
      await Promise.all(expirePromises);
      
      return true;
    } catch (error) {
      console.error(`Cache set with tags error for key ${key}:`, error.message);
      return false;
    }
  }

  async invalidateTag(tag) {
    if (!this.enabled) return;

    try {
      const keys = await redisClient.client.sMembers(`tag:${tag}`);
      if (keys.length > 0) {
        await redisClient.client.del(keys);
        await redisClient.client.del(`tag:${tag}`);
        console.log(`🗑️  Cache INVALIDATED by tag ${tag}: ${keys.length} keys`);
      }
    } catch (error) {
      console.error(`Cache tag invalidation error for ${tag}:`, error.message);
    }
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

module.exports = cacheManager;
