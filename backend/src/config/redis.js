const redis = require('redis');
const logger = require('../utils/logger');

// Load environment variables if not already loaded
if (!process.env.REDIS_ENABLED) {
  require('dotenv').config();
}

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.enabled = process.env.REDIS_ENABLED !== 'false';
    this.readyCallbacks = []; // Callbacks to run when Redis becomes ready
    console.log(`🔴 Redis enabled status: ${this.enabled} (REDIS_ENABLED=${process.env.REDIS_ENABLED})`);
  }

  /**
   * Register a callback to be called when Redis is ready
   * @param {Function} callback - Function to call when Redis connects
   */
  onReady(callback) {
    if (this.isConnected) {
      // Already connected, call immediately
      callback();
    } else {
      // Queue for when connection is established
      this.readyCallbacks.push(callback);
    }
  }

  async connect() {
    // Skip connection if Redis is disabled
    if (!this.enabled) {
      console.log('🔴 Redis is disabled via REDIS_ENABLED=false');
      return false;
    }

    try {
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
        // Connection pooling
        family: 4,
        // Performance optimizations
        enableOfflineQueue: false,
        // Memory optimization
        maxMemoryPolicy: 'allkeys-lru'
      });

      // Event handlers
      this.client.on('connect', () => {
        console.log('🔴 Redis client connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.client.on('ready', () => {
        console.log('🔴 Redis client ready');
        // Fire all registered callbacks
        this.readyCallbacks.forEach(cb => cb());
        this.readyCallbacks = [];
      });

      this.client.on('error', (err) => {
        console.error('🔴 Redis client error:', err.message);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('🔴 Redis client disconnected');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log(`🔴 Redis reconnecting... Attempt ${this.reconnectAttempts + 1}`);
        this.reconnectAttempts++;
      });

      // Connect to Redis
      await this.client.connect();
      
      // Test connection
      await this.client.ping();
      console.log('🔴 Redis connection verified');
      
      return true;
    } catch (error) {
      console.error('🔴 Failed to connect to Redis:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
      console.log('🔴 Redis client disconnected');
    }
  }

  // Cache operations with error handling
  async get(key) {
    if (!this.enabled || !this.isConnected) return null;
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis GET error:', error.message);
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.enabled || !this.isConnected) return false;
    
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl > 0) {
        await this.client.setEx(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
      return true;
    } catch (error) {
      console.error('Redis SET error:', error.message);
      return false;
    }
  }

  async del(key) {
    if (!this.enabled || !this.isConnected) return false;
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error.message);
      return false;
    }
  }

  async exists(key) {
    if (!this.enabled || !this.isConnected) return false;
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error.message);
      return false;
    }
  }

  async expire(key, ttl) {
    if (!this.enabled || !this.isConnected) return false;
    
    try {
      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      console.error('Redis EXPIRE error:', error.message);
      return false;
    }
  }

  async flush() {
    if (!this.enabled || !this.isConnected) return false;
    
    try {
      await this.client.flushDb();
      return true;
    } catch (error) {
      console.error('Redis FLUSH error:', error.message);
      return false;
    }
  }

  // Advanced cache operations
  async mget(keys) {
    if (!this.enabled || !this.isConnected || keys.length === 0) return [];
    
    try {
      const values = await this.client.mGet(keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.error('Redis MGET error:', error.message);
      return new Array(keys.length).fill(null);
    }
  }

  async mset(keyValuePairs, ttl = 3600) {
    if (!this.enabled || !this.isConnected || keyValuePairs.length === 0) return false;
    
    try {
      const serializedPairs = [];
      for (let i = 0; i < keyValuePairs.length; i += 2) {
        serializedPairs.push(keyValuePairs[i]);
        serializedPairs.push(JSON.stringify(keyValuePairs[i + 1]));
      }
      
      await this.client.mSet(serializedPairs);
      
      // Set TTL for all keys if specified
      if (ttl > 0) {
        const expirePromises = [];
        for (let i = 0; i < serializedPairs.length; i += 2) {
          expirePromises.push(this.client.expire(serializedPairs[i], ttl));
        }
        await Promise.all(expirePromises);
      }
      
      return true;
    } catch (error) {
      console.error('Redis MSET error:', error.message);
      return false;
    }
  }

  // Cache statistics
  async getInfo() {
    if (!this.enabled || !this.isConnected) return null;
    
    try {
      const info = await this.client.info('memory');
      return info;
    } catch (error) {
      console.error('Redis INFO error:', error.message);
      return null;
    }
  }

  async getStats() {
    if (!this.enabled || !this.isConnected) return null;
    
    try {
      const info = await this.client.info();
      const stats = {
        connected: this.isConnected,
        reconnectAttempts: this.reconnectAttempts,
        // Parse memory info
        memory: this.parseMemoryInfo(info),
        // Parse general info
        uptime: this.parseUptime(info)
      };
      return stats;
    } catch (error) {
      console.error('Redis STATS error:', error.message);
      return null;
    }
  }

  parseMemoryInfo(info) {
    try {
      const lines = info.split('\r\n');
      const memoryInfo = {};
      
      lines.forEach(line => {
        if (line.startsWith('used_memory_human:')) {
          memoryInfo.used = line.split(':')[1];
        } else if (line.startsWith('used_memory_peak_human:')) {
          memoryInfo.peak = line.split(':')[1];
        } else if (line.startsWith('maxmemory_human:')) {
          memoryInfo.max = line.split(':')[1];
        }
      });
      
      return memoryInfo;
    } catch (error) {
      return {};
    }
  }

  parseUptime(info) {
    try {
      const lines = info.split('\r\n');
      let uptime = 0;
      
      lines.forEach(line => {
        if (line.startsWith('uptime_in_seconds:')) {
          uptime = parseInt(line.split(':')[1]);
        }
      });
      
      return uptime;
    } catch (error) {
      return 0;
    }
  }

  // Health check
  async healthCheck() {
    if (!this.enabled || !this.isConnected) return { status: 'disconnected' };
    
    try {
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;
      
      return {
        status: 'connected',
        latency: latency,
        reconnectAttempts: this.reconnectAttempts
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        reconnectAttempts: this.reconnectAttempts
      };
    }
  }
}

// Create singleton instance
const redisClient = new RedisClient();

// Only auto-connect if Redis is enabled
if (redisClient.enabled) {
  redisClient.connect().catch(console.error);
} else {
  console.log('🔴 Redis is disabled - skipping auto-connection');
}

module.exports = redisClient;
