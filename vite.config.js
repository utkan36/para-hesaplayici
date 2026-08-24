import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Finans & Yatırım Simülatörü',
        short_name: 'FinansSim',
        description: 'Enflasyon ve Yatırım Simülatörü',
        theme_color: '#4f46e5',
        background_color: '#0f172a',
        display: 'standalone'
      }
    })
  ]
})