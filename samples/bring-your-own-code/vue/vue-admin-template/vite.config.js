import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: './',
  plugins: [vue()],
  publicDir: 'static',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
