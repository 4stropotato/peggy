import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'

function safeExec(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return ''
  }
}

const BUILD_ID = safeExec('git rev-parse --short HEAD') || `dev-${Date.now().toString(36)}`
const BUILD_TIME = new Date().toISOString()

export default defineConfig({
  plugins: [react()],
  // Use root path in local dev; keep GitHub Pages base in production builds.
  base: process.env.NODE_ENV === 'production' ? '/peggy/' : '/',
  define: {
    __PEGGY_BUILD_ID__: JSON.stringify(BUILD_ID),
    __PEGGY_BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
})
