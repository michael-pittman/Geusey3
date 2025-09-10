const CACHE_NAME = 'geuse-cache-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/assets/index-CiHYBvAE.css',
    '/assets/index-mjGSHMLo.js',
    '/assets/chat-BkkZU96i.js',
    '/assets/three-C0VEc2Vx.js',
    '/assets/tween-l0sNRNKZ.js',
    '/favicon-16x16.png',
    '/favicon-32x32.png',
    '/apple-touch-icon.png',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png',
    '/site.webmanifest',
    'https://www.geuse.io/media/sprite.png',
    'https://www.geuse.io/media/glitch.gif',
    'https://www.geuse.io/media/fire.gif'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                // Cache assets individually to prevent one failure from breaking all caching
                return Promise.allSettled(
                    ASSETS_TO_CACHE.map(url => 
                        cache.add(url).catch(err => {
                            console.warn(`Failed to cache ${url}:`, err);
                            return null; // Don't fail the entire cache operation
                        })
                    )
                );
            })
            .catch(err => {
                console.error('ServiceWorker cache installation failed:', err);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
    // Skip caching for webhook requests and API calls
    if (event.request.url.includes('webhook') || event.request.url.includes('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached response if found
                if (response) {
                    return response;
                }

                // Clone the request because it can only be used once
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(
                    (response) => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response because it can only be used once
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
    );
}); 