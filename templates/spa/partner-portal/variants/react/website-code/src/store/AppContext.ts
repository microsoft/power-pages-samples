import { createContext } from 'react'
import type { AppContextValue } from './AppStore'

export const AppContext = createContext<AppContextValue | null>(null)
