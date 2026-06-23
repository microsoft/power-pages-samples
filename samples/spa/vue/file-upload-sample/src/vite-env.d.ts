/// <reference types="vite/client" />

// Lets TypeScript understand `import App from './App.vue'`.
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
