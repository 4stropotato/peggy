import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Use root path in local dev; keep GitHub Pages base in production builds.
  base: process.env.NODE_ENV === 'production' ? '/baby-prep-tracker/' : '/',
})
