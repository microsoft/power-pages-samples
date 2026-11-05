import { createContext } from 'react'

export interface DraftGuard {
  isDirty: () => boolean
  label: () => string
}

// Keep context identity independent of hot-reloaded providers and lazy form components.
export const GuardContext = createContext<Map<symbol, DraftGuard> | null>(null)
