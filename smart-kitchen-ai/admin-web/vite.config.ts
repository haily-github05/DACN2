import { defineConfig } from 'vite';

const proxy = {
  '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
  '/uploads': { target: 'http://127.0.0.1:3000', changeOrigin: true },
};
export default defineConfig({ server: { proxy }, preview: { proxy } });
