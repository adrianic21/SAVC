import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // El plugin genera el Service Worker automáticamente
      // y sabe exactamente qué archivos cachear (incluye los hashes)
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // Estrategia: pre-cachear TODO el build al instalar la app
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp,jpg}'],
        // Límite de tamaño por archivo (la imagen del logo pesa ~400KB)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Network-first para el HTML raíz, cache-first para el resto
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache' },
          },
        ],
      },

      // Manifiesto de la PWA (reemplaza public/manifest.json)
      manifest: {
        name: 'OndaVideo – Audio a Video',
        short_name: 'OndaVideo',
        description: 'Convierte audio en video con ondas sonoras. Funciona 100% sin conexión.',
        theme_color: '#0ea5e9',
        background_color: '#090d16',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        lang: 'es',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },

      // Eliminar el sw.js manual (el plugin genera el suyo propio)
      srcDir: 'public',
      filename: 'sw-manual.js', // ignorado al usar workbox
    }),
  ],

  base: './',

  build: {
    target: 'es2020',
    outDir: 'dist',
  },

  define: {
    'process.env.GEMINI_API_KEY': JSON.stringify(''),
    'process.env.APP_URL': JSON.stringify(''),
  },
});
