// Service Worker for offline caching and performance optimization
const CACHE_NAME = 'property-management-pos-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';
const API_CACHE = 'api-v1';

// Cache strategies
const CACHE_STRATEGIES = {
  STATIC: ['cache-first'],
  API: ['network-first', 'stale-while-revalidate'],
  DYNAMIC: ['stale-while-revalidate'],
};

// Files to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  // Add other static assets as needed
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/tenants',
  '/api/properties',
  '/api/payments/stats',
  '/api/tenants/stats',
  '/api/properties/stats',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    if (
      request.method === 'POST' &&
      url.origin === self.location.origin &&
      (url.pathname.startsWith('/api/maintenance') || url.pathname.startsWith('/api/conversations/'))
    ) {
      event.respondWith(networkWithBackgroundSync(request));
    }
    return;
  }

  // Handle different request types
  if (url.origin === self.location.origin) {
    // Same-origin requests
    if (url.pathname.startsWith('/api/')) {
      // API requests - Network first with cache fallback
      event.respondWith(networkFirst(request));
    } else {
      // Static assets - Cache first
      event.respondWith(cacheFirst(request));
    }
  } else {
    // Cross-origin requests (CDN, etc.) - Stale while revalidate
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Cache strategies implementation
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API requests
    if (request.url.includes('/api/')) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'No network connection and cached data not available' 
        }),
        { 
          status: 503, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });

  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // Otherwise wait for network
  return fetchPromise;
}

async function networkWithBackgroundSync(request) {
  try {
    return await fetch(request);
  } catch (error) {
    try {
      const cloned = request.clone();
      const contentType = cloned.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return new Response(
          JSON.stringify({ error: 'Offline', message: 'Offline queue supports JSON requests only' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const body = await cloned.text();
      const headers = {};
      for (const [key, value] of cloned.headers.entries()) {
        headers[key] = value;
      }

      const id = await addPendingRequest({
        url: cloned.url,
        options: {
          method: cloned.method,
          headers,
          body
        }
      });

      if (self.registration?.sync) {
        await self.registration.sync.register('background-sync');
      }

      return new Response(
        JSON.stringify({ queued: true, id }),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (queueError) {
      return new Response(
        JSON.stringify({ error: 'Offline', message: 'Failed to queue request for sync' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Get all pending requests from IndexedDB
    const pendingRequests = await getPendingRequests();
    
    for (const request of pendingRequests) {
      try {
        await fetch(request.url, request.options);
        await removePendingRequest(request.id);
        console.log('Background sync: Request synced successfully');
      } catch (error) {
        console.error('Background sync: Request failed', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore',
        icon: '/favicon.ico'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/favicon.ico'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Property Management POS', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Cache management utilities
const OFFLINE_DB_NAME = 'property-management-pos-offline';
const OFFLINE_DB_VERSION = 1;
const OFFLINE_STORE = 'pending_requests';

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE)) {
        db.createObjectStore(OFFLINE_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addPendingRequest(record) {
  const db = await openOfflineDB();
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const payload = { id, ...record, created_at: Date.now() };
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, 'readwrite');
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
    tx.objectStore(OFFLINE_STORE).put(payload);
  });
}

async function getPendingRequests() {
  const db = await openOfflineDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, 'readonly');
    const req = tx.objectStore(OFFLINE_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function removePendingRequest(id) {
  const db = await openOfflineDB();
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, 'readwrite');
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.objectStore(OFFLINE_STORE).delete(id);
  });
}

// Periodic cache cleanup
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'CACHE_CLEANUP') cleanupCache();
  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function cleanupCache() {
  try {
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      
      // Remove old entries (older than 24 hours)
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      for (const request of requests) {
        const response = await cache.match(request);
        const dateHeader = response?.headers.get('date');
        
        if (dateHeader) {
          const responseDate = new Date(dateHeader).getTime();
          
          if (now - responseDate > maxAge) {
            await cache.delete(request);
            console.log('Service Worker: Cleaned up old cache entry', request.url);
          }
        }
      }
    }
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}
