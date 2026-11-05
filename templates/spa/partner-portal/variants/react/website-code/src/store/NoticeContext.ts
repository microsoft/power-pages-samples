import { createContext } from 'react'
import type { Notice } from './AppStore'

/**
 * The page notice changes on every show/dismiss, so it lives apart from AppContext: only the notice region
 * re-renders for it, not every screen that reads `db`/`session`.
 */
export const NoticeContext = createContext<Notice | null>(null)
