import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const stripBundleTrailingWhitespace = {
  name: 'strip-bundle-trailing-whitespace',
  enforce: 'post' as const,
  renderChunk(code: string) {
    // Zod's generated parser source contains whitespace-only lines inside template literals.
    // Strip their trailing spaces so committed Power Pages bundles pass git diff --check.
    const stripped = code.replace(/[ \t]+$/gm, '')
    return stripped === code ? null : { code: stripped, map: null }
  },
}

export default defineConfig({
  plugins: [react(), stripBundleTrailingWhitespace],
  build: {
    outDir: 'dist',
  },
})
