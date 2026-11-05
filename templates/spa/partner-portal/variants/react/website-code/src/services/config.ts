import type { PowerPagesUser } from '../types/powerPages'

/** Power Pages injects the signed-in portal user here (null/undefined for anonymous visitors). */
export type PortalUser = PowerPagesUser

function portal() {
  return typeof window === 'undefined' ? undefined : window.Microsoft?.Dynamic365?.Portal
}

/** True when the SPA is served by Power Pages (the platform defines Microsoft.Dynamic365.Portal). */
export function isPowerPagesHost(): boolean {
  return typeof window !== 'undefined' && !!portal()
}

export function portalUser(): PortalUser | null {
  const u = portal()?.User
  return u && u.contactId ? u : null
}

/** Parent Entra tenant of the site (Power Pages host only). */
export function portalTenant(): string | undefined {
  return portal()?.tenant || undefined
}

export type DataMode = 'live' | 'mock'

/**
 * `live` reads and writes Dataverse through Server Logic, the Web API and cloud flows; `mock` keeps the
 * prototype's in-browser seed store (local dev server, e2e suites). VITE_DATA_MODE overrides detection.
 */
export function resolveDataMode(): DataMode {
  const forced = import.meta.env.VITE_DATA_MODE
  if (forced === 'live' || forced === 'mock') return forced
  return isPowerPagesHost() ? 'live' : 'mock'
}

export const DATA_MODE: DataMode = resolveDataMode()
export const isLive = () => DATA_MODE === 'live'

/** localStorage key that overrides VITE_MOCK_LATENCY_MS (used by browser tests). */
export const MOCK_LATENCY_KEY = 'contoso-partner-portal:mock-latency-ms'

/** Mock mode only: simulated write latency in milliseconds (0 = writes apply immediately). */
export function mockLatencyMs(): number {
  let value: string | null | undefined = import.meta.env.VITE_MOCK_LATENCY_MS
  try {
    value = localStorage.getItem(MOCK_LATENCY_KEY) ?? value
  } catch {
    /* storage unavailable */
  }
  const ms = Number(value)
  return Number.isFinite(ms) && ms > 0 ? ms : 0
}

export const FLOW_IDS = {
  sendInvitation: import.meta.env.VITE_FLOW_SEND_INVITATION ?? '',
}
