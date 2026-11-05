import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Split node_modules into stable vendor chunks. Order matters: the most specific
// matches come first. Griffel gets its own chunk because both @fluentui/react-icons
// and the Fluent component packages depend on it; keeping it separate avoids a
// circular import between the "fluent" and "fluent-icons" chunks.
function vendorChunk(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined
  const path = id.replace(/\\/g, '/')
  if (/\/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|cookie|set-cookie-parser)\//.test(path)) {
    return 'react-vendor'
  }
  if (/\/node_modules\/(@fluentui\/(react-charts|chart-utilities)|d3-[^/]+|internmap)\//.test(path)) {
    return 'charts'
  }
  if (path.includes('/node_modules/@fluentui/react-icons/')) return 'fluent-icons'
  if (/\/node_modules\/(@griffel\/[^/]+|@emotion\/hash|stylis|rtl-css-js|tslib)\//.test(path)) return 'griffel'
  // Low-level Fluent infrastructure (theme, context, focus management, positioning, motion).
  // None of these import the component packages, so the split is acyclic.
  if (
    /\/node_modules\/(@fluentui\/(react-utilities|react-shared-contexts|react-theme|tokens|react-jsx-runtime|react-tabster|react-positioning|react-portal|react-motion|react-context-selector|keyboard-keys|priority-overlay|react-aria)|tabster|keyborg|@floating-ui\/[^/]+|@swc\/helpers|use-sync-external-store|use-disposable|embla-carousel[^/]*)\//.test(
      path,
    )
  ) {
    return 'fluent-core'
  }
  return 'fluent'
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Generated deployment output, never app source. Watching it makes Vite full-reload every open page whenever a
    // build, `pac pages` sync or upload rewrites it, which silently discards in-memory drafts.
    watch: { ignored: ['**/.powerpages-site/**', '**/dist/**'] },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: vendorChunk,
        // Alphanumeric-only hashes so bundle names never end in "-" or "_"
        // (e.g. "Form-CgzVmEj_.js"); keeps names clean for Power Pages web-files.
        hashCharacters: 'base36',
      },
    },
  },
})
