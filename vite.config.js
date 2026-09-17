import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Фронтенд живе у web/, збірка кладеться в public/, звідки її віддає Express.
export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    // API працює окремо: npm run dev (порт з .env, за замовчуванням 3000)
    proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3000' },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.{js,jsx}'],
    setupFiles: ['src/testing/setup.js'],
  },
});
