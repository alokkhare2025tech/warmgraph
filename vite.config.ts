import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PORT = process.env.PORT ?? '3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the React app and the API run as two processes. Vite
    // proxies /api to the local API server so the frontend can always call
    // relative URLs — exactly as it does on Vercel in production.
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
