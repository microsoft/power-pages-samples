import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  type AuthUser,
  type PowerPagesPortalUser,
  mapPortalUser,
  hasPortalUserDetails,
} from '../types/user'
import { getCurrentUser, logout as portalLogout } from '../services/authService'

declare global {
  interface Window {
    Microsoft?: {
      Dynamic365?: {
        Portal?: {
          User?: PowerPagesPortalUser
        }
      }
    }
  }
}

export interface AuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
  user: AuthUser | null
  signIn: (returnUrl?: string) => void
  signOut: () => void
  /** Re-reads the portal user snapshot into state — call after editing the profile. */
  refresh: () => void
}

export const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  signIn: () => {},
  signOut: () => {},
  refresh: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Reads through authService so the dev-mode mock user applies here too —
    // otherwise the SPA reports "signed out" on localhost and none of the
    // authenticated UI (profile page, AuthGate, header menu) can be exercised
    // without deploying.
    const readPortalUser = () => getCurrentUser()

    /** True if the portal user has the Authenticated Users role (not just Anonymous). */
    const isAuthenticatedRole = (pu: PowerPagesPortalUser | undefined) =>
      pu?.userRoles?.some(r => r === 'Authenticated Users') ?? false

    const detectAuth = async () => {
      let portalUser = readPortalUser()

      // Case 1: Portal user has full contact details (ideal path)
      if (portalUser && hasPortalUserDetails(portalUser)) {
        setUser(mapPortalUser(portalUser))
        setIsLoading(false)
        return
      }

      // Case 2: Portal user object exists but fields may still be loading.
      // Power Pages populates the User object asynchronously — wait briefly
      // and re-read before falling back.
      if (portalUser) {
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 200))
          portalUser = readPortalUser()
          if (portalUser && hasPortalUserDetails(portalUser)) {
            setUser(mapPortalUser(portalUser))
            setIsLoading(false)
            return
          }
        }

        // After polling, check if the user has the Authenticated role.
        // Anonymous users also have a portal user object, but their
        // userRoles won't include "Authenticated Users".
        portalUser = readPortalUser()
        if (!isAuthenticatedRole(portalUser)) {
          // Not authenticated — anonymous user
          setIsLoading(false)
          return
        }

        // Authenticated role present but identity fields still empty.
        // Extract whatever is available.
        const email = portalUser?.email || ''
        const name = portalUser?.firstName || portalUser?.fullName || email || portalUser?.userName || ''
        if (name) {
          setUser({
            id: portalUser?.contactId || '',
            displayName: name,
            initials: name.slice(0, 2).toUpperCase(),
            email,
          })
        }
        setIsLoading(false)
        return
      }

      // Case 3: Not authenticated
      setIsLoading(false)
    }

    detectAuth()
  }, [])

  const signIn = useCallback((returnUrl?: string) => {
    const url = returnUrl || window.location.pathname + window.location.search
    navigate(`/login?returnUrl=${encodeURIComponent(url)}`)
  }, [navigate])

  const signOut = useCallback(() => {
    portalLogout('/')
  }, [])

  /**
   * Re-reads the portal user snapshot into state.
   *
   * applyContactUpdateLocally mutates that snapshot in place, so mapPortalUser is
   * re-run to build a brand-new AuthUser object. Handing React the same object
   * reference would make it skip the re-render and the header would keep showing
   * the pre-save name until a full page load.
   */
  const refresh = useCallback(() => {
    const portalUser = getCurrentUser()
    if (portalUser && hasPortalUserDetails(portalUser)) {
      setUser(mapPortalUser(portalUser))
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{ isAuthenticated: !!user, isLoading, user, signIn, signOut, refresh }}
    >
      {children}
    </AuthContext.Provider>
  )
}
