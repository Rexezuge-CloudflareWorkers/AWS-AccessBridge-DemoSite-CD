import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/api/src'),
      'hono/http-exception': path.resolve(__dirname, './apps/api/node_modules/hono/dist/http-exception.js'),
      'hono/utils/http-status': path.resolve(__dirname, './apps/api/node_modules/hono/dist/utils/http-status.js'),
      hono: path.resolve(__dirname, './apps/api/node_modules/hono'),
      'cloudflare:workers': path.resolve(__dirname, './test/mocks/cloudflare-workers.ts'),
    },
  },
});
