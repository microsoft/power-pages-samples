import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  // esbuild 0.28.1 (security patch) regressed destructuring lowering for Vite's
  // default browser targets; mark it supported so the production build succeeds.
  esbuild: {
    supported: {
      destructuring: true,
    },
  },
})
