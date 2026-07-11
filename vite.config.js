import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const buildSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'dev'

export default defineConfig({
  define: {
    __APP_BUILD_SHA__: JSON.stringify(buildSha),
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
