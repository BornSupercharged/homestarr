import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // Proxy /api requests to our backend server running on port 5050
      '/api': {
        target: 'http://localhost:5050', // Your backend server address
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, '') // Optional: remove /api prefix if backend doesn't expect it
      }
    }
  }
})