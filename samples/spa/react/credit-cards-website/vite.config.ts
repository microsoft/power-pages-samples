import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// Dev proxy to avoid CORS preflight when calling Power Pages _api
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/_api': {
        target: 'https://your-site-domain.powerappsportals.com',
        changeOrigin: true,
        secure: true,
        // rewrite not needed because we keep same path
      }
    }
  }
});
