import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../store/AppStore'
import type { CachePatch } from './loaders'

export type LoadStatus = 'ready' | 'loading' | 'error'

export interface LiveLoad<R> {
  /** `ready` in mock mode (the seed store already holds everything). */
  status: LoadStatus
  /** Extra loader data (e.g. lookups, counts, `found`); undefined in mock mode. */
  result?: R
  error?: string
  /** Re-runs the loader (live) – call after writes; resolves when the cache is updated. No-op in mock mode. */
  reload: () => Promise<void>
}

/** A screen loader; it should pass `signal` on to its requests so they are cancelled when no longer needed. */
export type Loader<R> = (signal: AbortSignal) => Promise<R>

/**
 * Screen data loader. Live mode: runs `load` once per `key` (and on reload), merges `patch` into the cache so
 * components keep reading `db`, and exposes the rest of the result. Mock mode: does nothing.
 * Pass `key = null` to skip (e.g. until the session is ready).
 * A newer run, a key change or unmounting aborts the in-flight request and discards its result.
 */
export function useLiveLoad<R extends { patch: CachePatch }>(key: string | null, load: Loader<R>): LiveLoad<R> {
  const { mode, applyPatch, sessionReady } = useApp()
  const live = mode === 'live'
  const scope = useMemo(() => ({ key, live, sessionReady }), [key, live, sessionReady])
  const [state, setState] = useState<{ scope: typeof scope; status: LoadStatus; result?: R; error?: string }>(() => ({
    scope,
    status: live ? 'loading' : 'ready',
  }))
  if (state.scope !== scope) setState({ scope, status: live ? 'loading' : 'ready' })
  // Latest loader closure without re-running the effect on every render; synced after commit, never during render.
  const loadRef = useRef(load)
  useLayoutEffect(() => {
    loadRef.current = load
  })
  const inflight = useRef<AbortController | null>(null)
  const owner = useRef<typeof scope | null>(null)

  useLayoutEffect(() => {
    owner.current = scope
    return () => {
      owner.current = null
      inflight.current?.abort()
      inflight.current = null
    }
  }, [scope])

  const run = useCallback(async () => {
    if (!scope.live || !scope.sessionReady || scope.key === null || owner.current !== scope) return
    inflight.current?.abort()
    const controller = new AbortController()
    inflight.current = controller
    setState(s => ({ ...s, status: s.result ? s.status : 'loading', error: undefined }))
    try {
      const result = await loadRef.current(controller.signal)
      if (controller.signal.aborted) return
      applyPatch(result.patch)
      setState({ scope, status: 'ready', result })
    } catch (e) {
      if (controller.signal.aborted) return
      setState(s => ({ ...s, status: 'error', error: e instanceof Error ? e.message : 'The data could not be loaded.' }))
    } finally {
      if (inflight.current === controller) inflight.current = null
    }
  }, [scope, applyPatch])

  useEffect(() => {
    void run()
  }, [run])

  return { status: state.status, result: state.result, error: state.error, reload: run }
}

/** Wraps a loader that returns a bare patch. */
export const asLoad =
  (fn: Loader<CachePatch>): Loader<{ patch: CachePatch }> =>
  signal =>
    fn(signal).then(patch => ({ patch }))
