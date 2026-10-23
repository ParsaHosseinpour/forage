import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      // A new version is announced with an "Update ready" toast instead of
      // silently swapping code under someone who is mid-task.
      registerType: 'prompt',
      injectRegister: false,            // registered from React (PwaUpdater)
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Forage',
        short_name: 'Forage',
        description: 'Log what is in your fridge and find recipes you can cook with it.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#FFD23F',
        background_color: '#FAFAF7',
        lang: 'en',
        categories: ['food', 'lifestyle'],
        icons: [
          { src: '/icon-192.png',          sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png',          sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Fridge',  url: '/fridge',   icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
          { name: 'Recipes', url: '/recipes',  icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
          { name: 'Planner', url: '/schedule', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        // The app shell (HTML, JS, CSS, icons) is precached so the site opens offline.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        // Deliberately NOT cached: Supabase API and auth responses (stale or
        // per-user data is worse than none) and recipe photos from other
        // hosts (opaque responses are costly to store).
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
})
