import React from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Cache configuration
const CACHE_CONFIG = {
  // Short-term cache for frequently changing data
  SHORT: {
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
  },
  // Medium-term cache for moderately changing data
  MEDIUM: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  },
  // Long-term cache for rarely changing data
  LONG: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 2 * 60 * 60 * 1000, // 2 hours
  },
  // Static cache for reference data
  STATIC: {
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    cacheTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
};

// Cache categories with their configurations
const CACHE_CATEGORIES = {
  // User data - changes infrequently
  USER_PROFILE: CACHE_CONFIG.LONG,
  USER_PERMISSIONS: CACHE_CONFIG.MEDIUM,
  
  // Tenant data - changes moderately
  TENANTS_LIST: CACHE_CONFIG.MEDIUM,
  TENANT_DETAILS: CACHE_CONFIG.MEDIUM,
  TENANT_STATS: CACHE_CONFIG.SHORT,
  
  // Property data - changes moderately
  PROPERTIES_LIST: CACHE_CONFIG.MEDIUM,
  PROPERTY_DETAILS: CACHE_CONFIG.MEDIUM,
  PROPERTY_STATS: CACHE_CONFIG.SHORT,
  
  // Payment data - changes frequently
  PAYMENTS_LIST: CACHE_CONFIG.SHORT,
  PAYMENT_DETAILS: CACHE_CONFIG.MEDIUM,
  PAYMENT_STATS: CACHE_CONFIG.SHORT,
  
  // Maintenance data - changes frequently
  MAINTENANCE_LIST: CACHE_CONFIG.SHORT,
  MAINTENANCE_DETAILS: CACHE_CONFIG.MEDIUM,
  
  // Document data - changes infrequently
  DOCUMENTS_LIST: CACHE_CONFIG.MEDIUM,
  DOCUMENT_DETAILS: CACHE_CONFIG.LONG,
  
  // System data - rarely changes
  SYSTEM_CONFIG: CACHE_CONFIG.STATIC,
  REFERENCE_DATA: CACHE_CONFIG.STATIC,
};

// Cache manager class
class CacheManager {
  constructor() {
    this.queryClient = null;
    this.prefetchQueue = new Map();
    this.isPrefetching = false;
  }

  setQueryClient(queryClient) {
    this.queryClient = queryClient;
  }

  // Get cache configuration for a category
  getCacheConfig(category) {
    return CACHE_CATEGORIES[category] || CACHE_CONFIG.MEDIUM;
  }

  // Prefetch data with intelligent queuing
  async prefetchData(queryKey, queryFn, category = 'MEDIUM', options = {}) {
    if (!this.queryClient) return;

    const config = this.getCacheConfig(category);
    const cacheKey = Array.isArray(queryKey) ? queryKey.join('|') : queryKey;

    // Check if already cached and fresh
    const cachedData = this.queryClient.getQueryData(queryKey);
    if (cachedData && !this.queryClient.isStale(queryKey)) {
      return cachedData;
    }

    // Add to prefetch queue
    this.prefetchQueue.set(cacheKey, {
      queryKey,
      queryFn,
      config,
      options,
      timestamp: Date.now(),
    });

    // Process prefetch queue
    this.processPrefetchQueue();
  }

  // Process prefetch queue with throttling
  async processPrefetchQueue() {
    if (this.isPrefetching || this.prefetchQueue.size === 0) return;

    this.isPrefetching = true;

    try {
      const entries = Array.from(this.prefetchQueue.entries());
      
      // Process in batches to avoid overwhelming the API
      const batchSize = 3;
      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(([key, item]) => this.executePrefetch(key, item))
        );

        // Small delay between batches
        if (i + batchSize < entries.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } finally {
      this.isPrefetching = false;
    }
  }

  // Execute individual prefetch
  async executePrefetch(key, item) {
    try {
      await this.queryClient.prefetchQuery({
        queryKey: item.queryKey,
        queryFn: item.queryFn,
        staleTime: item.config.staleTime,
        cacheTime: item.config.cacheTime,
        ...item.options,
      });
      
      this.prefetchQueue.delete(key);
    } catch (error) {
      console.warn(`Prefetch failed for ${key}:`, error);
      this.prefetchQueue.delete(key);
    }
  }

  // Intelligent prefetching based on user behavior
  prefetchUserData(userId) {
    this.prefetchData(
      ['user', userId],
      () => import('../services/api').then(api => api.authAPI.getUserById(userId)),
      'USER_PROFILE'
    );
  }

  prefetchTenantList(params = {}) {
    this.prefetchData(
      ['tenants', params],
      () => import('../services/api').then(api => api.tenantAPI.getTenants(params)),
      'TENANTS_LIST'
    );
  }

  prefetchPropertyList(params = {}) {
    this.prefetchData(
      ['properties', params],
      () => import('../services/api').then(api => api.propertyAPI.getProperties(params)),
      'PROPERTIES_LIST'
    );
  }

  prefetchPropertyDetails(propertyId) {
    this.prefetchData(
      ['property', propertyId],
      () => import('../services/api').then(api => api.propertyAPI.getPropertyById(propertyId)),
      'PROPERTY_DETAILS'
    );
  }

  prefetchTenantDetails(tenantId) {
    this.prefetchData(
      ['tenant', tenantId],
      () => import('../services/api').then(api => api.tenantAPI.getTenantById(tenantId)),
      'TENANT_DETAILS'
    );
  }

  prefetchStats() {
    this.prefetchData(
      ['tenants', 'stats'],
      () => import('../services/api').then(api => api.tenantAPI.getTenantStats()),
      'TENANT_STATS'
    );

    this.prefetchData(
      ['properties', 'stats'],
      () => import('../services/api').then(api => api.propertyAPI.getPropertyStats()),
      'PROPERTY_STATS'
    );

    this.prefetchData(
      ['payments', 'stats'],
      () => import('../services/api').then(api => api.paymentAPI.getPaymentStats()),
      'PAYMENT_STATS'
    );
  }

  // Route-based prefetching
  prefetchForRoute(route, params = {}) {
    switch (route) {
      case '/admin':
      case '/super-admin':
        this.prefetchStats();
        this.prefetchTenantList({ limit: 20 });
        this.prefetchPropertyList({ limit: 20 });
        break;

      case '/admin/properties':
        this.prefetchPropertyList(params);
        break;

      case '/admin/tenants':
        this.prefetchTenantList(params);
        break;

      case '/admin/payments':
        this.prefetchData(
          ['payments', params],
          () => import('../services/api').then(api => api.paymentAPI.getPayments(params)),
          'PAYMENTS_LIST'
        );
        break;

      case '/tenant':
        this.prefetchData(
          ['payments', { tenant_id: params.tenantId }],
          () => import('../services/api').then(api => api.paymentAPI.getPayments({ tenant_id: params.tenantId })),
          'PAYMENTS_LIST'
        );
        break;

      default:
        break;
    }
  }

  // Interaction-based prefetching
  prefetchOnInteraction(type, id) {
    switch (type) {
      case 'property-hover':
        this.prefetchPropertyDetails(id);
        break;

      case 'tenant-hover':
        this.prefetchTenantDetails(id);
        break;

      case 'property-click':
        this.prefetchPropertyDetails(id);
        this.prefetchData(
          ['tenants', { property_id: id }],
          () => import('../services/api').then(api => api.tenantAPI.getTenants({ property_id: id })),
          'TENANTS_LIST'
        );
        break;

      case 'tenant-click':
        this.prefetchTenantDetails(id);
        this.prefetchData(
          ['payments', { tenant_id: id }],
          () => import('../services/api').then(api => api.paymentAPI.getPayments({ tenant_id: id })),
          'PAYMENTS_LIST'
        );
        break;

      default:
        break;
    }
  }

  // Cache warming on app startup
  warmCache(userRole) {
    // Prefetch essential data based on user role
    this.prefetchStats();

    switch (userRole) {
      case 'admin':
      case 'super_admin':
        this.prefetchTenantList({ limit: 10 });
        this.prefetchPropertyList({ limit: 10 });
        break;

      case 'tenant':
        // Prefetch tenant-specific data
        break;

      default:
        break;
    }
  }

  // Cache invalidation strategies
  invalidateCache(pattern) {
    if (!this.queryClient) return;

    // Invalidate queries matching pattern
    this.queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = Array.isArray(query.queryKey) ? query.queryKey : [query.queryKey];
        return queryKey.some(key => 
          typeof key === 'string' && key.includes(pattern)
        );
      },
    });
  }

  invalidateTenantCache(tenantId) {
    this.queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
    this.queryClient.invalidateQueries({ queryKey: ['tenants'] });
    this.queryClient.invalidateQueries({ queryKey: ['tenants', 'stats'] });
  }

  invalidatePropertyCache(propertyId) {
    this.queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
    this.queryClient.invalidateQueries({ queryKey: ['properties'] });
    this.queryClient.invalidateQueries({ queryKey: ['properties', 'stats'] });
  }

  invalidatePaymentCache() {
    this.queryClient.invalidateQueries({ queryKey: ['payments'] });
    this.queryClient.invalidateQueries({ queryKey: ['payments', 'stats'] });
  }

  // Cache statistics
  getCacheStats() {
    if (!this.queryClient) return {};

    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();

    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale).length,
      inactiveQueries: queries.filter(q => !q.isActive()).length,
      prefetchQueueSize: this.prefetchQueue.size,
      isPrefetching: this.isPrefetching,
    };
  }

  // Clear cache
  clearCache() {
    if (!this.queryClient) return;
    this.queryClient.clear();
    this.prefetchQueue.clear();
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

// Hook for using cache manager
export const useCacheManager = () => {
  const queryClient = useQueryClient();
  
  React.useEffect(() => {
    cacheManager.setQueryClient(queryClient);
  }, [queryClient]);

  return cacheManager;
};

export default cacheManager;
