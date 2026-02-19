const zlib = require('zlib');
const Cache = require('../utils/cache');

class ResponseOptimizer {
  constructor() {
    this.defaultFields = {
      tenant: ['id', 'name', 'email', 'property_id', 'unit', 'status', 'rent', 'balance', 'created_at'],
      property: ['id', 'name', 'address', 'units', 'rent', 'status', 'admin_id', 'created_at'],
      payment: ['id', 'tenant_id', 'amount', 'date', 'type', 'method', 'status', 'created_at'],
      user: ['id', 'name', 'email', 'role', 'created_at']
    };
    
    this.sensitiveFields = {
      tenant: ['deleted_at', 'deleted_by'],
      property: ['deleted_at', 'deleted_by'],
      payment: ['deleted_at', 'deleted_by'],
      user: ['password', 'deleted_at', 'deleted_by']
    };
  }

  // Field selection middleware
  fieldSelection(resourceType) {
    return (req, res, next) => {
      const requestedFields = req.query.fields;
      
      if (!requestedFields) {
        // Use default fields if none specified
        req.selectedFields = this.defaultFields[resourceType] || [];
        return next();
      }

      try {
        // Parse and validate requested fields
        const fields = requestedFields.split(',').map(field => field.trim());
        
        // Filter out sensitive fields
        const allowedFields = fields.filter(field => 
          !this.sensitiveFields[resourceType]?.includes(field)
        );
        
        // Validate field names (prevent injection)
        const validFields = allowedFields.filter(field => 
          /^[a-zA-Z0-9_]+$/.test(field)
        );
        
        req.selectedFields = validFields.length > 0 ? validFields : this.defaultFields[resourceType];
        next();
      } catch (error) {
        console.error('Field selection error:', error.message);
        req.selectedFields = this.defaultFields[resourceType];
        next();
      }
    };
  }

  // Filter object based on selected fields
  filterFields(data, selectedFields) {
    if (!selectedFields || selectedFields.length === 0) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.filterObject(item, selectedFields));
    } else if (typeof data === 'object' && data !== null) {
      return this.filterObject(data, selectedFields);
    }

    return data;
  }

  filterObject(obj, selectedFields) {
    const filtered = {};
    
    selectedFields.forEach(field => {
      if (obj.hasOwnProperty(field)) {
        filtered[field] = obj[field];
      }
    });

    // Always include pagination if present
    if (obj.pagination) {
      filtered.pagination = obj.pagination;
    }

    return filtered;
  }

  // Compression middleware
  compression() {
    return (req, res, next) => {
      // Check if client accepts gzip
      const acceptEncoding = req.headers['accept-encoding'] || '';
      const supportsGzip = acceptEncoding.includes('gzip');

      if (!supportsGzip) {
        return next();
      }

      // Override res.json to compress responses
      const originalJson = res.json;
      res.json = function(data) {
        const jsonString = JSON.stringify(data);
        
        // Only compress if response is larger than 1KB
        if (Buffer.byteLength(jsonString, 'utf8') > 1024) {
          zlib.gzip(jsonString, (err, compressed) => {
            if (err) {
              console.error('Compression error:', err);
              return originalJson.call(this, data);
            }

            res.setHeader('Content-Encoding', 'gzip');
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('X-Compression', 'gzip');
            res.send(compressed);
          });
        } else {
          originalJson.call(this, data);
        }
      };

      next();
    };
  }

  // Response caching middleware
  responseCache(options = {}) {
    const {
      ttl = 300, // 5 minutes default
      keyGenerator = null,
      condition = () => true
    } = options;

    return async (req, res, next) => {
      if (!condition(req)) {
        return next();
      }

      const cacheKey = keyGenerator 
        ? keyGenerator(req)
        : this.generateCacheKey(req);

      try {
        const cached = await Cache.get(cacheKey);
        if (cached) {
          console.log(`🎯 Response Cache HIT: ${cacheKey}`);
          res.setHeader('X-Cache', 'HIT');
          return res.json(cached);
        }

        // Intercept res.json to cache the response
        const originalJson = res.json;
        res.json = function(data) {
          // Only cache successful responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            Cache.set(cacheKey, data, ttl).catch(console.error);
            console.log(`💾 Response Cache SET: ${cacheKey}`);
          }
          res.setHeader('X-Cache', 'MISS');
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        console.error(`Response Cache error for ${cacheKey}:`, error.message);
        next();
      }
    };
  }

  // Generate cache key for requests
  generateCacheKey(req) {
    const key = [
      'response',
      req.method,
      req.path,
      JSON.stringify(req.query),
      JSON.stringify(req.user?.id || 'anonymous')
    ].join(':');
    
    return Cache.generateKey('api', key);
  }

  // Response size optimization middleware
  optimizeSize() {
    return (req, res, next) => {
      const originalJson = res.json;
      
      res.json = function(data) {
        let optimizedData = data;

        // Apply field selection if specified
        if (req.selectedFields) {
          optimizedData = ResponseOptimizer.prototype.filterFields(optimizedData, req.selectedFields);
        }

        // Remove null/undefined values to reduce size
        optimizedData = ResponseOptimizer.prototype.removeNullValues(optimizedData);

        // Add response metadata
        const responseSize = Buffer.byteLength(JSON.stringify(optimizedData), 'utf8');
        res.setHeader('X-Response-Size', responseSize);
        res.setHeader('X-Response-Count', ResponseOptimizer.prototype.countRecords(optimizedData));

        return originalJson.call(this, optimizedData);
      };

      next();
    };
  }

  // Remove null and undefined values
  removeNullValues(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.removeNullValues(item));
    } else if (typeof data === 'object' && data !== null) {
      const cleaned = {};
      Object.keys(data).forEach(key => {
        const value = data[key];
        if (value !== null && value !== undefined) {
          cleaned[key] = typeof value === 'object' ? this.removeNullValues(value) : value;
        }
      });
      return cleaned;
    }
    return data;
  }

  // Count records in response
  countRecords(data) {
    if (Array.isArray(data)) {
      return data.length;
    } else if (data && typeof data === 'object' && data.data) {
      return Array.isArray(data.data) ? data.data.length : 1;
    } else if (data && typeof data === 'object') {
      return 1;
    }
    return 0;
  }

  // ETag generation for conditional requests
  etag() {
    return (req, res, next) => {
      const originalJson = res.json;
      
      res.json = function(data) {
        // Generate ETag based on response content
        const etag = this.generateETag(data);
        res.setHeader('ETag', etag);

        // Check If-None-Match header
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch && ifNoneMatch === etag) {
          return res.status(304).end();
        }

        return originalJson.call(this, data);
      }.bind(this);

      next();
    };
  }

  // Generate ETag
  generateETag(data) {
    const content = JSON.stringify(data);
    const hash = require('crypto').createHash('md5').update(content).digest('hex');
    return `"${hash}"`;
  }

  // Response time tracking
  responseTime() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        res.setHeader('X-Response-Time', `${duration}ms`);
        
        // Log slow responses
        if (duration > 1000) {
          console.warn(`🐌 Slow response: ${req.method} ${req.path} - ${duration}ms`);
        }
      });

      next();
    };
  }

  // Combined optimization middleware
  optimize(options = {}) {
    const {
      resourceType = null,
      cacheTTL = 300,
      enableCompression = true,
      enableETag = true,
      enableFieldSelection = true
    } = options;

    const middlewares = [];

    // Add response time tracking first
    middlewares.push(this.responseTime());

    // Add field selection if resource type specified
    if (enableFieldSelection && resourceType) {
      middlewares.push(this.fieldSelection(resourceType));
    }

    // Add size optimization
    middlewares.push(this.optimizeSize());

    // Add ETag support
    if (enableETag) {
      middlewares.push(this.etag());
    }

    // Add compression
    if (enableCompression) {
      middlewares.push(this.compression());
    }

    // Add response caching
    if (cacheTTL > 0) {
      middlewares.push(this.responseCache({ ttl: cacheTTL }));
    }

    return middlewares;
  }
}

// Create singleton instance
const responseOptimizer = new ResponseOptimizer();

module.exports = responseOptimizer;
