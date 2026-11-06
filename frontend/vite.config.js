import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // During development, forward /api/tasks to http://localhost:5000/tasks.
      // nginx does the same job in Docker.
      '/api': {
        target: 'http://localhost:5000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
