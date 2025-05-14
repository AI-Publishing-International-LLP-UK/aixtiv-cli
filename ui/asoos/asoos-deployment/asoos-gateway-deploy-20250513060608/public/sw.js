// Service Worker for ASOOS PWA
const CACHE_NAME = 'asoos-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/performance.html',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/lucide-react@latest',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://unpkg.com/framer-motion@10.12.4/dist/framer-motion.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://unpkg.com/three@0.157.0/build/three.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install event - cache the assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve from cache, then network
self.addEventListener('fetch', event => {
  // For navigation requests, try the network first, then cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }
  
  // For static assets, try cache first, then network
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then(response => {
            // Don't cache if it's not a successful response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response because it's a stream that can only be consumed once
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                // Only cache same-origin requests
                if (new URL(event.request.url).origin === location.origin) {
                  cache.put(event.request, responseToCache);
                }
              });
              
            return response;
          })
          .catch(error => {
            console.error('Fetch failed:', error);
            // For image requests, return a fallback image
            if (event.request.destination === 'image') {
              return caches.match('/placeholder.png');
            }
            
            throw error;
          });
      })
  );
});

// Handle background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Handle push notifications
self.addEventListener('push', event => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// Function to sync data when back online
function syncData() {
  return new Promise((resolve, reject) => {
    // Get data from IndexedDB
    const dbPromise = indexedDB.open('asoos-offline-db', 1);
    
    dbPromise.onsuccess = event => {
      const db = event.target.result;
      const tx = db.transaction('offlineActions', 'readwrite');
      const store = tx.objectStore('offlineActions');
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        const offlineData = request.result;
        
        if (offlineData.length === 0) {
          resolve();
          return;
        }
        
        // Process each offline action
        Promise.all(offlineData.map(item => {
          return fetch('/api/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(item)
          })
          .then(response => {
            if (response.ok) {
              // Remove from IndexedDB after successful sync
              store.delete(item.id);
            }
          });
        }))
        .then(() => {
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        })
        .catch(error => {
          console.error('Sync failed:', error);
          tx.oncomplete = () => {
            db.close();
            reject(error);
          };
        });
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    };
    
    dbPromise.onerror = event => {
      reject(event.target.error);
    };
  });
}