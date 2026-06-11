import { useEffect, useRef } from 'react'
import { isAuthenticated, fetchAntiForgeryToken } from '../services/authService'

// Default Power Pages session is 24 hours. Adjust if Authentication/ApplicationCookie/ExpireTimeSpan
// is customized for this site.
const SESSION_EXPIRE_MS = 24 * 60 * 60 * 1000

export function useSessionKeepAlive({
  intervalMs = Math.min(SESSION_EXPIRE_MS / 3, 15 * 60 * 1000),
  idleTimeoutMs = Math.min(SESSION_EXPIRE_MS * 0.9, 30 * 60 * 1000),
  onSessionExpired,
}: {
  intervalMs?: number
  idleTimeoutMs?: number
  onSessionExpired?: () => void
} = {}) {
  const lastActivityRef = useRef(Date.now())

  useEffect(() => {
    const isDev =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    if (isDev) return

    function onActivity() {
      lastActivityRef.current = Date.now()
    }

    window.addEventListener('mousemove', onActivity, { passive: true })
    window.addEventListener('keydown', onActivity, { passive: true })
    window.addEventListener('touchstart', onActivity, { passive: true })
    window.addEventListener('scroll', onActivity, { passive: true })

    const timer = setInterval(async () => {
      if (!isAuthenticated()) return
      if (document.visibilityState === 'hidden') return
      if (Date.now() - lastActivityRef.current > idleTimeoutMs) return

      try {
        await fetchAntiForgeryToken()
      } catch {
        if (onSessionExpired) onSessionExpired()
      }
    }, intervalMs)

    return () => {
      clearInterval(timer)
      window.removeEventListener('mousemove', onActivity)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('touchstart', onActivity)
      window.removeEventListener('scroll', onActivity)
    }
  }, [intervalMs, idleTimeoutMs, onSessionExpired])
}
