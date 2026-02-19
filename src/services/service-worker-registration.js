// Service Worker Registration for Production Build

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

export function register(config) {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log('Service Worker: Registered (localhost)');
        });
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      console.log('Service Worker: Registered');
      
      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Check every hour

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available
              console.log('Service Worker: New content is available');
              
              // Notify user of update
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // Content is cached for offline use
              console.log('Service Worker: Content is cached for offline use');
              
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch(error => {
      console.error('Service Worker: Registration failed:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' }
  })
    .then(response => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then(registration => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('No internet connection found. App is running in offline mode.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.unregister().then(() => {
        console.log('Service Worker: Unregistered');
      });
    });
  }
}

// Cache management utilities
export const cacheManager = {
  // Clear all caches
  clearAll: async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared');
    }
  },

  // Get cache size
  getCacheSize: async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      let totalSize = 0;
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }
      }
      
      return totalSize;
    }
    return 0;
  },

  // Cleanup old cache entries
  cleanup: async () => {
    if ('serviceWorker' in navigator && 'caches' in window) {
      const registration = await navigator.serviceWorker.ready;
      registration.active.postMessage({ type: 'CACHE_CLEANUP' });
    }
  }
};

// Performance monitoring
export const performanceMonitor = {
  // Measure page load performance
  measurePageLoad: () => {
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0];
      const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
      
      console.log('Page load time:', loadTime + 'ms');
      
      // Send to analytics if needed
      if (loadTime > 3000) {
        console.warn('Slow page load detected:', loadTime + 'ms');
      }
      
      return loadTime;
    }
    return 0;
  },

  // Measure resource loading
  measureResources: () => {
    if ('performance' in window) {
      const resources = performance.getEntriesByType('resource');
      const slowResources = resources.filter(resource => 
        resource.duration > 1000 // Resources taking more than 1 second
      );
      
      if (slowResources.length > 0) {
        console.warn('Slow resources detected:', slowResources);
      }
      
      return {
        total: resources.length,
        slow: slowResources.length,
        details: slowResources
      };
    }
    return { total: 0, slow: 0, details: [] };
  }
};

// Network status monitoring
export const networkMonitor = {
  isOnline: navigator.onLine,
  
  init: () => {
    window.addEventListener('online', () => {
      console.log('Network: Online');
      networkMonitor.isOnline = true;
      
      // Trigger sync when coming back online
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          return registration.sync.register('background-sync');
        });
      }
    });

    window.addEventListener('offline', () => {
      console.log('Network: Offline');
      networkMonitor.isOnline = false;
    });
  }
};
