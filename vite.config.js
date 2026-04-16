import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // In dev, forward /api/chat to the local Supabase function
      '/api/chat': {
        target: 'http://localhost:54321/functions/v1/chat',
        changeOrigin: true,
        rewrite: () => '',
      },
    },
  },
})
