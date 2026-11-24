import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { SupportApiError, supportApi, type CaseActivity, type CaseDto } from './services/supportApi'

type Subscription = { unsubscribe: () => void }
type Subscribe = (tables: string[], callback: () => void) => Subscription
type PagesClient = { data?: { subscribeToChanges?: Subscribe }; realtime?: { subscribe?: Subscribe } }

// Current Client API builds expose data.subscribeToChanges; earlier preview builds exposed realtime.subscribe.
function findSubscribe(pages: PagesClient): Subscribe | undefined {
  if (pages.data?.subscribeToChanges) return pages.data.subscribeToChanges.bind(pages.data)
  return pages.realtime?.subscribe ? pages.realtime.subscribe.bind(pages.realtime) : undefined
}
declare global {
  interface Window {
    Microsoft?: { PowerPages?: { onPagesClientApiReady?: (callback: (pages: PagesClient) => void) => void | Promise<void> } }
  }
}

export type CaseSnapshot = { contactId: string | null; records: CaseDto[]; activities: Map<string, CaseActivity>; quarantined: Set<string>; revision: number; writes: number }

export function useCaseRealtime(
  contactId: string | undefined,
  snapshot: RefObject<CaseSnapshot>,
  apply: (records: CaseDto[]) => void,
  applyActivity: (records: Map<string, CaseActivity>) => void,
  failed: (error: unknown, caseId?: string) => void,
) {
  const [state, setState] = useState<'waiting' | 'unavailable' | 'subscribed' | 'polling'>('unavailable')
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const requestRefresh = useRef<() => void>(() => {})
  const requestRetry = useRef<() => void>(() => {})
  const retry = useCallback(() => requestRetry.current(), [])

  useEffect(() => {
    let cancelled = false, registered = false, running = false, pending = false, pendingReplies = false, retryReplies = false
    let polling = false, pollDelay = 60_000
    let timer: ReturnType<typeof setTimeout> | undefined
    let pollTimer: ReturnType<typeof setTimeout> | undefined
    const subscriptions: Subscription[] = []
    const current = () => !cancelled && snapshot.current.contactId === contactId
    const enabled = () => polling || subscriptions.length > 0
    const canPoll = () => document.visibilityState !== 'hidden' && navigator.onLine
    function report(error: unknown, caseId?: string) {
      if (!current()) return
      pollDelay = Math.min(pollDelay * 2, 300_000)
      setError(error instanceof Error ? error.message : 'The case update service is unavailable.')
      failed(error, caseId)
    }
    function schedulePoll() {
      if (polling && current() && canPoll() && pollTimer === undefined) {
        pollTimer = setTimeout(() => { pollTimer = undefined; queue(true) }, pollDelay)
      }
    }
    function queue(replies = false) {
      if (!current() || !enabled() || (polling && !canPoll())) return
      if (pollTimer !== undefined) { clearTimeout(pollTimer); pollTimer = undefined }
      pending = true
      pendingReplies ||= replies
      if (!running && timer === undefined && snapshot.current.writes === 0) {
        timer = setTimeout(() => { timer = undefined; void read() }, 100)
      }
    }
    function resumePolling() {
      if (!polling) return
      if (canPoll()) queue(true)
      else {
        if (pollTimer !== undefined) { clearTimeout(pollTimer); pollTimer = undefined }
        if (timer !== undefined) { clearTimeout(timer); timer = undefined }
      }
    }
    function startPolling() {
      polling = true
      setState('polling')
      queue(true)
    }
    async function read() {
      if (!current() || !contactId || !enabled() || snapshot.current.writes > 0 || (polling && !canPoll())) return
      pending = false
      const readReplies = polling || pendingReplies || retryReplies
      pendingReplies = false
      running = true
      const revision = snapshot.current.revision
      const fresh = () => current() && revision === snapshot.current.revision
      function repeat() { pending = true; pendingReplies ||= readReplies }
      try {
        // Events are invalidations only. Read the complete, ownership-validated personal list.
        const records = await supportApi.cases(contactId)
        if (!current()) return
        if (!fresh()) { repeat(); return }
        apply(records)
        const ids = [...new Set(records.map(item => item.id))].filter(id => readReplies || !snapshot.current.activities.has(id))
        const activities = new Map<string, CaseActivity>()
        const missing = new Set<string>()
        let index = 0, scanFailed = false
        // Scoped grants may omit IDs. Scan only the freshly authorized cases, at most three at a time.
        await Promise.all(Array.from({ length: Math.min(3, ids.length) }, async () => {
          while (index < ids.length && fresh() && !scanFailed) {
            const id = ids[index++]
            try {
              const activity = await supportApi.activity(id)
              if (fresh()) activities.set(id, activity)
            } catch (error) {
              if (current() && error instanceof SupportApiError && error.code === 'NOT_FOUND') {
                const firstFailure = !snapshot.current.quarantined.has(id)
                report(error, id)
                missing.add(id)
                // Revalidate once per newly quarantined case, not on every repeated denial.
                if (firstFailure) { pending = true; pendingReplies = true }
              } else {
                report(error)
                scanFailed = true
              }
            }
          }
        }))
        if (!current()) return
        if (!fresh()) { repeat(); return }
        if (scanFailed) { retryReplies = true; return }
        let restored = false
        for (const id of activities.keys()) {
          if (snapshot.current.quarantined.delete(id)) restored = true
        }
        if (restored) apply(records)
        applyActivity(activities)
        retryReplies = missing.size > 0
        if (!missing.size) { setError(''); pollDelay = 60_000 }
        setState(polling ? 'polling' : 'subscribed')
      } catch (error) {
        report(error)
        retryReplies ||= readReplies
        if (current() && !fresh()) repeat()
      } finally {
        running = false
        if (pending) queue()
        else schedulePoll()
      }
    }
    document.addEventListener('visibilitychange', resumePolling)
    window.addEventListener('online', resumePolling)
    window.addEventListener('offline', resumePolling)
    requestRefresh.current = () => { if (enabled()) queue() }
    requestRetry.current = () => {
      if (enabled()) queue(true)
      else setAttempt(value => value + 1)
    }
    setError('')
    const host = window.Microsoft?.PowerPages
    if (!contactId) setState('unavailable')
    else if (!host?.onPagesClientApiReady) startPolling()
    else {
      setState('waiting')
      try {
        const ready = host.onPagesClientApiReady(pages => {
          if (!current() || registered) return
          registered = true
          const subscribe = findSubscribe(pages)
          if (!subscribe) { startPolling(); return }
          try {
            subscriptions.push(subscribe(['incident'], () => queue()))
            subscriptions.push(subscribe(['adx_portalcomment'], () => queue(true)))
            // Close the initial-load/registration gap without alerting on unchanged records.
            queue(true)
          } catch (error) {
            subscriptions.splice(0).forEach(subscription => subscription.unsubscribe())
            setState('unavailable'); report(error)
          }
        })
        void Promise.resolve(ready).catch(report)
      } catch (error) { setState('unavailable'); report(error) }
    }
    return () => {
      cancelled = true
      requestRefresh.current = () => {}
      requestRetry.current = () => {}
      if (timer !== undefined) clearTimeout(timer)
      if (pollTimer !== undefined) clearTimeout(pollTimer)
      document.removeEventListener('visibilitychange', resumePolling)
      window.removeEventListener('online', resumePolling)
      window.removeEventListener('offline', resumePolling)
      subscriptions.forEach(subscription => subscription.unsubscribe())
    }
  }, [contactId, snapshot, apply, applyActivity, failed, attempt])

  return { state, error, retry, requestRefresh }
}
