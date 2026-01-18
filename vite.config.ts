import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite'; // <--- 1. IMPORT THIS

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <--- 2. ADD THIS BACK (This was missing!)
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false // Keep PWA disabled in dev to avoid caching issues
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Citizens of Light Ops',
        short_name: 'CLC Ops',
        description: 'Ministry Operations & Management Platform',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});