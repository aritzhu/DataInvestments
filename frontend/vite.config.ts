import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import http from 'http'

const proxyAgent = new http.Agent({ keepAlive: false });

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      '/api/': {
        target: process.env.VITE_API_PROXY || 'http://localhost:3005',
        agent: proxyAgent,
      },
    },
  },
})
