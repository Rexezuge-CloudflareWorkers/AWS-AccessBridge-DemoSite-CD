import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { readFileSync, writeFileSync } from 'fs';

const spaRoutes = ['costs', 'resources', 'admin'];

export default defineConfig({
  root: 'app',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'spa-routes',
      closeBundle() {
        const outDir: string = path.resolve(__dirname, 'app/dist');
        const html: string = readFileSync(path.join(outDir, 'index.html'), 'utf-8');
        for (const route of spaRoutes) {
          writeFileSync(path.join(outDir, `${route}.html`), html);
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@/components': path.resolve(__dirname, 'components'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
