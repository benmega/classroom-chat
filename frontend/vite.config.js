import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.js',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
      '/message': 'http://localhost:8000',
      '/user': 'http://localhost:8000',
      '/session': 'http://localhost:8000',
      '/upload': 'http://localhost:8000',
      '/challenge': 'http://localhost:8000',
      '/ai': 'http://localhost:8000',
      '/api/admin': 'http://localhost:8000',
      '/duck_trade': 'http://localhost:8000',
      '/api/achievements': 'http://localhost:8000',
      '/notes': 'http://localhost:8000',
      '/server': 'http://localhost:8000',
      '/api/dev-login': 'http://localhost:8000',
      '/api/docs': 'http://localhost:8000',
      '/static': 'http://localhost:8000',
      '/socket.io': {
        target: 'http://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
