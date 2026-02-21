import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'child_process'

const commitHash = execSync('git rev-parse --short HEAD').toString().trim()
const commitMessage = execSync('git log -1 --pretty=%s').toString().trim()
const buildTime = new Date().toISOString()

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __COMMIT_HASH__: JSON.stringify(commitHash),
    __COMMIT_MESSAGE__: JSON.stringify(commitMessage),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
      },
    },
  },
})
