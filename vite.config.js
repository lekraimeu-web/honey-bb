import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' makes the built site work on any static host
// (Netlify, Vercel, GitHub Pages sub-folders, or just opening dist/ on a server).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
  },
})
