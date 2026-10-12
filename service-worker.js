// Relative URLs resolve against this script's location, so the same file works
// at the domain root and under a GitHub Pages project path (/arcade/).
// Bump CACHE_NAME whenever a game changes, or clients keep serving the old copy.
const CACHE_NAME = 'game-showcase-v4';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json'
];

// Install event - cache essential files
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch(err => console.log('Cache addAll error:', err))
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                return fetch(event.request).then(response => {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type === 'error') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    // Cache successful same-origin responses for games and assets
                    if (new URL(event.request.url).origin === self.location.origin) {
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                    }

                    return response;
                });
            })
            .catch(() => {
                // Return a custom offline page if available
                // For now, just return the index
                return caches.match('./index.html');
            })
    );
});

// Background sync for future enhancements
self.addEventListener('sync', event => {
    if (event.tag === 'sync-game-data') {
        event.waitUntil(
            // Implement game data sync here if needed
            Promise.resolve()
        );
    }
});
