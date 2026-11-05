/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `live` forces Dataverse, `mock` forces the in-browser seed store; unset = live when running inside Power Pages. */
  readonly VITE_DATA_MODE?: 'live' | 'mock'
  /** Power Pages cloud flow ids (adx_cloudflowconsumer processid) for the synchronous action flows. */
  readonly VITE_FLOW_SEND_INVITATION?: string
  /** Mock mode only: delay every write by this many milliseconds, to preview and test pending states. */
  readonly VITE_MOCK_LATENCY_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
