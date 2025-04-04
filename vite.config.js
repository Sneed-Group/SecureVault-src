import { defineConfig } from 'vite';

export default defineConfig({
  // Base path for production build
  base: './',
  
  // Public directory for static assets
  publicDir: 'public',
  
  // Development server configuration
  server: {
    port: 3000,
    open: true
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'crypto-js',
      'dexie',
      'marked',
      'highlight.js'
    ]
  }
}); 