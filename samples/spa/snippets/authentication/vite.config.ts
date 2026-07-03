import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  // esbuild 0.28.1 (security patch) regressed destructuring lowering for Vite's
  // default browser targets; mark it supported so the production build succeeds.
  esbuild: {
    supported: {
      destructuring: true,
    },
  },
})
