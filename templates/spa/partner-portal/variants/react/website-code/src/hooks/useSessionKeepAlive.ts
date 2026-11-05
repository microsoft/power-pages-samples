import { useEffect, useRef } from 'react'
import { AUTH_MOCK, fetchAntiForgeryToken, isAuthenticated } from '../services/authService'

/**
 * Matches the server's Authentication/ApplicationCookie/ExpireTimeSpan (not set on this site, so the
 * Power Pages default of 24 hours applies). Update both together.
 */
const SESSION_EXPIRE_MS = 24 * 60 * 60 * 1000

/**
 * SPA navigation never reaches the server, so the sliding session cookie would expire while the user is
 * active. Pings /_layout/tokenhtml while the user is signed in, the tab is visible and they were recently
 * active; stops when idle so the session can expire naturally. Live (Power Pages host) only.
 */
export function useSessionKeepAlive({
  intervalMs = Math.min(SESSION_EXPIRE_MS / 3, 15 * 60 * 1000),
  idleTimeoutMs = Math.min(SESSION_EXPIRE_MS * 0.9, 30 * 60 * 1000),
  onSessionExpired,
}: { intervalMs?: number; idleTimeoutMs?: number; onSessionExpired?: () => void } = {}) {
  const lastActivity = useRef(0)

  useEffect(() => {
    if (AUTH_MOCK) return
    lastActivity.current = Date.now()
    const onActivity = () => {
      lastActivity.current = Date.now()
    }
    const events = ['mousemove', 'keydown', 'touchstart', 'scroll'] as const
    events.forEach(e => window.addEventListener(e, onActivity, { passive: true }))
    const controller = new AbortController()
    let pending = false
    const timer = window.setInterval(async () => {
      if (pending) return
      if (!isAuthenticated() || document.visibilityState === 'hidden') return
      if (Date.now() - lastActivity.current > idleTimeoutMs) return
      pending = true
      try {
        await fetchAntiForgeryToken(controller.signal)
      } catch {
        if (!controller.signal.aborted) onSessionExpired?.()
      } finally {
        pending = false
      }
    }, intervalMs)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      events.forEach(e => window.removeEventListener(e, onActivity))
    }
  }, [intervalMs, idleTimeoutMs, onSessionExpired])
}
