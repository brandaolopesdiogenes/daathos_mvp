import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/daathos': 'http://localhost:3000',
      '/history': 'http://localhost:3000',
      '/stats': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/test': 'http://localhost:3000',
      '/metrics': 'http://localhost:3000',
      '/connect': 'http://localhost:3000',
      '/connectors': 'http://localhost:3000',
      '/event-decisions': 'http://localhost:3000',
      '/events': 'http://localhost:3000',
      '/live': 'http://localhost:3000',
    },
  },
})
