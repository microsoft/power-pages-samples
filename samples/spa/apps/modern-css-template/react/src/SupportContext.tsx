import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { articles as sampleArticles, initialCases, initialProfile, type Article, type SupportCase } from './data'
import { SupportApiError, supportApi, type CaseActivity, type CaseDto, type CatalogItem, type KnowledgeDto, type ProfileDto } from './services/supportApi'
import { useCaseRealtime, type CaseSnapshot } from './useCaseRealtime'

type Notification = { id: string; caseId: string; title: string; detail: string; read: boolean; kind?: 'reply' }
type LocalDocument = { name: string; size: number; type: string }
const configuredMode: string | undefined = import.meta.env.VITE_SUPPORT_MODE
if (configuredMode && !['demo', 'dataverse'].includes(configuredMode)) throw new Error('VITE_SUPPORT_MODE must be demo or dataverse.')
export const isDemo = configuredMode ? configuredMode === 'demo'
  : import.meta.env.DEV && new URLSearchParams(location.search).get('data') !== 'dataverse'
export function errorMessage(error: unknown): string { return error instanceof Error ? error.message : 'The operation could not be completed. Please try again.' }
export function signInHref(returnPath = '/') { return `/SignIn?returnUrl=${encodeURIComponent(returnPath)}` }
export const signOutHref = '/Account/Login/LogOff?returnUrl=%2F'
function accessLost(error: unknown) {
  return error instanceof SupportApiError && ['UNAUTHENTICATED', 'FORBIDDEN', 'INVALID_RESPONSE'].includes(error.code)
}
function caseVersion(item: CaseDto) {
  return JSON.stringify([item.updated, item.number, item.title, item.description, item.state, item.status])
}
function commentVersion(item: CaseActivity['comments'][number]) { return JSON.stringify([item.body, item.created, item.author]) }
function activityVersion(item: CaseActivity) {
  return JSON.stringify([
    item.comments.map(comment => [comment.id, commentVersion(comment)]).sort(),
    item.documents.map(document => [document.id, document.name, document.size, document.type]).sort(),
  ])
}
type CaseState = Pick<SupportCase, 'status' | 'statusLabel' | 'statusNote' | 'nextStep'>
// Maps the incident statecode/statuscode (status reason) already returned by the case query.
function caseState(item: CaseDto): CaseState {
  if (item.state === 1) return { status: 'resolved', statusLabel: 'Resolved', statusNote: 'Support resolved this case. Replies and uploads are closed.', nextStep: 'Case resolved' }
  if (item.state === 2) return item.status === 2000
    ? { status: 'cancelled', statusLabel: 'Merged', statusNote: 'This case was merged into another case by support.', nextStep: 'Case merged' }
    : { status: 'cancelled', statusLabel: 'Cancelled', statusNote: 'This case was cancelled. Replies and uploads are closed.', nextStep: 'Case cancelled' }
  if (item.status === 3) return { status: 'action', statusLabel: 'Action needed', statusNote: 'Support needs more details from you before they can continue.', nextStep: 'Reply with the details support asked for' }
  if (item.status === 4) return { status: 'progress', statusLabel: 'Support is investigating', statusNote: 'Support is researching this case. Replies from the team appear in the timeline.', nextStep: 'No action is required from you' }
  if (item.status === 2) return { status: 'progress', statusLabel: 'On hold', statusNote: 'This case is on hold. Support will post in the timeline when work resumes.', nextStep: 'No action is required from you' }
  return { status: 'progress', statusLabel: 'In progress', statusNote: 'Support is working on this case. Replies from the team appear in the timeline.', nextStep: 'No action is required from you' }
}
function caseRecord(item: CaseDto): SupportCase {
  return {
    id: item.id, number: item.number, title: item.title, original: item.description, ...caseState(item),
    summary: item.description, owner: 'Assignment is managed by support', opened: item.created, updated: item.updated, timeline: [],
  }
}
function articleRecord(item: KnowledgeDto): Article {
  const template = document.createElement('template')
  template.innerHTML = item.content
  template.content.querySelectorAll('script,style,noscript,template,iframe,object').forEach(node => node.remove())
  template.content.querySelectorAll('p,div,li,h1,h2,h3,h4,br').forEach(node => node.append('\n'))
  const content = template.content.textContent?.trim() ?? ''
  return {
    id: item.id, number: item.number, title: item.title, description: item.description, content,
    category: 'general', label: 'Knowledge', keywords: `${item.title} ${item.description} ${content}`,
    minutes: Math.max(1, Math.ceil(content.split(/\s+/).length / 200)), applies: [], symptoms: [], steps: [], notes: [], escalation: '',
  }
}
function profileRecord(item: ProfileDto): typeof initialProfile {
  return { name: `${item.firstName} ${item.lastName}`.trim() || 'Your account', email: item.email, phone: item.phone, address: item.address, timezone: 'America/Los_Angeles', channel: 'Message' }
}
function useSupportState() {
  const [cases, setCases] = useState<SupportCase[]>(isDemo ? initialCases : [])
  const [articles, setArticles] = useState<Article[]>(isDemo ? sampleArticles : [])
  const [profile, setProfile] = useState(isDemo ? initialProfile : { ...initialProfile, name: 'Your account', email: '', phone: '', address: '' })
  const [profileData, setProfileData] = useState<ProfileDto | null>(null)
  const [products, setProducts] = useState<CatalogItem[]>([])
  const [categories, setCategories] = useState<CatalogItem[]>([])
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>(isDemo ? 'ready' : 'loading')
  const [loadError, setLoadError] = useState('')
  const [authRequired, setAuthRequired] = useState(false)
  // Published knowledge can be read without a portal contact; private case data cannot.
  const [publicKnowledge, setPublicKnowledge] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle')
  const generation = useRef(0)
  const caseSnapshot = useRef<CaseSnapshot>({ contactId: null, records: [], activities: new Map(), quarantined: new Set(), revision: 0, writes: 0 })
  const [activityVersions, setActivityVersions] = useState<Record<string, number>>({})
  const [preferences, setPreferences] = useState([true, true, true, false])
  const preferencesRef = useRef(preferences)
  preferencesRef.current = preferences
  const [saved, setSaved] = useState<string[]>([])
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [documents, setDocuments] = useState<Record<string, LocalDocument[]>>({})
  const [issueOpen, setIssueOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantRequest, setAssistantRequest] = useState({ question: '', send: false, sequence: 0 })
  // Demo mode simulates portal sign-in so both shell states can be previewed; Dataverse mode uses the portal session.
  const [demoSignedIn, setDemoSignedIn] = useState(true)
  const [demoSignIn, setDemoSignIn] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>(isDemo ? [
    { id: 'identity', caseId: initialCases[0].id, title: 'Support replied to your event case', detail: 'Review the evidence requested for your ticket-name change.', read: false },
    { id: 'gateway', caseId: initialCases[1].id, title: 'Gateway investigation updated', detail: 'A new firmware investigation update is available.', read: false },
  ] : [])
  const [caseAnnouncement, setCaseAnnouncement] = useState({ sequence: 0, count: 0 })
  const clearPrivateData = useCallback(() => {
    generation.current++
    caseSnapshot.current = { contactId: null, records: [], activities: new Map(), quarantined: new Set(), revision: caseSnapshot.current.revision + 1, writes: 0 }
    setActivityVersions({})
    setCases([]); setArticles([]); setProducts([]); setCategories([]); setProfileData(null); setNotifications([])
    setPublicKnowledge('idle')
    setCaseAnnouncement({ sequence: 0, count: 0 })
    setProfile({ ...initialProfile, name: 'Your account', email: '', phone: '', address: '' })
  }, [])
  const applyCaseRefresh = useCallback((records: CaseDto[]) => {
    const previous = new Map(caseSnapshot.current.records.map(item => [item.id, item]))
    records = records.filter(item => !caseSnapshot.current.quarantined.has(item.id)).map(item => {
      const old = previous.get(item.id)
      return old && Date.parse(old.updated) > Date.parse(item.updated) ? old : item
    })
    const changed = records.filter(item => {
      const old = previous.get(item.id)
      return old && caseVersion(old) !== caseVersion(item)
    })
    const authorized = new Set(records.map(item => item.id))
    caseSnapshot.current.records = records
    for (const id of caseSnapshot.current.activities.keys()) {
      if (!authorized.has(id)) caseSnapshot.current.activities.delete(id)
    }
    setActivityVersions(current => Object.fromEntries(Object.entries(current).filter(([id]) => authorized.has(id))))
    setCases(items => {
      const displayed = new Map(items.map(item => [item.id, item]))
      return records.map(item => {
        const old = previous.get(item.id), existing = displayed.get(item.id)
        return old && existing && caseVersion(old) === caseVersion(item) ? existing : caseRecord(item)
      })
    })
    const updates: Notification[] = preferencesRef.current[0] ? changed.map(item => ({
      id: item.id, caseId: item.id, title: `${item.number}: ${item.title}`,
      detail: previous.get(item.id)?.state !== item.state || previous.get(item.id)?.status !== item.status
        ? `Case status changed to ${caseState(item).statusLabel}.`
        : 'Case details updated. Open the case to review the latest information.',
      read: false,
    })) : []
    setNotifications(items => [
      ...updates,
      ...items.filter(item => authorized.has(item.caseId) && !updates.some(update => update.id === item.id)),
    ])
    if (updates.length) setCaseAnnouncement(value => ({ sequence: value.sequence + 1, count: updates.length }))
  }, [])
  const caseRefreshFailed = useCallback((error: unknown, caseId?: string) => {
    if (accessLost(error)) {
      clearPrivateData()
      setLoadError(errorMessage(error)); setAuthRequired(error instanceof SupportApiError && error.code === 'UNAUTHENTICATED')
      setPhase('error')
    } else if (caseId && error instanceof SupportApiError && error.code === 'NOT_FOUND') {
      caseSnapshot.current.quarantined.add(caseId)
      applyCaseRefresh(caseSnapshot.current.records)
    }
  }, [clearPrivateData, applyCaseRefresh])
  const applyActivityRefresh = useCallback((activities: Map<string, CaseActivity>) => {
    const authorized = new Map(caseSnapshot.current.records.map(item => [item.id, item]))
    const changed: string[] = [], updates: Notification[] = []
    for (const [id, activity] of activities) {
      const record = authorized.get(id)
      if (!record) continue
      const previous = caseSnapshot.current.activities.get(id)
      caseSnapshot.current.activities.set(id, activity)
      if (!previous || activityVersion(previous) === activityVersion(activity)) continue
      changed.push(id)
      const comments = new Map(previous.comments.map(item => [item.id, item]))
      const supportChanged = activity.comments.some(item => {
        const old = comments.get(item.id)
        return item.author === 'Support' && (!old || commentVersion(old) !== commentVersion(item))
      })
      if (supportChanged && preferencesRef.current[1]) updates.push({
        id: `reply:${id}`, caseId: id, kind: 'reply', title: `${record.number}: ${record.title}`,
        detail: 'A support reply was added or updated. Open the case to read the customer conversation.', read: false,
      })
    }
    if (changed.length) setActivityVersions(current => {
      const next = { ...current }
      for (const id of changed) next[id] = (next[id] ?? 0) + 1
      return next
    })
    if (updates.length) {
      setNotifications(items => [...updates, ...items.filter(item => !updates.some(update => update.id === item.id))])
      setCaseAnnouncement(value => ({ sequence: value.sequence + 1, count: updates.length }))
    }
  }, [])
  const realtime = useCaseRealtime(!isDemo && phase === 'ready' ? profileData?.id : undefined, caseSnapshot, applyCaseRefresh, applyActivityRefresh, caseRefreshFailed)
  const refresh = useCallback(async () => {
    if (isDemo) return
    clearPrivateData()
    const current = ++generation.current
    setPhase('loading'); setLoadError(''); setAuthRequired(false)
    try {
      const identity = await supportApi.profile().catch((failure: unknown) => {
        // Private sites return 403 to visitors who passed the site gate but have not signed in as a portal contact.
        if (failure instanceof SupportApiError && failure.code === 'FORBIDDEN') throw new SupportApiError('Sign in to access your support records.', 'UNAUTHENTICATED', failure.status)
        throw failure
      })
      if (current !== generation.current) return
      const [records, knowledge, catalogProducts, catalogCategories] = await Promise.all([
        supportApi.cases(identity.id), supportApi.articles(), supportApi.products(), supportApi.categories(),
      ])
      if (current !== generation.current) return
      caseSnapshot.current = { contactId: identity.id, records, activities: new Map(), quarantined: new Set(), revision: caseSnapshot.current.revision + 1, writes: 0 }
      setProfileData(identity); setProfile(profileRecord(identity))
      setCases(records.map(caseRecord)); setArticles(knowledge.map(articleRecord))
      setProducts(catalogProducts); setCategories(catalogCategories); setPhase('ready')
    } catch (error) {
      if (current !== generation.current) return
      clearPrivateData()
      setLoadError(errorMessage(error)); setAuthRequired(error instanceof SupportApiError && error.code === 'UNAUTHENTICATED')
      setPhase('error')
    }
  }, [clearPrivateData])
  useEffect(() => { void refresh(); return () => { generation.current++ } }, [refresh])
  useEffect(() => {
    if (isDemo || phase !== 'error' || !authRequired || publicKnowledge !== 'idle') return
    const current = generation.current
    setPublicKnowledge('loading')
    supportApi.articles().then(items => {
      if (current !== generation.current) return
      setArticles(items.map(articleRecord)); setPublicKnowledge('ready')
    }, () => { if (current === generation.current) setPublicKnowledge('unavailable') })
  }, [phase, authRequired, publicKnowledge])
  const mutate = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    const current = generation.current
    try {
      const result = await operation()
      if (current !== generation.current) throw new SupportApiError('Your support workspace changed. Reload before trying again.', 'STALE_SESSION')
      return result
    } catch (error) {
      if (current === generation.current && error instanceof SupportApiError && error.code === 'UNAUTHENTICATED') {
        clearPrivateData()
        setLoadError(error.message); setAuthRequired(true); setPhase('error')
      }
      throw error
    }
  }, [clearPrivateData])
  async function writeCase(operation: () => Promise<CaseDto>, create = false) {
    const current = generation.current
    caseSnapshot.current.revision++
    caseSnapshot.current.writes++
    try {
      const saved = await mutate(operation)
      const records = caseSnapshot.current.records
      // A local save advances the baseline; an older in-flight list cannot undo it.
      caseSnapshot.current.records = create ? [saved, ...records.filter(item => item.id !== saved.id)]
        : records.map(item => item.id === saved.id ? saved : item)
      caseSnapshot.current.records = caseSnapshot.current.records.filter(item => !caseSnapshot.current.quarantined.has(item.id))
      setCases(caseSnapshot.current.records.map(caseRecord))
      return caseRecord(saved)
    } finally {
      if (current === generation.current) {
        caseSnapshot.current.revision++
        caseSnapshot.current.writes--
        realtime.requestRefresh.current()
      }
    }
  }
  async function submitCase(description: string, impact: string, productId?: string) {
    if (isDemo) return createDraft(description, impact)
    const item = await writeCase(() => {
      if (!profileData) throw new SupportApiError('Sign in to create a support case.', 'UNAUTHENTICATED')
      return supportApi.createCase(profileData.id, description, impact, productId)
    }, true)
    return item.id
  }
  async function saveProfile(input: Pick<ProfileDto, 'firstName' | 'lastName' | 'phone'>) {
    const item = await mutate(() => supportApi.saveProfile(input))
    if (item.id !== profileData?.id) { await refresh(); return }
    setProfileData(item); setProfile(profileRecord(item))
  }
  async function updateCase(id: string, title: string, description: string) {
    return writeCase(() => supportApi.updateCase(id, title, description))
  }
  async function saveArticleFeedback(id: string, label: string) {
    if (!isDemo) await mutate(() => supportApi.articleFeedback(id, label === 'Yes, helpful'))
    setFeedback(current => ({ ...current, [id]: label }))
  }
  function openAssistant(question = '', send = false) {
    setAssistantRequest(current => ({ question, send, sequence: current.sequence + 1 }))
    setAssistantOpen(true)
  }
  const signedIn = isDemo ? demoSignedIn : phase === 'ready'
  const signedOut = isDemo ? !demoSignedIn : phase === 'error' && authRequired
  const knowledgeReady = isDemo || phase === 'ready' || (signedOut && publicKnowledge === 'ready')
  function completeDemoSignIn() { setDemoSignedIn(true); setDemoSignIn(null) }
  function demoSignOut() { setAssistantOpen(false); setIssueOpen(false); setDemoSignedIn(false) }
  function createDraft(description: string, impact: string) {
    const id = `DRAFT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
    const now = new Date().toISOString()
    const draft: SupportCase = {
      id, title: description.split('\n')[0].slice(0, 100), status: 'draft', summary: description,
      nextStep: 'Not submitted: connect a support backend to send this draft.', owner: 'You - browser-tab draft',
      opened: now, updated: now, original: `${description}\n\nImpact: ${impact}`,
      timeline: [{ title: 'Local draft prepared', body: 'No support request has been sent. This draft is kept only until this preview reloads.', date: now, author: 'You', kind: 'action' }],
    }
    setCases(items => [draft, ...items])
    return id
  }
  function toggleSaved(id: string) { setSaved(items => items.includes(id) ? items.filter(item => item !== id) : [...items, id]) }
  return {
    isDemo, phase, loadError, authRequired, refresh, articles, products, categories, profileData, saveProfile, submitCase, updateCase, saveArticleFeedback, mutate,
    cases, profile, setProfile, preferences, setPreferences, saved, toggleSaved, feedback, setFeedback, documents, setDocuments,
    issueOpen, setIssueOpen, assistantOpen, setAssistantOpen, assistantRequest, openAssistant,
    signedIn, signedOut, knowledgeReady, publicKnowledge, demoSignIn, setDemoSignIn, completeDemoSignIn, demoSignOut,
    notifications, setNotifications, createDraft, realtime, caseAnnouncement, activityVersions,
  }
}
type SupportState = ReturnType<typeof useSupportState>
const SupportContext = createContext<SupportState | null>(null)
export function SupportProvider({ children }: { children: ReactNode }) {
  return <SupportContext.Provider value={useSupportState()}>{children}</SupportContext.Provider>
}
export function useSupport() {
  const context = useContext(SupportContext)
  if (!context) throw new Error('Support components require SupportProvider.')
  return context
}
