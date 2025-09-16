import { defineConfig } from 'vite';
import { config } from './config.js';
import { generateServiceWorker } from './generate-sw.js';

export default defineConfig({
  build: {
    outDir: config.build.outputDir,
    sourcemap: config.build.sourceMap,
    minify: config.build.minify,
    rollupOptions: {
      output: {
        // Ensure all assets get content hashes for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name)) {
            return `assets/[name]-[hash].${ext}`;
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name)) {
            return `assets/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        },
        manualChunks: {
          three: ['three'],
          tween: ['@tweenjs/tween.js']
        }
      }
    }
  },
  define: {
    __WEBHOOK_URL__: JSON.stringify(config.webhookUrl),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  },
  plugins: [
    {
      name: 'generate-service-worker',
      writeBundle() {
        // Generate service worker after build is complete
        try {
          console.log('\n🔧 Generating service worker...');
          const result = generateServiceWorker();
          console.log(`✅ Service worker generated with cache version: ${result.cacheVersion}`);
        } catch (error) {
          console.error('❌ Failed to generate service worker:', error);
          throw error;
        }
      }
    }
  ],
  server: {
    port: 3000,
    open: true
  }
}); 