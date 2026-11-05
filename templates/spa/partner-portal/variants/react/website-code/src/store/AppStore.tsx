import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createSeed } from '../data/seed'
import type { Database, Role } from '../data/types'
import { buildSession, roleForContact, type Session } from '../lib/access'
import { AppContext } from './AppContext'
import { NoticeContext } from './NoticeContext'
import { DATA_MODE, mockLatencyMs, portalUser, type DataMode } from '../services/config'
import { EMPTY_DB, mergePatch } from '../services/cache'
import { loadSession, roleFromWebRoles, type CachePatch } from '../services/loaders'
import { PERMISSION_MESSAGE } from '../services/http'

const DB_KEY = 'contoso-partner-portal:db:v1'
const ROLE_KEY = 'contoso-partner-portal:role:v1'
/** Signed-in non-persona contact ({ contactId, role }); absent when a seed persona is signed in. */
const CONTACT_KEY = 'contoso-partner-portal:contact:v1'
const REFRESH_WARNING = "Your change was saved, but this page couldn't be refreshed. Reload the page to see the latest information."

interface StoredContact {
  contactId: string
  role: Role
}

/** Optional action rendered in a notice (e.g. "Undo"). The notice is dismissed before it runs. */
export interface NoticeAction {
  label: string
  onClick: () => void
}

export type NoticeTone = 'success' | 'info' | 'warning' | 'error'

export interface NoticeOptions {
  action?: NoticeAction
}

/**
 * Page-level outcome message, rendered as a Fluent MessageBar above the page content. It stays until dismissed,
 * replaced by the next notice, or the user leaves the page (see `KEEP_NOTICE` to carry it across a redirect).
 */
export interface Notice {
  id: number
  message: string
  tone: NoticeTone
  action?: NoticeAction
}

export interface AppContextValue {
  db: Database
  session: Session
  /** `live` = Dataverse (Power Pages host); `mock` = in-browser seed store (dev server, e2e). */
  mode: DataMode
  /** Live mode: false until the signed-in contact and role are loaded. Always true in mock mode. */
  sessionReady: boolean
  /** Apply an in-place change to a cloned database; persisted to localStorage for the prototype. */
  mutate: (fn: (draft: Database) => void) => void
  /** Live mode: merge a loader result into the cache. */
  applyPatch: (patch: CachePatch) => void
  /**
   * Runs a write: in mock mode applies `mock` to the local store; in live mode awaits `live()` (Web API / flow),
   * then `refresh()` if given. A failed write shows an error notice and resolves to false. A failed refresh after a
   * successful write resolves to true and shows a "reload the page" warning, so the write isn't retried.
   * Mock writes can be delayed with VITE_MOCK_LATENCY_MS to preview pending states.
   */
  perform: <T = void>(op: { mock: (draft: Database) => void; live: () => Promise<T>; refresh?: () => Promise<unknown> | void }) => Promise<boolean>
  /** Sign in as the seed persona for `role` (prototype bar); clears any signed-in custom contact. */
  setRole: (role: Role) => void
  /** Sign in as a specific contact; role is derived from their partner role. Returns false for unknown/inactive contacts. */
  signInAs: (contactId: string) => boolean
  resetData: () => void
  /**
   * Shows a page-level notice, replacing any current one. For feedback that belongs next to a control or section
   * (a Save button, a table you just changed) use `useInlineFeedback` instead. The notice itself is read with
   * `useNotice()`, so showing one doesn't re-render every screen.
   */
  notify: (message: string, tone?: NoticeTone, options?: NoticeOptions) => void
  /** Dismisses the notice with this id (no-op when it was already replaced). */
  dismissNotice: (id: number) => void
}

function load<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch {
    /* ignore corrupt storage */
  }
  return fallback()
}

export function AppProvider({ children }: { children: ReactNode }) {
  const live = DATA_MODE === 'live'
  const [db, setDb] = useState<Database>(() => {
    if (live) return EMPTY_DB
    const stored = load<Database>(DB_KEY, createSeed)
    // Reconstruct only supported collections, preserving sales edits from older mock databases.
    const retiredIds = new Set(['c-marco', 'c-kenji', 'c-dmitri'])
    const obsolete = new Set([
      ...retiredIds,
      ...stored.contacts.filter(c => retiredIds.has(c.id) || ('fieldTechnician' in c && c.fieldTechnician === true && !c.partnerRole)).map(c => c.id),
    ])
    return {
      accounts: stored.accounts.filter(a => a.id !== 'acc-adatum'),
      contacts: stored.contacts
        .filter(c => !obsolete.has(c.id))
        .map(c => {
          if (!('fieldTechnician' in c)) return c
          const { fieldTechnician, ...contact } = c
          void fieldTechnician
          return contact
        }),
      opportunities: stored.opportunities,
      dealRegistrations: stored.dealRegistrations,
      comments: stored.comments.filter(c => (c.regardingType === 'opportunity' || c.regardingType === 'contact') && !obsolete.has(c.regardingId)),
      invitations: stored.invitations.filter(i => !obsolete.has(i.contactId)),
    }
  })
  const [role, setRoleState] = useState<Role>(() => {
    if (live) return 'anonymous'
    const stored = load<Role>(ROLE_KEY, () => 'partner-admin')
    return ['anonymous', 'non-partner', 'partner-admin', 'partner-manager', 'partner-seller'].includes(stored) ? stored : 'non-partner'
  })
  // The stored contact is only honoured while the role key still matches it, so setting just the role key
  // (as tests do) always falls back to the seed persona.
  const [contactId, setContactId] = useState<string | null>(() => {
    if (live) return null
    const stored = load<StoredContact | null>(CONTACT_KEY, () => null)
    return stored && stored.role === role && db.contacts.some(c => c.id === stored.contactId && c.active) ? stored.contactId : null
  })
  const [sessionReady, setSessionReady] = useState(!live)
  const [notice, setNotice] = useState<Notice | null>(null)
  const noticeSeq = useRef(0)
  const dbRef = useRef(db)

  useEffect(() => {
    dbRef.current = db
    if (!live) localStorage.setItem(DB_KEY, JSON.stringify(db))
  }, [db, live])
  useEffect(() => {
    if (live) return
    localStorage.setItem(ROLE_KEY, JSON.stringify(role))
    if (contactId) localStorage.setItem(CONTACT_KEY, JSON.stringify({ contactId, role } satisfies StoredContact))
    else localStorage.removeItem(CONTACT_KEY)
  }, [role, contactId, live])

  const applyPatch = useCallback((patch: CachePatch) => setDb(prev => mergePatch(prev, patch)), [])

  // Live mode: the signed-in contact comes from the Power Pages user context, the role from its web roles.
  useEffect(() => {
    if (!live) return
    const controller = new AbortController()
    const cancelled = () => controller.signal.aborted
    loadSession(controller.signal)
      .then(s => {
        if (cancelled()) return
        setDb(prev => mergePatch(prev, s.patch))
        setRoleState(s.role)
        setContactId(s.contactId)
      })
      .catch(() => {
        // Keep the role from the portal web roles even if the contact read failed (pages show their own errors).
        if (!cancelled()) setRoleState(roleFromWebRoles(portalUser()?.userRoles, !!portalUser()))
      })
      .finally(() => {
        if (!cancelled()) setSessionReady(true)
      })
    return () => controller.abort()
  }, [live])

  const mutate = useCallback((fn: (draft: Database) => void) => {
    setDb(prev => {
      const draft = structuredClone(prev)
      fn(draft)
      return draft
    })
  }, [])

  const dismissNotice = useCallback((id: number) => setNotice(n => (n?.id === id ? null : n)), [])

  const notify = useCallback((message: string, tone: NoticeTone = 'success', options?: NoticeOptions) => {
    setNotice({ id: ++noticeSeq.current, message, tone, action: options?.action })
  }, [])

  const resetData = useCallback(() => {
    setDb(createSeed())
    setContactId(null)
  }, [])

  const setRole = useCallback((next: Role) => {
    setContactId(null)
    setRoleState(next)
  }, [])

  const signInAs = useCallback((id: string) => {
    const contact = dbRef.current.contacts.find(c => c.id === id)
    if (!contact || !contact.active) return false
    setContactId(id)
    setRoleState(roleForContact(contact))
    return true
  }, [])

  const session = useMemo<Session>(() => {
    if (!live) return buildSession(db, role, contactId)
    // Live: role comes from the portal web roles (UI gating only; table permissions enforce).
    if (role === 'anonymous') return { role }
    const contact = contactId ? db.contacts.find(c => c.id === contactId) : undefined
    return { role, contact, partnerId: role === 'non-partner' ? undefined : contact?.parentAccountId }
  }, [db, role, contactId, live])

  // Keep the stored role in step with the signed-in contact (e.g. their partner role changed) and drop
  // a contact that no longer resolves (deleted or deactivated). Adjusted during render rather than in an
  // effect, so the stale role is never committed and children don't render twice.
  if (!live && contactId) {
    if (session.contact?.id !== contactId) setContactId(null)
    else if (session.role !== role) setRoleState(session.role)
  }

  const perform = useCallback<AppContextValue['perform']>(
    async op => {
      if (!live) {
        const latency = mockLatencyMs()
        if (latency) await new Promise(resolve => window.setTimeout(resolve, latency))
        mutate(op.mock)
        return true
      }
      try {
        await op.live()
      } catch (e) {
        notify(e instanceof Error && e.message ? e.message : PERMISSION_MESSAGE, 'error')
        return false
      }
      try {
        await op.refresh?.()
      } catch {
        // The write succeeded: reporting it as failed would invite a duplicate retry. Shown after the caller's
        // own success notice, which this replaces.
        window.setTimeout(() => notify(REFRESH_WARNING, 'warning'), 0)
      }
      return true
    },
    [live, mutate, notify],
  )

  const value = useMemo<AppContextValue>(
    () => ({ db, session, mode: DATA_MODE, sessionReady, mutate, applyPatch, perform, setRole, signInAs, resetData, notify, dismissNotice }),
    [db, session, sessionReady, mutate, applyPatch, perform, setRole, signInAs, resetData, notify, dismissNotice],
  )

  return (
    <AppContext.Provider value={value}>
      <NoticeContext.Provider value={notice}>{children}</NoticeContext.Provider>
    </AppContext.Provider>
  )
}

/** The current page notice (only the notice region needs it). */
// eslint-disable-next-line react-refresh/only-export-components
export function useNotice(): Notice | null {
  return useContext(NoticeContext)
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
