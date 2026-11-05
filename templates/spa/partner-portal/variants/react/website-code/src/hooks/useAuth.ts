import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PowerPagesUser } from '../types/powerPages'
import { useApp } from '../store/AppStore'
import { ROLE_LABELS } from '../lib/access'
import { KEEP_NOTICE } from '../lib/notice'
import { getCurrentUser, getUserDisplayName, getUserInitials, logout as serverLogout } from '../services/authService'

export interface UseAuthReturn {
  user: PowerPagesUser | undefined
  isAuthenticated: boolean
  /** Live mode: true until the signed-in contact and role have loaded. */
  isLoading: boolean
  displayName: string
  initials: string
  /** Opens the SPA sign-in page, returning to `returnUrl` afterwards. */
  login: (returnUrl?: string) => void
  logout: (returnUrl?: string) => void
}

/**
 * Signed-in user in the Power Pages shape. On the deployed site it is the platform user; in mock mode
 * (dev server, e2e) it is derived from the prototype persona so role-based UI can be exercised locally.
 */
export function useAuth(): UseAuthReturn {
  const { mode, session, sessionReady, setRole, notify } = useApp()
  const navigate = useNavigate()

  const user = useMemo<PowerPagesUser | undefined>(() => {
    if (mode === 'live') {
      const current = getCurrentUser()
      return current ? { ...current } : undefined
    }
    if (session.role === 'anonymous') return undefined
    const c = session.contact
    return {
      userName: c?.email ?? session.role,
      firstName: c?.firstName,
      lastName: c?.lastName,
      email: c?.email,
      contactId: c?.id,
      userRoles: ['Authenticated Users', ROLE_LABELS[session.role]],
    }
  }, [mode, session])

  const login = useCallback(
    (returnUrl?: string) => navigate(returnUrl && returnUrl !== '/' ? `/login?ReturnUrl=${encodeURIComponent(returnUrl)}` : '/login'),
    [navigate],
  )

  const logout = useCallback(
    (returnUrl = '/') => {
      if (mode === 'live') {
        serverLogout(returnUrl)
        return
      }
      setRole('anonymous')
      notify('You have been signed out.', 'info')
      navigate('/', KEEP_NOTICE)
    },
    [mode, navigate, setRole, notify],
  )

  return {
    user,
    isAuthenticated: !!user,
    isLoading: !sessionReady,
    displayName: getUserDisplayName(user),
    initials: getUserInitials(user),
    login,
    logout,
  }
}
