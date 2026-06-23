import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
// Default Vite output produces hashed filenames (index-<hash>.js / index-<hash>.css),
// which is what `bundleFilePatterns` in powerpages.config.json is set to match.
export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
