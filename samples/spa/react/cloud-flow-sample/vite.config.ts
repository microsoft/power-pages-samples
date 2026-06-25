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
        // Content-hashed filenames (e.g. index-a1b2c3d4.js). Each build produces
        // a new URL, so re-uploading after changing FLOW_ID never serves a stale
        // cached bundle. `bundleFilePatterns` in powerpages.config.json matches
        // these with index-*.js / index-*.css.
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
})
