// VERSION: Vite 8 + Tailwind v4 + React 19
// DO NOT use old v3 Tailwind syntax in this project
// DO NOT use rollupOptions (use rolldownOptions)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'DailyCoach AI',
        short_name: 'DailyCoach',
        theme_color: '#1E293B',
        background_color: '#0F172A',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      }
    })
  ],
  optimizeDeps: {
    rolldownOptions: {
      // Setup rolldownOptions specific to Vite 8 if needed
    }
  }
});
