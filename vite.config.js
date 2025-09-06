import { defineConfig } from 'vite';
import { config } from './config.js';

export default defineConfig({
  build: {
    outDir: config.build.outputDir,
    sourcemap: config.build.sourceMap,
    minify: config.build.minify,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          tween: ['@tweenjs/tween.js']
        }
      }
    }
  },
  define: {
    __WEBHOOK_URL__: JSON.stringify(config.webhookUrl)
  },
  server: {
    port: 3000,
    open: true
  }
}); 