import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    rollupOptions: {
      // Explicitly mark node-fetch as external
      external: ['node-fetch', 'events', 'fs-extra', 'path', 'trash']
    }
  },
  server: {
    fs: {
      // Allow serving files from one level up the project root
      allow: ['..']
    }
  },
  // Handle Node.js dependencies properly
  ssr: {
    // List of Node.js modules to exclude from SSR bundle
    noExternal: [],
    // Explicitly mark these as external
    external: ['node-fetch', 'events', 'fs-extra', 'path', 'trash']
  }
}); 