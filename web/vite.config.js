import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to the Express server in dev.
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
