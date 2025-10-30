import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:8000', 
        changeOrigin: true,
        secure: false,
      }
    }
  },
  preview: {
    allowedHosts: [
      'demo-dws-git-main-1.onrender.com',
      'demo-dws-git-main.onrender.com',
      'dynamic-scheduling-frontend.onrender.com'
    ]
  }
})
