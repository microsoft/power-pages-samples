import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // esbuild 0.28.1 (security patch) regressed destructuring lowering for Vite's
  // default browser targets; mark it supported so the production build succeeds.
  esbuild: {
    supported: {
      destructuring: true,
    },
  },
}) 