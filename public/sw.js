// Dynamic cache versioning using build-time variables
// __BUILD_ASSETS_DECLARATION__
const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : '1.0.0';
const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();
const CACHE_VERSION = `${VERSION}-${BUILD_TIME.replace(/[:.]/g, '-')}`;

const BUILD_ASSETS = typeof __BUILD_ASSETS__ !== 'undefined'
    ? __BUILD_ASSETS__
    : { static: [], html: [], chunks: [], media: [] };

const dedupe = (items) => [...new Set(items)];

// Cache names for different strategies
const STATIC_CACHE = `geuse-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `geuse-dynamic-${CACHE_VERSION}`;
const HTML_CACHE = `geuse-html-${CACHE_VERSION}`;

// Assets for different caching strategies
const JS_CSS_ASSETS = dedupe([
    ...BUILD_ASSETS.chunks
]);

const STATIC_ASSETS = dedupe([
    ...BUILD_ASSETS.static,
    ...BUILD_ASSETS.media,
    '/favicon-16x16.png',
    '/favicon-32x32.png',
    '/apple-touch-icon.png',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png',
    '/site.webmanifest',
    'https://www.geuse.io/media/sprite.png',
    'https://www.geuse.io/media/glitch.gif',
    'https://www.geuse.io/media/fire.gif'
]);

const HTML_ASSETS = dedupe([
    ...BUILD_ASSETS.html,
    '/',
    '/index.html'
]);

// Cache configuration
const CACHE_CONFIG = {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    maxEntries: 100,
    networkTimeoutSeconds: 5
};

// Utility functions
const isExpired = (response) => {
    if (!response || !response.headers) return true;
    
    const cacheDate = response.headers.get('cache-date');
    if (!cacheDate) return true;
    
    const cacheTime = new Date(cacheDate).getTime();
    const now = Date.now();
    return (now - cacheTime) > CACHE_CONFIG.maxAge;
};

const addToCache = async (cache, url) => {
    try {
        const response = await fetch(url);
        if (response.ok) {
            const responseClone = response.clone();
            // Add cache timestamp
            const responseWithDate = new Response(responseClone.body, {
                status: responseClone.status,
                statusText: responseClone.statusText,
                headers: {
                    ...Object.fromEntries(responseClone.headers.entries()),
                    'cache-date': new Date().toISOString()
                }
            });
            await cache.put(url, responseWithDate);
            console.log(`Successfully cached: ${url}`);
            return true;
        } else {
            console.warn(`Failed to cache ${url}: ${response.status} ${response.statusText}`);
            return false;
        }
    } catch (err) {
        console.warn(`Failed to cache ${url}:`, err);
        return false;
    }
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log(`ServiceWorker installing - Version: ${VERSION}, Build: ${BUILD_TIME}`);
    
    event.waitUntil(
        Promise.all([
            // Cache static assets
            caches.open(STATIC_CACHE).then(async (cache) => {
                const criticalAssets = dedupe([
                    ...JS_CSS_ASSETS,
                    ...STATIC_ASSETS
                ]);

                const results = await Promise.allSettled(
                    criticalAssets.map(url => addToCache(cache, url))
                );
                const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
                console.log(`Cached ${successful}/${criticalAssets.length} static assets`);
                return results;
            }),
            
            // Cache HTML assets
            caches.open(HTML_CACHE).then(async (cache) => {
                const results = await Promise.allSettled(
                    HTML_ASSETS.map(url => addToCache(cache, url))
                );
                const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
                console.log(`Cached ${successful}/${HTML_ASSETS.length} HTML assets`);
                return results;
            })
        ]).catch(err => {
            console.error('ServiceWorker cache installation failed:', err);
            throw err;
        })
    );
    
    // Take control immediately
    self.skipWaiting();
});

// Activate event - clean up old caches and manage cache versions
self.addEventListener('activate', (event) => {
    console.log(`ServiceWorker activating - Version: ${VERSION}, Build: ${BUILD_TIME}`);
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then(async (cacheNames) => {
                const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, HTML_CACHE];
                const cachesToDelete = cacheNames.filter(cacheName => 
                    cacheName.startsWith('geuse-') && !currentCaches.includes(cacheName)
                );
                
                if (cachesToDelete.length > 0) {
                    console.log(`Deleting ${cachesToDelete.length} old caches:`, cachesToDelete);
                    const deletePromises = cachesToDelete.map(cacheName => {
                        console.log(`Deleting cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    });
                    await Promise.all(deletePromises);
                    console.log('Cache cleanup completed');
                } else {
                    console.log('No old caches to delete');
                }
            }),
            
            // Claim all clients immediately
            self.clients.claim()
        ]).catch(err => {
            console.error('ServiceWorker activation failed:', err);
        })
    );
});

// Network timeout helper
const fetchWithTimeout = (request, timeout = CACHE_CONFIG.networkTimeoutSeconds * 1000) => {
    return Promise.race([
        fetch(request),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Network timeout')), timeout)
        )
    ]);
};

// Cache management helper
const manageCacheSize = async (cacheName) => {
    try {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        if (keys.length > CACHE_CONFIG.maxEntries) {
            const keysToDelete = keys.slice(0, keys.length - CACHE_CONFIG.maxEntries);
            await Promise.all(keysToDelete.map(key => cache.delete(key)));
            console.log(`Cleaned up ${keysToDelete.length} entries from ${cacheName}`);
        }
    } catch (err) {
        console.warn(`Failed to manage cache size for ${cacheName}:`, err);
    }
};

// Determine request type for caching strategy
const getRequestType = (url) => {
    if (url.includes('webhook') || url.includes('/api/')) return 'api';
    if (url.match(/\.(html)$/i) || url.endsWith('/') || url === location.origin) return 'html';
    if (url.match(/\.(js|css|woff2?|ttf|eot)$/i)) return 'static';
    if (url.match(/\.(png|jpe?g|gif|svg|webp|ico)$/i)) return 'image';
    return 'dynamic';
};

// Fetch event with different caching strategies
self.addEventListener('fetch', (event) => {
    const requestUrl = event.request.url;
    const requestType = getRequestType(requestUrl);

    // COMPLETELY bypass Service Worker for webhook and API calls - let browser handle natively
    if (requestType === 'api') {
        // Don't intercept at all - let the browser handle the request normally
        return;
    }

    // HTML strategy: Network-first with cache fallback
    if (requestType === 'html') {
        event.respondWith(
            (async () => {
                try {
                    // Try network first for HTML to get fresh content
                    const networkResponse = await fetchWithTimeout(event.request);
                    if (networkResponse.ok) {
                        // Cache the fresh response
                        const cache = await caches.open(HTML_CACHE);
                        const responseClone = networkResponse.clone();
                        const responseWithDate = new Response(responseClone.body, {
                            status: responseClone.status,
                            statusText: responseClone.statusText,
                            headers: {
                                ...Object.fromEntries(responseClone.headers.entries()),
                                'cache-date': new Date().toISOString()
                            }
                        });
                        await cache.put(event.request, responseWithDate);
                        await manageCacheSize(HTML_CACHE);
                        return networkResponse;
                    }
                } catch (err) {
                    console.warn(`Network failed for HTML ${requestUrl}, trying cache:`, err);
                }
                
                // Network failed, try cache
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse && !isExpired(cachedResponse)) {
                    console.log(`Serving cached HTML: ${requestUrl}`);
                    return cachedResponse;
                }
                
                // Both network and cache failed
                console.error(`No cached version available for HTML: ${requestUrl}`);
                return new Response('Offline - No cached version available', { 
                    status: 503, 
                    statusText: 'Service Unavailable' 
                });
            })()
        );
        return;
    }

    // Static assets strategy: Cache-first with network fallback
    if (requestType === 'static' || requestType === 'image') {
        event.respondWith(
            (async () => {
                // Try cache first for static assets
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse && !isExpired(cachedResponse)) {
                    console.log(`Serving cached static asset: ${requestUrl}`);
                    return cachedResponse;
                }
                
                try {
                    // Cache miss or expired, fetch from network
                    const networkResponse = await fetchWithTimeout(event.request);
                    if (networkResponse.ok) {
                        // Cache the response
                        const cache = await caches.open(STATIC_CACHE);
                        const responseClone = networkResponse.clone();
                        const responseWithDate = new Response(responseClone.body, {
                            status: responseClone.status,
                            statusText: responseClone.statusText,
                            headers: {
                                ...Object.fromEntries(responseClone.headers.entries()),
                                'cache-date': new Date().toISOString()
                            }
                        });
                        await cache.put(event.request, responseWithDate);
                        await manageCacheSize(STATIC_CACHE);
                        console.log(`Cached static asset: ${requestUrl}`);
                        return networkResponse;
                    }
                } catch (err) {
                    console.warn(`Network failed for static asset ${requestUrl}:`, err);
                }
                
                // Return expired cache as last resort
                if (cachedResponse) {
                    console.log(`Serving expired cached static asset: ${requestUrl}`);
                    return cachedResponse;
                }
                
                // Complete failure
                return new Response('Asset not available', { 
                    status: 404, 
                    statusText: 'Not Found' 
                });
            })()
        );
        return;
    }

    // Dynamic content strategy: Network-first with cache fallback
    event.respondWith(
        (async () => {
            try {
                const networkResponse = await fetchWithTimeout(event.request);
                if (networkResponse.ok) {
                    // Cache dynamic content for offline access
                    const cache = await caches.open(DYNAMIC_CACHE);
                    const responseClone = networkResponse.clone();
                    const responseWithDate = new Response(responseClone.body, {
                        status: responseClone.status,
                        statusText: responseClone.statusText,
                        headers: {
                            ...Object.fromEntries(responseClone.headers.entries()),
                            'cache-date': new Date().toISOString()
                        }
                    });
                    await cache.put(event.request, responseWithDate);
                    await manageCacheSize(DYNAMIC_CACHE);
                    return networkResponse;
                }
            } catch (err) {
                console.warn(`Network failed for dynamic content ${requestUrl}, trying cache:`, err);
            }
            
            // Try cache fallback
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) {
                return cachedResponse;
            }
            
            // No cache available
            return new Response('Content not available offline', { 
                status: 503, 
                statusText: 'Service Unavailable' 
            });
        })()
    );
}); 
