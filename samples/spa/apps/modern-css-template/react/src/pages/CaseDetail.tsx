import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { errorMessage, useSupport } from '../SupportContext'
import { supportApi, type CaseActivity } from '../services/supportApi'
import { formatDate, formatNumber, statusLabels, type SupportCase } from '../data'
import Field, { useUiDirection } from '../components/Field'
import { usePageTitle } from '../usePageTitle'

const tabs = ['Timeline', 'Documents', 'Original request'] as const
export default function CaseDetail() {
  const { isDemo } = useSupport()
  return isDemo ? <DemoCaseDetail /> : <ConnectedCaseDetail />
}

function ConnectedCaseDetail() {
  const { id } = useParams()
  const { cases, updateCase, mutate, activityVersions, openAssistant, setIssueOpen } = useSupport()
  const location = useLocation()
  const record = cases.find(item => item.id === id)
  usePageTitle(record?.title ?? 'Case not available')
  const [tab, setTab] = useState(0)
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'action' | 'message'>('all')
  const [activity, setActivity] = useState<CaseActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [reply, setReply] = useState('')
  const [title, setTitle] = useState(record?.title ?? '')
  const [description, setDescription] = useState(record?.original ?? '')
  const [editBase, setEditBase] = useState({ title: record?.title ?? '', description: record?.original ?? '' })
  const dirty = title !== editBase.title || description !== editBase.description
  const detailsChanged = dirty && (record?.title !== editBase.title || record?.original !== editBase.description)
  const activityGeneration = useRef(0)
  const conversationNavigation = useRef<string | null>(null)
  const caseContent = useRef<HTMLDivElement | null>(null)
  const removedCaseHadFocus = useRef(false)
  const unavailableHeading = useRef<HTMLHeadingElement>(null)
  const trackCaseContent = useCallback((node: HTMLDivElement | null) => {
    if (!node && caseContent.current) removedCaseHadFocus.current = caseContent.current.contains(document.activeElement)
    caseContent.current = node
  }, [])
  useLayoutEffect(() => {
    if (!record && removedCaseHadFocus.current && document.activeElement === document.body) unavailableHeading.current?.focus()
    removedCaseHadFocus.current = false
  }, [record?.id])
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const direction = useUiDirection()
  useEffect(() => {
    conversationNavigation.current = location.hash === '#case-conversation' ? location.key : null
    if (!conversationNavigation.current) return
    setTab(0)
  }, [location.key, location.hash])
  useEffect(() => {
    if (conversationNavigation.current !== location.key || tab !== 0) return
    const frame = requestAnimationFrame(() => {
      document.getElementById('case-conversation')?.focus()
      conversationNavigation.current = null
    })
    return () => cancelAnimationFrame(frame)
  }, [location.key, location.hash, tab])
  useEffect(() => {
    if (record && !dirty) {
      setTitle(record.title); setDescription(record.original)
      setEditBase({ title: record.title, description: record.original })
    }
  }, [record?.title, record?.original, dirty])
  const recordId = record?.id
  const reloadActivity = useCallback(async () => {
    const current = ++activityGeneration.current
    if (!recordId) { setActivity(null); return }
    setLoading(true); setLoadError('')
    try {
      const data = await mutate(() => supportApi.activity(recordId))
      if (current === activityGeneration.current) setActivity(data)
    } catch (error) {
      if (current === activityGeneration.current) { setActivity(null); setLoadError(errorMessage(error)) }
    } finally { if (current === activityGeneration.current) setLoading(false) }
  }, [recordId, mutate])
  useEffect(() => {
    void reloadActivity()
    return () => { activityGeneration.current++ }
  }, [reloadActivity, record, activityVersions[recordId ?? '']])
  async function addReply(event: FormEvent) {
    event.preventDefault()
    if (!record) return
    setBusy(true); setError(''); setStatus('')
    try {
      await mutate(() => supportApi.comment(record.id, reply.trim()))
      setReply(''); setStatus('Your reply was saved to this case.')
      await reloadActivity()
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!record || !file) return
    setBusy(true); setError(''); setStatus('')
    try {
      await mutate(() => supportApi.upload(record.id, file))
      setStatus('The document was uploaded to this case.')
      await reloadActivity()
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  async function download(documentId: string) {
    if (!record) return
    setBusy(true); setError('')
    try {
      const file = await mutate(() => supportApi.download(record.id, documentId))
      if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) throw new Error('The server returned an unsupported document type.')
      const bytes = Uint8Array.from(atob(file.content), character => character.charCodeAt(0))
      const url = URL.createObjectURL(new Blob([bytes], { type: file.type }))
      const link = document.createElement('a')
      link.href = url; link.download = file.name; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  async function save(event: FormEvent) {
    event.preventDefault()
    if (!record) return
    setBusy(true); setError(''); setStatus('')
    try {
      const saved = await updateCase(record.id, title.trim(), description.trim())
      setTitle(current => current === title ? saved.title : current)
      setDescription(current => current === description ? saved.original : current)
      setEditBase({ title: saved.title, description: saved.original })
      setStatus('Your case details were saved.')
    }
    catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number | undefined
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = tabs.length - 1
    if (event.key === 'ArrowRight') next = (index + (direction === 'rtl' ? -1 : 1) + tabs.length) % tabs.length
    if (event.key === 'ArrowLeft') next = (index + (direction === 'rtl' ? 1 : -1) + tabs.length) % tabs.length
    if (next !== undefined) { event.preventDefault(); setTab(next); tabRefs.current[next]?.focus() }
  }
  if (!record) return <><h1 ref={unavailableHeading} tabIndex={-1}>Case not available</h1><p>This case was not found among your authorized personal cases.</p><Link className="button" to="/cases">Back to my cases</Link></>
  const editable = record.status === 'progress' || record.status === 'action'
  const number = record.number ?? record.id
  const statusText = record.statusLabel ?? statusLabels[record.status]
  const steps = caseSteps(record)
  const entries = activity ? caseTimeline(record, activity.comments).filter(item => timelineFilter === 'all' || item.kind === timelineFilter) : []
  function goToReply() {
    setTab(0)
    requestAnimationFrame(() => document.getElementById('case-reply')?.focus())
  }
  return <div ref={trackCaseContent}>
    <nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/cases">My cases</Link><span aria-hidden="true">/</span><bdi>{number}</bdi></nav>
    <header className="panel case-hero">
      <div className="case-hero-top"><span className="eyebrow"><bdi>{number}</bdi></span><span className={`badge ${record.status}`}>{statusText}</span></div>
      <h1><bdi>{record.title}</bdi></h1>
      <p className="case-summary">{record.statusNote}</p>
      <ol className="progress-steps" aria-label="Case progress" style={{ '--steps': steps.length } as CSSProperties}>{steps.map(step => <li key={step.label} className={step.state} aria-current={step.state === 'current' ? 'step' : undefined}><strong>{step.label}</strong>{step.detail}</li>)}</ol>
    </header>
    <section className={`case-action ${editable ? record.status : 'closed'}`} aria-label={editable ? 'Your next step' : 'Case outcome'}>
      <div><span className="eyebrow">{editable ? 'Your next step' : 'Outcome'}</span><strong>{record.nextStep}</strong>
        <p>{record.status === 'action' ? 'Add a reply or upload a document so support can continue.' : editable ? 'Support will post updates in the timeline. Add a reply if anything changes.' : 'Replies and uploads are closed. If the problem comes back, report a new issue.'}</p></div>
      {editable ? <button type="button" className={`button${record.status === 'action' ? '' : ' secondary'}`} onClick={goToReply}>{record.status === 'action' ? 'Respond' : 'Add a reply'}</button>
        : <button type="button" className="button secondary" onClick={() => setIssueOpen(true)}>Report a new issue</button>}
    </section>
    <div className="case-layout"><section className="panel">
      <div className="tabs" role="tablist" aria-label="Case information">{tabs.map((label, index) => <button ref={element => { tabRefs.current[index] = element }} key={label} id={`case-tab-${index}`} className="tab" role="tab" aria-selected={tab === index} tabIndex={tab === index ? 0 : -1} aria-controls={`case-panel-${index}`} onClick={() => setTab(index)} onKeyDown={event => onTabKey(event, index)}>{label}</button>)}</div>
      <p className="error" role="alert">{error}</p><p role="status">{status}</p>
      <p id="case-edit-conflict" className={detailsChanged ? 'notice' : 'sr-only'} aria-live="polite" aria-atomic="true">{detailsChanged ? 'This case changed while you were editing. Your draft is preserved; saving will replace the current title and description shown above.' : ''}</p>
      <div role="tabpanel" id={`case-panel-${tab}`} aria-labelledby={`case-tab-${tab}`} tabIndex={0}>
        {tab !== 2 && <>{loading && <p role="status">Loading customer conversation and documents...</p>}{loadError && <div className="stack"><p role="alert">{loadError}</p><div className="actions"><button className="button secondary" onClick={() => void reloadActivity()}>Reload conversation</button></div></div>}</>}
        {tab === 0 && <div className="stack">
          <div className="tab-intro"><h2 id="case-conversation" tabIndex={-1}>Customer conversation</h2><p className="muted">Replies and updates shared on this case. Internal CRM activities and email are not shown.</p></div>
          {activity && !loading && <>
            <div className="filters timeline-filters" role="group" aria-label="Filter timeline">{timelineFilters.map(([value, label]) => <button type="button" className="filter-button" key={value} aria-pressed={timelineFilter === value} onClick={() => setTimelineFilter(value)}>{label}</button>)}</div>
            {entries.length ? <ol className="timeline">{entries.map(item => <li className={`timeline-item ${item.tone}`} key={item.id}><div className="timeline-meta"><time dateTime={item.date}>{formatDate(item.date, true)}</time><bdi>{item.author}</bdi></div><strong>{item.title}</strong><p dir="auto">{item.body}</p></li>)}</ol>
              : <p className="empty">{timelineFilter === 'message' ? 'No messages have been shared on this case yet.' : 'No timeline entries match this filter.'}</p>}
          </>}
          {(editable || reply.length > 0) && <form className="case-reply stack" onSubmit={addReply}><Field id="case-reply" label="Reply to support" value={reply} onChange={setReply} multiline required maxLength={4000} hint="Do not include passwords or payment-card details." /><div className="actions"><button className="button" disabled={busy || !editable || !reply.trim()} type="submit">{busy ? 'Saving...' : 'Send reply'}</button></div></form>}
          {!editable && <p className="notice">This case is closed. New replies and document uploads are not available. Any unsent draft is kept here for you to copy.</p>}
        </div>}
        {tab === 1 && <div className="stack">
          <div className="tab-intro"><span className="eyebrow">Documents shared on this case</span><h2>Documents</h2><p className="muted">Only portal-designated files on this case are listed. Downloads are checked against your case access.</p></div>
          {activity && !loading && (activity.documents.length ? <ul className="document-list">{activity.documents.map(file => <li key={file.id}><span className="document-copy"><bdi>{file.name}</bdi><small>{formatNumber(file.size)} bytes</small></span><button className="button secondary small" disabled={busy} onClick={() => void download(file.id)} aria-label={`Download ${file.name}`}>Download</button></li>)}</ul> : <p className="empty">No customer-visible documents are available.</p>)}
          {editable && <div className="field document-upload"><label htmlFor="case-document">Upload a case document</label><input id="case-document" type="file" accept=".pdf,.png,.jpg,.jpeg" aria-describedby="document-hint" disabled={busy} onChange={event => void upload(event)} /><small id="document-hint">PDF, PNG or JPEG, up to 5 MB. File content is stored in Dataverse. Do not upload identity documents unless your approved support process requires them.</small></div>}
        </div>}
        {tab === 2 && <div className="stack"><div className="tab-intro"><span className="eyebrow">Submitted {formatDate(record.opened)}</span><h2>Original request</h2></div>{editable || dirty ? <form className="stack" onSubmit={save} aria-describedby={detailsChanged ? 'case-edit-conflict' : undefined}><Field id="case-title" label="Case title" value={title} onChange={setTitle} required maxLength={200} /><Field id="case-description" label="Case description" value={description} onChange={setDescription} multiline required maxLength={2000} hint="Up to 2,000 characters." /><div className="actions"><button className="button secondary" disabled={busy || !editable} type="submit" aria-describedby={detailsChanged ? 'case-edit-conflict' : undefined}>{busy ? 'Saving...' : 'Save case details'}</button></div>{!editable && <p>This case is closed. Your draft is kept for you to copy, but cannot be saved.</p>}</form> : <p className="case-original" dir="auto">{record.original}</p>}<p className="muted">Case state and assignment are managed by support.</p></div>}
      </div>
    </section><aside className="case-rail">
      <section className="panel" aria-labelledby="case-details-heading"><h2 id="case-details-heading" className="eyebrow">Case details</h2><dl className="detail-list"><div><dt>Status</dt><dd>{statusText}</dd></div><div><dt>Opened</dt><dd>{formatDate(record.opened)}</dd></div><div><dt>Last updated</dt><dd>{formatDate(record.updated)}</dd></div><div><dt>Access</dt><dd>Your personal case</dd></div></dl></section>
      <section className="panel" aria-labelledby="case-help-heading"><span className="eyebrow">Need help?</span><h2 id="case-help-heading" className="rail-title">Ask in this case context</h2><p className="muted">Ask Northwind about this case, or reach the support team without repeating the history.</p><button type="button" className="button secondary ask-case" onClick={() => openAssistant(`Help me with ${number}: ${record.title}`)}>Ask Northwind</button><Link className="text-link ask-case" to={`/account?context=${encodeURIComponent(`${number}: ${record.title}`)}#contact-support`}>Talk to a person</Link></section>
    </aside></div>
  </div>
}

type TimelineView = { id: string; kind: 'action' | 'message'; tone: 'support' | 'customer' | 'system'; title: string; body: string; date: string; author: string }
const timelineFilters = [['all', 'Everything'], ['action', 'Actions taken'], ['message', 'Communications']] as const
// Built only from case dates/status and portal comments; documents have no shared timestamp.
function caseTimeline(record: SupportCase, comments: CaseActivity['comments']): TimelineView[] {
  const closed = record.status === 'resolved' || record.status === 'cancelled'
  const entries: TimelineView[] = [
    ...(closed ? [{ id: 'case-closed', kind: 'action', tone: 'system', title: `Case ${(record.statusLabel ?? statusLabels[record.status]).toLowerCase()}`, body: record.statusNote ?? '', date: record.updated, author: 'Northwind Support' } as const] : []),
    ...comments.map(comment => comment.author === 'Customer'
      ? { id: comment.id, kind: 'message', tone: 'customer', title: 'Your message', body: comment.body, date: comment.created, author: 'You' } as const
      : { id: comment.id, kind: 'message', tone: 'support', title: 'Support replied', body: comment.body, date: comment.created, author: 'Northwind Support' } as const),
    { id: 'case-submitted', kind: 'action', tone: 'system', title: 'Case submitted', body: `Your request was recorded as ${record.number ?? record.id}.`, date: record.opened, author: 'System' },
  ]
  return entries.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
}
function caseSteps(record: SupportCase): { label: string; detail: string; state: '' | 'done' | 'current' | 'stopped' }[] {
  const reported = { label: 'Reported', detail: formatDate(record.opened), state: 'done' } as const
  if (record.status === 'resolved') return [reported, { label: 'In progress', detail: 'Completed', state: 'done' }, { label: 'Resolved', detail: formatDate(record.updated), state: 'done' }]
  if (record.status === 'cancelled') return [reported, { label: record.statusLabel ?? 'Cancelled', detail: formatDate(record.updated), state: 'stopped' }]
  return [reported, { label: record.status === 'action' ? 'Waiting on you' : record.statusLabel ?? 'In progress', detail: `Updated ${formatDate(record.updated)}`, state: 'current' }, { label: 'Resolved', detail: 'Pending', state: '' }]
}

function DemoCaseDetail() {
  const { id } = useParams()
  const { cases, documents, setDocuments, openAssistant } = useSupport()
  const record = cases.find(item => item.id === id)
  usePageTitle(record?.title ?? 'Case not found')
  const [tab, setTab] = useState(0)
  const [filter, setFilter] = useState('all')
  const [fileError, setFileError] = useState('')
  const [fileStatus, setFileStatus] = useState('')
  const [identityTab, setIdentityTab] = useState(false)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const direction = useUiDirection()
  if (!record) return <><h1>Case not found</h1><p>This record is not available in this preview. Local drafts are removed when the page reloads.</p><Link className="button" to="/cases">Back to my cases</Link></>
  const files = documents[record.id] ?? []
  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number | undefined
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = tabs.length - 1
    if (event.key === 'ArrowRight') next = (index + (direction === 'rtl' ? -1 : 1) + tabs.length) % tabs.length
    if (event.key === 'ArrowLeft') next = (index + (direction === 'rtl' ? 1 : -1) + tabs.length) % tabs.length
    if (next !== undefined) { event.preventDefault(); setTab(next); tabRefs.current[next]?.focus() }
  }
  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setFileError(''); setFileStatus('')
    if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) setFileError('Choose a PDF, PNG or JPEG demonstration file.')
    else if (file.size > 5 * 1024 * 1024) setFileError('Choose a file no larger than 5 MB.')
    else if (record) {
      setDocuments(current => ({ ...current, [record.id]: [...(current[record.id] ?? []), { name: file.name, size: file.size, type: file.type }] }))
      setFileStatus('File name recorded locally. No file content was saved or uploaded.')
    }
    event.target.value = ''
  }
  const entries = record.timeline.filter(item => filter === 'all' || item.kind === filter)
  const progress = record.status === 'resolved' ? 4 : record.status === 'draft' ? 0 : 2
  return <div key={record.id}>
    <nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/cases">My cases</Link><span aria-hidden="true">/</span><bdi className="case-id">{record.id}</bdi></nav>
    <header className="panel case-hero"><div className="case-hero-top"><span className="eyebrow"><bdi>{record.id}</bdi></span><span className={`badge ${record.status}`}>{statusLabels[record.status]}</span></div><h1><bdi>{record.title}</bdi></h1><p className="case-summary"><bdi>{record.summary}</bdi></p>
      <ol className="progress-steps" aria-label="Case progress">{['Reported', 'Reviewed', 'In progress', 'Complete'].map((label, index) => <li key={label} className={index < progress ? 'done' : index === progress ? 'current' : ''} aria-current={index === progress ? 'step' : undefined}><strong>{label}</strong>{record.status === 'draft' ? 'Not submitted' : index < progress ? 'Completed' : index === progress ? (record.status === 'action' ? 'Waiting on you' : 'Current') : 'Pending'}</li>)}</ol>
    </header>
    <section className="case-action" aria-label="Your next step"><div><span className="eyebrow">Your next step</span><strong>{record.nextStep}</strong></div>
      {record.status === 'action' ? <button className="button" onClick={() => { setTab(1); setIdentityTab(true); tabRefs.current[1]?.focus() }}>Review document options</button>
        : <button className="button" onClick={() => openAssistant(`Help me understand ${record.id}: ${record.title}`)}>Ask about this case</button>}
    </section>
    <div className="case-layout">
      <section className="panel">
        <div className="tabs" role="tablist" aria-label="Case information">{tabs.map((label, index) => <button ref={element => { tabRefs.current[index] = element }} key={label} id={`case-tab-${index}`} className="tab" role="tab" aria-selected={tab === index} tabIndex={tab === index ? 0 : -1} aria-controls={`case-panel-${index}`} onClick={() => setTab(index)} onKeyDown={event => onTabKey(event, index)}>{label}</button>)}</div>
        <div role="tabpanel" id={`case-panel-${tab}`} aria-labelledby={`case-tab-${tab}`} tabIndex={0}>
          {tab === 0 && <><div className="filters timeline-filters" role="group" aria-label="Filter timeline">{[['all', 'Everything'], ['action', 'Actions taken'], ['message', 'Communications']].map(([value, label]) => <button className="filter-button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>
            <ol className="timeline">{entries.map((item, index) => <li className={`timeline-item ${item.author === 'You' ? 'customer' : item.author === 'System' ? 'system' : 'support'}`} key={index}><div className="timeline-meta"><time dateTime={item.date}>{formatDate(item.date, true)}</time><bdi>{item.author}</bdi></div><strong>{item.title}</strong><p><bdi>{item.body}</bdi></p></li>)}</ol>
            {!entries.length && <p className="empty">No timeline entries match this filter.</p>}</>}
          {tab === 1 && <div className="stack"><h2>Documents</h2>
            {identityTab && <p className="notice">Identity verification is not available here. Never select a real passport, government ID or sensitive document in this sample.</p>}
            <p>This demonstration records file names only. Nothing is uploaded, stored as file content, or marked received by support.</p>
            <div className="field"><label htmlFor="case-document">Select a non-sensitive demonstration file</label><input id="case-document" type="file" accept=".pdf,.png,.jpg,.jpeg" aria-describedby="document-hint document-error" onChange={selectFile} /><small id="document-hint">PDF, PNG or JPEG, up to 5 MB. File names are removed on reload.</small></div>
            <p className="error" id="document-error" role="alert">{fileError}</p><p role="status">{fileStatus}</p>
            {!files.length ? <p className="empty">No demonstration files selected for this case.</p> : <ul>{files.map((file, index) => <li key={index}><bdi>{file.name}</bdi> · {formatNumber(file.size)} bytes · local metadata only <button className="text-link" onClick={() => { setDocuments(current => ({ ...current, [record.id]: files.filter((_, position) => position !== index) })); setFileStatus('Local file metadata removed.'); document.getElementById('case-document')?.focus() }} aria-label={`Remove ${file.name}`}>Remove</button></li>)}</ul>}
          </div>}
          {tab === 2 && <><h2>Original request</h2><p className="muted">Opened {formatDate(record.opened)}</p><p dir="auto">{record.original}</p></>}
        </div>
      </section>
      <aside className="case-rail"><section className="panel" aria-labelledby="case-details-heading"><h2 id="case-details-heading" className="eyebrow">Case details</h2><dl className="detail-list"><div><dt>Owner</dt><dd><bdi>{record.owner}</bdi></dd></div><div><dt>Opened</dt><dd>{formatDate(record.opened)}</dd></div><div><dt>Last update</dt><dd>{formatDate(record.updated)}</dd></div><div><dt>Target resolution</dt><dd>{record.target ? formatDate(record.target) : record.status === 'resolved' ? 'Completed' : 'Not assigned'}</dd></div></dl></section>
        <section className="panel" aria-labelledby="case-help-heading"><span className="eyebrow">Need help?</span><h2 id="case-help-heading" className="rail-title">Ask in this case context</h2><p className="muted">Get a summary, clarify the next step, or prepare a handoff without repeating the history.</p><button type="button" className="button secondary ask-case" onClick={() => openAssistant(`Explain ${record.id}: ${record.title}`)}>Ask Northwind</button><Link className="text-link ask-case" to={`/account?context=${encodeURIComponent(`${record.id}: ${record.title}`)}#contact-support`}>Talk to a person</Link></section></aside>
    </div>
  </div>
}
