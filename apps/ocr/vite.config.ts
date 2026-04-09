import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { version } from './package.json'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'BirdNerd OCR',
        short_name: 'BirdNerd OCR',
        description: 'BirdNerd OCR workspace for bandsheet import experiments',
        theme_color: '#2f5741',
        background_color: '#f5f1e8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/birdnerd/ocr/',
        scope: '/birdnerd/ocr/',
        icons: [
          {
            src: '/birdnerd/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/birdnerd/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/birdnerd/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  base: '/birdnerd/ocr/',
})
