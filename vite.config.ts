// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // El SW se registra automáticamente (ver src/offline/serviceWorker.ts)
      registerType: 'autoUpdate',
      // Estrategia: cachear assets de la app para que cargue offline (PWA).
      // Los requests HTTP a la API se manejan desde IndexedDB + syncQueue,
      // no desde el SW (evitamos cachear respuestas que pueden quedar stale).
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'DevForge AI',
        short_name: 'DevForge',
        description:
          'Plataforma CASE colaborativa con IA para diseño y generación de software',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Cachear assets estáticos de la app (JS, CSS, HTML, imágenes)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // No cachear requests a la API: las maneja IndexedDB + syncQueue
        navigateFallbackDenylist: [/^\/api\//, /^\/ws\//],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        // Activar la PWA en modo dev para probar el SW
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    // Opcional: proxy para evitar CORS en dev apuntando al backend local
    // (si prefieres, puedes no usar proxy y consumir http://localhost:8000 directo)
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:8000',
    //     changeOrigin: true,
    //   },
    //   '/ws': {
    //     target: 'ws://localhost:8000',
    //     ws: true,
    //   },
    // },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar vendors grandes para mejorar el caching del navegador
          react: ['react', 'react-dom', 'react-router-dom'],
          xyflow: ['@xyflow/react'],
          dexie: ['dexie'],
        },
      },
    },
  },
});