import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/** Wait before showing a busy state, so actions that finish quickly don't flash. */
export const BUSY_DELAY_MS = 300
/** Once shown, keep the busy state long enough to be read. */
export const BUSY_MINIMUM_MS = 500

/**
 * Runs one async action at a time. The lock is taken synchronously, so a double click or a repeated
 * Enter is ignored even before React re-renders. `key` identifies which row or control started the
 * action (`pendingKey`), so per-row buttons can show their own pending state.
 */
export function usePendingAction() {
  const lock = useRef(false)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const run = useCallback(async <T>(action: () => Promise<T> | T, key = ''): Promise<T | undefined> => {
    if (lock.current) return undefined
    lock.current = true
    setPendingKey(key)
    try {
      return await action()
    } finally {
      lock.current = false
      setPendingKey(null)
    }
  }, [])

  return { pending: pendingKey !== null, pendingKey, run }
}

/**
 * Whether to show a busy state for `pending`: only after `BUSY_DELAY_MS`, then for at least
 * `BUSY_MINIMUM_MS`. `onShow` runs (from the timer, not during render) just before it is shown.
 */
export function useBusyIndicator(pending: boolean, onShow?: () => void) {
  const [shown, setShown] = useState(false)
  const shownAt = useRef(0)
  const onShowRef = useRef(onShow)
  useLayoutEffect(() => {
    onShowRef.current = onShow
  })

  useEffect(() => {
    if (pending) {
      if (shown) return
      const id = window.setTimeout(() => {
        onShowRef.current?.()
        shownAt.current = performance.now()
        setShown(true)
      }, BUSY_DELAY_MS)
      return () => window.clearTimeout(id)
    }
    if (!shown) return
    const remaining = BUSY_MINIMUM_MS - (performance.now() - shownAt.current)
    const id = window.setTimeout(() => setShown(false), Math.max(0, remaining))
    return () => window.clearTimeout(id)
  }, [pending, shown])

  return shown
}
