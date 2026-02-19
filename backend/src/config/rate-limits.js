// Production Rate Limit Configuration
// Configure different rate limits based on user tiers and subscription levels

const RATE_LIMITS = {
  // User Tier-based Limits
  userTiers: {
    free: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // 100 requests per window
      message: 'Free tier limit exceeded. Upgrade to Pro for higher limits.',
      features: {
        search: { windowMs: 60 * 1000, max: 10 },  // 10 searches per minute
        reports: { windowMs: 60 * 60 * 1000, max: 5 }, // 5 reports per hour
        api: { windowMs: 15 * 60 * 1000, max: 100 }   // 100 API calls per 15 min
      }
    },
    
    basic: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500, // 500 requests per window
      message: 'Basic tier limit exceeded. Upgrade to Pro for higher limits.',
      features: {
        search: { windowMs: 60 * 1000, max: 30 },  // 30 searches per minute
        reports: { windowMs: 60 * 60 * 1000, max: 20 }, // 20 reports per hour
        api: { windowMs: 15 * 60 * 1000, max: 500 }   // 500 API calls per 15 min
      }
    },
    
    pro: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 2000, // 2000 requests per window
      message: 'Pro tier limit exceeded. Contact support for Enterprise plan.',
      features: {
        search: { windowMs: 60 * 1000, max: 100 }, // 100 searches per minute
        reports: { windowMs: 60 * 60 * 1000, max: 100 }, // 100 reports per hour
        api: { windowMs: 15 * 60 * 1000, max: 2000 }  // 2000 API calls per 15 min
      }
    },
    
    enterprise: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10000, // 10000 requests per window
      message: 'Enterprise tier limit exceeded. Contact your account manager.',
      features: {
        search: { windowMs: 60 * 1000, max: 500 }, // 500 searches per minute
        reports: { windowMs: 60 * 60 * 1000, max: 1000 }, // 1000 reports per hour
        api: { windowMs: 15 * 60 * 1000, max: 10000 } // 10000 API calls per 15 min
      }
    }
  },

  // Role-based Limits
  roles: {
    tenant: {
      windowMs: 15 * 60 * 1000,
      max: 200,
      message: 'Tenant rate limit exceeded. Please slow down your requests.'
    },
    
    admin: {
      windowMs: 15 * 60 * 1000,
      max: 1000,
      message: 'Admin rate limit exceeded. Please slow down your requests.'
    },
    
    super_admin: {
      windowMs: 15 * 60 * 1000,
      max: 5000,
      message: 'Super admin rate limit exceeded. Please slow down your requests.'
    }
  },

  // Endpoint-specific Limits
  endpoints: {
    // Authentication endpoints (very strict)
    auth: {
      login: { windowMs: 15 * 60 * 1000, max: 5, message: 'Too many login attempts. Please try again later.' },
      register: { windowMs: 60 * 60 * 1000, max: 3, message: 'Too many registration attempts. Please try again later.' },
      forgot_password: { windowMs: 60 * 60 * 1000, max: 3, message: 'Too many password reset requests. Please try again later.' },
      verify_email: { windowMs: 60 * 60 * 1000, max: 5, message: 'Too many verification attempts. Please try again later.' }
    },

    // Data operations
    data: {
      create: { windowMs: 60 * 1000, max: 50, message: 'Too many create operations. Please slow down.' },
      update: { windowMs: 60 * 1000, max: 100, message: 'Too many update operations. Please slow down.' },
      delete: { windowMs: 60 * 1000, max: 20, message: 'Too many delete operations. Please slow down.' },
      read: { windowMs: 60 * 1000, max: 500, message: 'Too many read operations. Please slow down.' }
    },

    // File operations
    files: {
      upload: { windowMs: 60 * 60 * 1000, max: 50, message: 'Upload limit exceeded. Please try again later.' },
      download: { windowMs: 60 * 1000, max: 100, message: 'Download limit exceeded. Please slow down.' }
    },

    // Reports and analytics
    reports: {
      generate: { windowMs: 60 * 60 * 1000, max: 10, message: 'Report generation limit exceeded. Please try again later.' },
      export: { windowMs: 60 * 60 * 1000, max: 20, message: 'Export limit exceeded. Please try again later.' }
    },

    // Search operations
    search: {
      general: { windowMs: 60 * 1000, max: 30, message: 'Search limit exceeded. Please slow down.' },
      advanced: { windowMs: 60 * 1000, max: 10, message: 'Advanced search limit exceeded. Please slow down.' }
    }
  },

  // IP-based Limits (for anonymous users)
  ip: {
    anonymous: {
      windowMs: 15 * 60 * 1000,
      max: 50,
      message: 'IP rate limit exceeded. Please register for higher limits.'
    }
  },

  // API Key Limits (for external integrations)
  apiKeys: {
    basic: { windowMs: 15 * 60 * 1000, max: 1000, message: 'Basic API key limit exceeded.' },
    premium: { windowMs: 15 * 60 * 1000, max: 5000, message: 'Premium API key limit exceeded.' },
    enterprise: { windowMs: 15 * 60 * 1000, max: 20000, message: 'Enterprise API key limit exceeded.' }
  }
};

// Rate Limit Configuration Helper
class RateLimitConfig {
  static getUserTierLimits(userTier = 'free') {
    return RATE_LIMITS.userTiers[userTier] || RATE_LIMITS.userTiers.free;
  }

  static getRoleLimits(role = 'tenant') {
    return RATE_LIMITS.roles[role] || RATE_LIMITS.roles.tenant;
  }

  static getEndpointLimits(endpoint, operation) {
    if (RATE_LIMITS.endpoints[endpoint] && RATE_LIMITS.endpoints[endpoint][operation]) {
      return RATE_LIMITS.endpoints[endpoint][operation];
    }
    return null;
  }

  static getAuthLimits(operation) {
    return RATE_LIMITS.endpoints.auth[operation] || RATE_LIMITS.endpoints.auth.login;
  }

  static getIpLimits() {
    return RATE_LIMITS.ip.anonymous;
  }

  static getApiKeyLimits(keyType = 'basic') {
    return RATE_LIMITS.apiKeys[keyType] || RATE_LIMITS.apiKeys.basic;
  }

  // Get the most restrictive limit for a user
  static getEffectiveLimit(user, endpoint = null, operation = null) {
    const limits = [];

    // Add user tier limit
    if (user && user.tier) {
      limits.push(this.getUserTierLimits(user.tier));
    }

    // Add role limit
    if (user && user.role) {
      limits.push(this.getRoleLimits(user.role));
    }

    // Add endpoint-specific limit
    if (endpoint && operation) {
      const endpointLimit = this.getEndpointLimits(endpoint, operation);
      if (endpointLimit) {
        limits.push(endpointLimit);
      }
    }

    // Return the most restrictive limit (lowest max)
    if (limits.length > 0) {
      return limits.reduce((mostRestrictive, current) => 
        current.max < mostRestrictive.max ? current : mostRestrictive
      );
    }

    // Default to IP limits for anonymous users
    return this.getIpLimits();
  }

  // Progressive rate limiting configuration
  static getProgressiveConfig(baseLimit) {
    return {
      stages: [
        { windowMs: baseLimit.windowMs, max: Math.floor(baseLimit.max * 0.8) },  // 80% of normal limit
        { windowMs: baseLimit.windowMs, max: Math.floor(baseLimit.max * 0.5) },  // 50% of normal limit
        { windowMs: baseLimit.windowMs, max: Math.floor(baseLimit.max * 0.2) }   // 20% of normal limit
      ],
      cooldownMs: 30 * 60 * 1000, // 30 minutes cooldown
      keyGenerator: (req) => `progressive:${req.user?.id || req.ip}:${req.path}`
    };
  }
}

module.exports = {
  RATE_LIMITS,
  RateLimitConfig
};
