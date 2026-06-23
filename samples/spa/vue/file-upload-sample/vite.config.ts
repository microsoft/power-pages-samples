import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
// Default Vite output names the entry bundle index-<hash>.js / index-<hash>.css,
// which matches the bundleFilePatterns in powerpages.config.json.
export default defineConfig({
  base: './',
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
