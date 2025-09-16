/**
 * Service Worker Generator
 * Generates a service worker with build timestamp and version for automatic cache invalidation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Build configuration
const BUILD_TIME = new Date().toISOString();
const VERSION = process.env.npm_package_version || '1.0.0';
const CACHE_VERSION = `${VERSION}-${BUILD_TIME.replace(/[:.]/g, '-')}`;

// Paths
const OUTPUT_DIR = 'dist';
const SW_OUTPUT_PATH = path.join(__dirname, OUTPUT_DIR, 'sw.js');
const SW_TEMPLATE_PATH = path.join(__dirname, 'public', 'sw.js');

/**
 * Scans the build output directory to find all generated assets
 * @param {string} dir - Directory to scan
 * @param {string} basePath - Base path for relative URLs
 * @returns {Object} - Object containing categorized assets
 */
function scanBuildAssets(dir, basePath = '') {
  const assets = {
    static: [],
    html: [],
    chunks: [],
    media: []
  };

  if (!fs.existsSync(dir)) {
    console.warn(`Build directory ${dir} does not exist`);
    return assets;
  }

  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    const relativePath = path.posix.join(basePath, file.name);

    if (file.isDirectory()) {
      // Recursively scan subdirectories
      const subAssets = scanBuildAssets(fullPath, relativePath);
      assets.static.push(...subAssets.static);
      assets.html.push(...subAssets.html);
      assets.chunks.push(...subAssets.chunks);
      assets.media.push(...subAssets.media);
    } else {
      const url = '/' + relativePath;
      
      // Categorize files based on extension and path
      if (file.name.match(/\.(html)$/i)) {
        assets.html.push(url);
      } else if (file.name.match(/\.(js|css)$/i) && relativePath.includes('assets/')) {
        assets.chunks.push(url);
      } else if (file.name.match(/\.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot)$/i)) {
        if (relativePath.includes('assets/')) {
          assets.static.push(url);
        } else {
          assets.media.push(url);
        }
      } else if (file.name.match(/\.(json|txt|xml)$/i)) {
        assets.static.push(url);
      }
    }
  }

  return assets;
}

/**
 * Generates the service worker content with injected build information
 * @param {Object} assets - Categorized assets from build output
 * @returns {string} - Generated service worker content
 */
function generateServiceWorkerContent(assets) {
  return `// Auto-generated Service Worker
// Build Time: ${BUILD_TIME}
// Version: ${VERSION}
// Cache Version: ${CACHE_VERSION}

const VERSION = '${VERSION}';
const BUILD_TIME = '${BUILD_TIME}';
const CACHE_VERSION = '${CACHE_VERSION}';

// Cache names for different strategies
const STATIC_CACHE = \`geuse-static-\${CACHE_VERSION}\`;
const DYNAMIC_CACHE = \`geuse-dynamic-\${CACHE_VERSION}\`;
const HTML_CACHE = \`geuse-html-\${CACHE_VERSION}\`;

// Auto-discovered assets from build
const BUILD_ASSETS = ${JSON.stringify(assets, null, 2)};

// Combined asset lists for caching strategies
const STATIC_ASSETS = [
  // Build-generated static assets
  ...BUILD_ASSETS.static,
  ...BUILD_ASSETS.media,
  // Additional static assets
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/site.webmanifest'
].filter((asset, index, arr) => arr.indexOf(asset) === index); // Remove duplicates

const HTML_ASSETS = [
  // Build-generated HTML assets
  ...BUILD_ASSETS.html,
  // Root HTML
  '/',
  '/index.html'
].filter((asset, index, arr) => arr.indexOf(asset) === index); // Remove duplicates

const JS_CSS_ASSETS = [
  // Build-generated JS/CSS chunks
  ...BUILD_ASSETS.chunks
].filter((asset, index, arr) => arr.indexOf(asset) === index); // Remove duplicates

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
      console.log(\`Successfully cached: \${url}\`);
      return true;
    } else {
      console.warn(\`Failed to cache \${url}: \${response.status} \${response.statusText}\`);
      return false;
    }
  } catch (err) {
    console.warn(\`Failed to cache \${url}:\`, err);
    return false;
  }
};

// Install event - cache assets by priority
self.addEventListener('install', (event) => {
  console.log(\`ServiceWorker installing - Version: \${VERSION}, Build: \${BUILD_TIME}\`);
  console.log(\`Assets discovered: \${STATIC_ASSETS.length} static, \${HTML_ASSETS.length} HTML, \${JS_CSS_ASSETS.length} JS/CSS\`);
  
  event.waitUntil(
    Promise.all([
      // Cache critical JS/CSS first (highest priority)
      caches.open(STATIC_CACHE).then(async (cache) => {
        const criticalAssets = JS_CSS_ASSETS.concat(STATIC_ASSETS);
        const results = await Promise.allSettled(
          criticalAssets.map(url => addToCache(cache, url))
        );
        const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
        console.log(\`Cached \${successful}/\${criticalAssets.length} critical assets\`);
        return results;
      }),
      
      // Cache HTML assets
      caches.open(HTML_CACHE).then(async (cache) => {
        const results = await Promise.allSettled(
          HTML_ASSETS.map(url => addToCache(cache, url))
        );
        const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
        console.log(\`Cached \${successful}/\${HTML_ASSETS.length} HTML assets\`);
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
  console.log(\`ServiceWorker activating - Version: \${VERSION}, Build: \${BUILD_TIME}\`);
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(async (cacheNames) => {
        const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, HTML_CACHE];
        const cachesToDelete = cacheNames.filter(cacheName => 
          cacheName.startsWith('geuse-') && !currentCaches.includes(cacheName)
        );
        
        if (cachesToDelete.length > 0) {
          console.log(\`Deleting \${cachesToDelete.length} old caches:\`, cachesToDelete);
          const deletePromises = cachesToDelete.map(cacheName => {
            console.log(\`Deleting cache: \${cacheName}\`);
            return caches.delete(cacheName);
          });
          await Promise.all(deletePromises);
          console.log('Cache cleanup completed');
        } else {
          console.log('No old caches to delete');
        }
      }),
      
      // Claim all clients immediately
      self.clients.claim().then(() => {
        // Notify clients of the new service worker
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_UPDATED',
              version: VERSION,
              buildTime: BUILD_TIME
            });
          });
        });
      })
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
      console.log(\`Cleaned up \${keysToDelete.length} entries from \${cacheName}\`);
    }
  } catch (err) {
    console.warn(\`Failed to manage cache size for \${cacheName}:\`, err);
  }
};

// Determine request type for caching strategy
const getRequestType = (url) => {
  if (url.includes('webhook') || url.includes('/api/')) return 'api';
  if (url.match(/\\.(html)$/i) || url.endsWith('/') || url === location.origin) return 'html';
  if (url.match(/\\.(js|css|woff2?|ttf|eot)$/i)) return 'static';
  if (url.match(/\\.(png|jpe?g|gif|svg|webp|ico)$/i)) return 'image';
  return 'dynamic';
};

// Fetch event with different caching strategies
self.addEventListener('fetch', (event) => {
  const requestUrl = event.request.url;
  const requestType = getRequestType(requestUrl);
  
  // Skip caching for API calls and webhooks - always go to network
  if (requestType === 'api') {
    event.respondWith(
      fetchWithTimeout(event.request).catch(err => {
        console.warn(\`API request failed: \${requestUrl}\`, err);
        return new Response('Network Error', { 
          status: 503, 
          statusText: 'Service Unavailable' 
        });
      })
    );
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
          console.warn(\`Network failed for HTML \${requestUrl}, trying cache:\`, err);
        }
        
        // Network failed, try cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse && !isExpired(cachedResponse)) {
          console.log(\`Serving cached HTML: \${requestUrl}\`);
          return cachedResponse;
        }
        
        // Both network and cache failed
        console.error(\`No cached version available for HTML: \${requestUrl}\`);
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
          console.log(\`Serving cached static asset: \${requestUrl}\`);
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
            console.log(\`Cached static asset: \${requestUrl}\`);
            return networkResponse;
          }
        } catch (err) {
          console.warn(\`Network failed for static asset \${requestUrl}:\`, err);
        }
        
        // Return expired cache as last resort
        if (cachedResponse) {
          console.log(\`Serving expired cached static asset: \${requestUrl}\`);
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
        console.warn(\`Network failed for dynamic content \${requestUrl}, trying cache:\`, err);
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
`;
}

/**
 * Main function to generate the service worker
 */
function generateServiceWorker() {
  console.log('🔧 Generating service worker...');
  console.log(`📅 Build Time: ${BUILD_TIME}`);
  console.log(`📦 Version: ${VERSION}`);
  console.log(`🏷️  Cache Version: ${CACHE_VERSION}`);

  // Ensure output directory exists
  const outputDir = path.dirname(SW_OUTPUT_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created output directory: ${outputDir}`);
  }

  // Scan build assets
  console.log('🔍 Scanning build assets...');
  const buildAssets = scanBuildAssets(path.join(__dirname, OUTPUT_DIR));
  
  console.log(`📊 Assets discovered:`);
  console.log(`   - Static: ${buildAssets.static.length} files`);
  console.log(`   - HTML: ${buildAssets.html.length} files`);
  console.log(`   - JS/CSS Chunks: ${buildAssets.chunks.length} files`);
  console.log(`   - Media: ${buildAssets.media.length} files`);

  // Generate service worker content
  const swContent = generateServiceWorkerContent(buildAssets);

  // Write service worker file
  fs.writeFileSync(SW_OUTPUT_PATH, swContent, 'utf8');
  console.log(`✅ Service worker generated: ${SW_OUTPUT_PATH}`);
  console.log(`📏 File size: ${(fs.statSync(SW_OUTPUT_PATH).size / 1024).toFixed(2)} KB`);

  return {
    version: VERSION,
    buildTime: BUILD_TIME,
    cacheVersion: CACHE_VERSION,
    assets: buildAssets,
    outputPath: SW_OUTPUT_PATH
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = generateServiceWorker();
    console.log('🎉 Service worker generation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Service worker generation failed:', error);
    process.exit(1);
  }
}

export { generateServiceWorker };