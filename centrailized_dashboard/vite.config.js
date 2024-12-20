import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  },
  server: {
    proxy: {
      '/auth': {
        target: 'https://localhost:3001',
        changeOrigin: true,
        secure: false, // Disable SSL verification
      },
    },
  },
})