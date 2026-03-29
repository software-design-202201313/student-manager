import { defineConfig } from 'vite';

export default defineConfig({
  // Keep plugins empty to avoid requiring @vitejs/plugin-react in environments
  // where dev dependencies are not installed. Vite+esbuild still builds TSX.
  plugins: [],
  server: {
    host: 'localhost',
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: 'src/test/setup.ts',
    exclude: ['e2e/**/*', 'node_modules/**/*'],
  },
});
