import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { errorMessage, useSupport } from '../SupportContext'
import { searchSupport, statusLabels, type SupportCase } from '../data'
import Icon from './Icon'
import { useUiDirection } from './Field'

type Resource = { id: string; label: string; title: string; detail: string; path: string }
type Entry = { id: number } & (
  | { kind: 'customer'; text: string }
  | { kind: 'assistant'; text: string }
  | { kind: 'resources'; items: Resource[] }
  | { kind: 'equipment'; question: string; light?: string }
  | { kind: 'guidance'; light: string }
  | { kind: 'resolution'; description: string; answer?: 'solved' | 'ticket' }
  | { kind: 'ticket-action'; description: string; used?: boolean }
  | { kind: 'ticket'; description: string; caseId?: string })
type EntryInput = Entry extends infer Item ? Item extends Entry ? Omit<Item, 'id'> : never : never

const impacts = ['Work is blocked', 'Service is impaired', 'I have a question']
const narrowQuery = '(max-width: 700px)'
const caseListPattern = /\b(?:check|track|show|list|view)\b.*\bcases\b|\bmy cases\b/i
const isNarrow = () => window.matchMedia(narrowQuery).matches

function TicketForm({ entry, onSubmitted, onViewCases }: { entry: Extract<Entry, { kind: 'ticket' }>; onSubmitted: (caseId: string) => void; onViewCases: () => void }) {
  const { submitCase, isDemo, cases } = useSupport()
  const uiDirection = useUiDirection()
  const [description, setDescription] = useState(entry.description)
  const [impact, setImpact] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const textarea = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { textarea.current?.focus({ preventScroll: true }) }, [])
  if (entry.caseId) {
    const record = cases.find(item => item.id === entry.caseId)
    const reference = record?.number ?? entry.caseId
    return <div className="chat-ticket-confirmation" role="status">
      <strong>{isDemo ? 'Draft saved' : 'Ticket submitted'} · <bdi>{reference}</bdi></strong>
      <p>{isDemo ? 'Demo only. The draft is in My cases until this preview reloads; nothing was sent to support.' : 'You can track it in My cases. We’ll notify you here when the support team posts an update.'}</p>
      <button type="button" className="button" onClick={onViewCases}>View my open cases</button>
    </div>
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!description.trim() || !impact) { setError('Describe the issue and choose how it is affecting you.'); return }
    setSaving(true); setError('')
    try { onSubmitted(await submitCase(description.trim(), impact)) }
    catch (failure) { setError(errorMessage(failure)) }
    finally { setSaving(false) }
  }
  const limit = isDemo ? undefined : 2000 - '\n\nBusiness impact: '.length - impact.length
  return <form className="chat-ticket-form" onSubmit={submit} noValidate>
    <label htmlFor={`chat-ticket-${entry.id}`}>Review your issue before submitting</label>
    <textarea ref={textarea} id={`chat-ticket-${entry.id}`} name={`chat-ticket-${entry.id}`} {...{ dirname: `chat-ticket-${entry.id}.dir` }} dir={description ? 'auto' : uiDirection}
      required rows={4} maxLength={limit} value={description} onChange={event => { setDescription(event.target.value); setError('') }} />
    <label htmlFor={`chat-impact-${entry.id}`}>How is this affecting you?</label>
    <select id={`chat-impact-${entry.id}`} required value={impact} onChange={event => { setImpact(event.target.value); setError('') }}>
      <option value="">Choose an impact</option>{impacts.map(value => <option key={value}>{value}</option>)}
    </select>
    <p className="chat-note">{isDemo ? 'Demo only: this saves a local draft and sends nothing.' : 'Submitting creates a case for your signed-in contact. Do not include passwords, payment-card details or sensitive identity information.'}</p>
    {error && <p className="error" role="alert">{error}</p>}
    <button className="button" type="submit" disabled={saving}>{saving ? 'Submitting…' : isDemo ? 'Save ticket draft' : 'Submit ticket'}</button>
  </form>
}

export default function Assistant() {
  const { cases, articles, isDemo, profile, assistantOpen, setAssistantOpen, assistantRequest } = useSupport()
  const [widgetOpen, setWidgetOpen] = useState(() => !isNarrow())
  const [expanded, setExpanded] = useState(false)
  const [question, setQuestion] = useState('')
  const [quickQuestion, setQuickQuestion] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [scrollTarget, setScrollTarget] = useState<number | null>(null)
  const nextId = useRef(1)
  const handled = useRef(assistantRequest.sequence)
  const transcript = useRef<HTMLDivElement>(null)
  const composer = useRef<HTMLInputElement>(null)
  const widgetExpand = useRef<HTMLButtonElement>(null)
  const launcher = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef<'widget' | 'launcher' | null>(null)
  const uiDirection = useUiDirection()
  const location = useLocation()
  const navigate = useNavigate()
  const firstName = profile.name.split(/\s+/)[0]
  const currentCase = cases.find(item => location.pathname === `/cases/${item.id}`)
  const openCase = cases.find(item => item.status === 'action' || item.status === 'progress')
  const note = isDemo ? 'Demo data only. Scripted responses, not live AI.' : 'Rule-based guide, not live AI. Searches your loaded cases and articles.'

  function entry(value: EntryInput) { return { ...value, id: nextId.current++ } as Entry }
  function update(id: number, change: Partial<Entry>) { setEntries(items => items.map(item => item.id === id ? { ...item, ...change } as Entry : item)) }
  function caseResource(item: SupportCase, label?: string): Resource {
    return { id: item.id, label: `${label ?? item.statusLabel ?? statusLabels[item.status]} · ${item.number ?? item.id}`, title: item.title, detail: item.summary, path: `/cases/${item.id}` }
  }
  function send(value: string) {
    const text = value.trim()
    if (!text) return
    const customer = entry({ kind: 'customer', text })
    const added: Entry[] = [customer]
    if (caseListPattern.test(text)) {
      added.push(entry({ kind: 'assistant', text: cases.length ? 'Here are all the cases on your account, including resolved requests:' : 'You don’t have any cases yet. If something needs attention, you can raise a ticket.' }))
      added.push(cases.length ? entry({ kind: 'resources', items: cases.map(item => caseResource(item)) }) : entry({ kind: 'ticket-action', description: text }))
    } else {
      const results = searchSupport(text, cases, articles)
      const found = [...results.filter(item => item.kind === 'Article').slice(0, 3), ...results.filter(item => item.kind === 'Case').slice(0, 2)]
      const equipment = isDemo && /\b(gateway|sensor|equipment|firmware)\b/i.test(text)
      added.push(entry({ kind: 'assistant', text: found.length
        ? 'Let’s try proven guidance first. I found these support articles and related case references:'
        : equipment ? 'I couldn’t find a close match in the support library or your past cases, but we can check the equipment together.'
        : 'I couldn’t find a close match in the support library or your past cases. You can raise a ticket so support can investigate.' }))
      if (found.length) added.push(entry({ kind: 'resources', items: found.map(item => {
        const record = cases.find(current => current.id === item.id)
        if (record) return caseResource(record, 'Past case')
        const article = articles.find(current => current.id === item.id)
        return { id: item.id, label: `Support article · ${article?.number ?? item.id}`, title: item.title, detail: article?.description ?? item.meta, path: item.path }
      }) }))
      if (equipment) added.push(entry({ kind: 'equipment', question: text }))
      if (!found.length && !equipment) added.push(entry({ kind: 'ticket-action', description: text }))
    }
    setEntries(items => [...items, ...added])
    setScrollTarget(customer.id)
    setQuestion('')
  }
  function askAboutCase(item: SupportCase) {
    const customer = entry({ kind: 'customer', text: `Get help with case ${item.number ?? item.id}` })
    setEntries(items => [...items, customer,
      entry({ kind: 'assistant', text: 'Here is the case. Open it to review the latest update, reply to support, or add documents:' }),
      entry({ kind: 'resources', items: [caseResource(item)] })])
    setScrollTarget(customer.id)
  }
  function chooseLight(id: number, question: string, light: string) {
    update(id, { light })
    const guidance = entry({ kind: 'guidance', light })
    setEntries(items => [...items, guidance, entry({ kind: 'resolution', description: `${question}\n\nObserved status: ${light}` })])
    setScrollTarget(guidance.id)
  }
  function resolve(id: number, description: string, answer: 'solved' | 'ticket') {
    update(id, { answer })
    const next = answer === 'solved' ? entry({ kind: 'assistant', text: 'Glad that helped. You can come back any time if you need more support.' }) : entry({ kind: 'ticket', description })
    setEntries(items => answer === 'ticket' && items.some(item => item.kind === 'ticket' && !item.caseId) ? items : [...items, next])
    setScrollTarget(next.id)
  }
  function raiseTicket(id: number, description: string) {
    update(id, { used: true })
    const ticket = entry({ kind: 'ticket', description })
    setEntries(items => items.some(item => item.kind === 'ticket' && !item.caseId) ? items : [...items, ticket])
    setScrollTarget(ticket.id)
  }
  function handoff() {
    const context = entries.flatMap(item => item.kind === 'customer' ? [item.text] : item.kind === 'guidance' ? [`Observed status: ${item.light}`] : []).join('\n')
    restoreFocus.current = null
    setAssistantOpen(false)
    navigate(`/account?context=${encodeURIComponent(context)}#contact-support`)
  }
  function minimize() { restoreFocus.current = widgetOpen ? 'widget' : 'launcher'; setExpanded(false); setAssistantOpen(false) }
  function close() { minimize(); setEntries([]); setQuestion('') }
  function openPanel(value = '', sendNow = false) {
    setAssistantOpen(true)
    if (sendNow) send(value)
    else if (value) setQuestion(value)
  }
  function followResource() { if (isNarrow()) { restoreFocus.current = null; setExpanded(false); setAssistantOpen(false) } }

  useEffect(() => {
    if (!assistantOpen || assistantRequest.sequence === handled.current) return
    handled.current = assistantRequest.sequence
    if (assistantRequest.send) send(assistantRequest.question)
    else setQuestion(assistantRequest.question)
    const frame = requestAnimationFrame(() => composer.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [assistantOpen, assistantRequest])
  useEffect(() => {
    if (assistantOpen) {
      const frame = requestAnimationFrame(() => { if (!document.querySelector('.chat-ticket-form textarea:focus')) composer.current?.focus({ preventScroll: true }) })
      return () => cancelAnimationFrame(frame)
    }
    const target = restoreFocus.current === 'widget' ? widgetExpand.current : restoreFocus.current === 'launcher' ? launcher.current : null
    restoreFocus.current = null
    target?.focus()
  }, [assistantOpen])
  useLayoutEffect(() => {
    const container = transcript.current
    if (scrollTarget === null || !container) return
    const target = container.querySelector<HTMLElement>(`[data-entry="${scrollTarget}"]`)
    if (target) container.scrollTop += target.getBoundingClientRect().top - container.getBoundingClientRect().top - 8
    setScrollTarget(null)
  }, [scrollTarget, entries])

  const shortcuts: { label: string; run: () => void }[] = [
    ...(openCase ? [{ label: `Get help with case ${openCase.number ?? openCase.id}`, run: () => { openPanel(); askAboutCase(openCase) } }] : []),
    { label: 'Track my open cases', run: () => openPanel('Track my open cases', true) },
    { label: 'Get help with a gateway issue', run: () => openPanel('My Edge Gateway is offline', true) },
  ]

  if (!assistantOpen) return widgetOpen
    ? <section className="assistant-widget" aria-labelledby="assistant-widget-title" data-bidi-id="assistant-widget">
      <div className="assistant-widget-header">
        <span className="assistant-mark" aria-hidden="true"><Icon name="spark" /></span>
        <div className="assistant-title"><strong id="assistant-widget-title">Northwind Assistant</strong><small>Need a hand, <bdi>{firstName}</bdi>?</small></div>
        <button ref={widgetExpand} type="button" className="assistant-header-button" aria-label="Expand assistant" aria-controls="assistant-dialog" aria-expanded="false" onClick={() => openPanel()}><Icon name="expand" /></button>
        <button type="button" className="assistant-header-button" aria-label="Minimize assistant" onClick={() => { setWidgetOpen(false); requestAnimationFrame(() => launcher.current?.focus()) }}><Icon name="close" /></button>
      </div>
      <div className="assistant-widget-body">
        <form className="assistant-widget-form" onSubmit={event => { event.preventDefault(); const value = quickQuestion; setQuickQuestion(''); openPanel(value, Boolean(value.trim())) }}>
          <label className="sr-only" htmlFor="assistant-widget-input">Ask Northwind Assistant a question</label>
          <span className="assistant-form-icon" aria-hidden="true"><Icon name="spark" /></span>
          <input id="assistant-widget-input" name="assistant-widget-input" {...{ dirname: 'assistant-widget-input.dir' }} dir={quickQuestion ? 'auto' : uiDirection} autoComplete="off" placeholder="Ask Northwind a question…" value={quickQuestion} onChange={event => setQuickQuestion(event.target.value)} />
          <button type="submit" className="assistant-send" aria-label="Continue in assistant"><Icon name="arrow" progression /></button>
        </form>
        <p className="assistant-note"><Icon name="info" />{note}</p>
        <div className="assistant-shortcuts" role="group" aria-label="Suggested assistant actions">
          {shortcuts.map(item => <button key={item.label} type="button" onClick={item.run}><span>{item.label}</span><Icon name="external" progression /></button>)}
        </div>
      </div>
    </section>
    : <button ref={launcher} type="button" className="button chat-launcher" aria-controls="assistant-dialog" aria-expanded="false" onClick={() => { setWidgetOpen(true); requestAnimationFrame(() => widgetExpand.current?.focus()) }}><Icon name="spark" />Assistant</button>

  return <dialog open id="assistant-dialog" className={`assistant-panel${expanded ? ' is-expanded' : ''}`} aria-labelledby="assistant-dialog-title" data-bidi-id="assistant-panel"
    onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); minimize() } }}>
    <header className="assistant-panel-header">
      <span className="assistant-mark" aria-hidden="true"><Icon name="spark" /></span>
      <div className="assistant-title"><h2 id="assistant-dialog-title">Northwind Assistant</h2><small>Ask us about your support needs</small></div>
      <button type="button" className="assistant-header-button" aria-label="Minimize assistant" onClick={minimize}><Icon name="minimize" /></button>
      <button type="button" className="assistant-header-button" aria-pressed={expanded} aria-label={expanded ? 'Restore assistant size' : 'Expand assistant'} onClick={() => setExpanded(value => !value)}><Icon name={expanded ? 'restore' : 'expand'} /></button>
      <button type="button" className="assistant-header-button" aria-label="Close assistant" onClick={close}><Icon name="close" /></button>
    </header>
    <div ref={transcript} className="assistant-transcript" role="log" aria-label="Assistant conversation" aria-live="polite">
      <p className="sr-only">Working context: <bdi>{currentCase?.title ?? 'Northwind customer support'}</bdi></p>
      <div className="assistant-welcome">
        <span className="assistant-welcome-icon" aria-hidden="true"><Icon name="spark" /></span>
        <h3>How can I help?</h3>
        <p>Find an answer or start a support request.</p>
      </div>
      <div className="chat-choices" role="group" aria-label="Suggested assistant actions">
        <button type="button" className="chat-choice" onClick={() => send('My Edge Gateway is offline')}>Get help with a gateway issue</button>
        <button type="button" className="chat-choice" onClick={() => send('Track my open cases')}>Track my open cases</button>
        <button type="button" className="chat-choice" onClick={handoff}>Contact support</button>
      </div>
      {entries.map(item => <div key={item.id} data-entry={item.id} className="chat-entry">
        {item.kind === 'customer' && <div className="chat-bubble customer" dir="auto">{item.text}</div>}
        {item.kind === 'assistant' && <div className="chat-bubble">{item.text}</div>}
        {item.kind === 'resources' && <div className="chat-resource-list">{item.items.map(resource => <Link key={resource.id} className="chat-resource" to={resource.path} onClick={followResource}>
          <span className="chat-resource-copy"><span className="chat-resource-label"><bdi>{resource.label}</bdi></span><strong><bdi>{resource.title}</bdi></strong><small><bdi>{resource.detail}</bdi></small></span>
          <Icon name="external" progression />
        </Link>)}</div>}
        {item.kind === 'equipment' && <>
          <div className="chat-bubble">First, check the gateway status light. Which state do you see?</div>
          <div className="chat-choices" role="group" aria-label="Gateway status">{['Steady teal', 'Blinking teal', 'Amber', 'Red or no light'].map(light =>
            <button key={light} type="button" className="chat-choice" aria-pressed={item.light === light} disabled={Boolean(item.light)} onClick={() => chooseLight(item.id, item.question, light)}>{light}</button>)}</div>
        </>}
        {item.kind === 'guidance' && <div className="chat-bubble"><strong><bdi>{item.light}</bdi></strong><p>Record the observed status and review the approved documentation for your exact model. Do not reset or disassemble equipment based on this demonstration.</p><Link className="chat-resource compact" to="/articles/KA-0182" onClick={followResource}><span className="chat-resource-copy"><strong>Read the status-light reference · KA-0182</strong></span><Icon name="external" progression /></Link></div>}
        {item.kind === 'resolution' && <>
          <div className="chat-bubble">Did this resolve the issue?</div>
          <div className="chat-choices" role="group" aria-label="Resolution">
            <button type="button" className="chat-choice" disabled={Boolean(item.answer)} aria-pressed={item.answer === 'solved'} onClick={() => resolve(item.id, item.description, 'solved')}>Yes, that solved it</button>
            <button type="button" className="chat-choice" disabled={Boolean(item.answer)} aria-pressed={item.answer === 'ticket'} onClick={() => resolve(item.id, item.description, 'ticket')}>No, I still need help — raise a ticket</button>
          </div>
        </>}
        {item.kind === 'ticket-action' && <div className="chat-choices"><button type="button" className="chat-choice" disabled={item.used} onClick={() => raiseTicket(item.id, item.description)}>Still need help? Raise a ticket</button></div>}
        {item.kind === 'ticket' && <TicketForm entry={item} onSubmitted={caseId => update(item.id, { caseId })} onViewCases={() => { followResource(); navigate('/cases') }} />}
      </div>)}
    </div>
    <footer className="assistant-panel-footer">
      <form className="chat-composer" onSubmit={event => { event.preventDefault(); send(question) }}>
        <label className="sr-only" htmlFor="assistant-question">Your question</label>
        <span className="assistant-form-icon" aria-hidden="true"><Icon name="spark" /></span>
        <input ref={composer} id="assistant-question" name="assistant-question" {...{ dirname: 'assistant-question.dir' }} dir={question ? 'auto' : uiDirection} autoComplete="off" placeholder="Ask about your equipment or support…" value={question} onChange={event => setQuestion(event.target.value)} />
        <button type="submit" className="assistant-send" aria-label="Send message" disabled={!question.trim()}><Icon name="arrow" progression /></button>
      </form>
      <p className="assistant-note"><Icon name="info" />{note}</p>
    </footer>
  </dialog>
}
