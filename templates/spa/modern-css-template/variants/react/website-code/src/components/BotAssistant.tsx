import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSupport } from '../SupportContext'
import Icon from './Icon'
import { useUiDirection } from './Field'

type Ticket = { id: number; kind: 'ticket'; description: string; caseId?: string }
type Props = { renderTicket: (ticket: Ticket, onSubmitted: (id: string) => void) => ReactNode }
type Question = { question: string; send: boolean }
const narrow = () => window.matchMedia('(max-width: 700px)').matches

export default function BotAssistant({ renderTicket }: Props) {
  const { profile, cases, assistantOpen, setAssistantOpen, assistantRequest } = useSupport()
  const [widgetOpen, setWidgetOpen] = useState(() => !narrow())
  const [expanded, setExpanded] = useState(false)
  const [started, setStarted] = useState(false)
  const [session, setSession] = useState(0)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)
  const [question, setQuestion] = useState('')
  const [pending, setPending] = useState<Question[]>([])
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const expand = useRef<HTMLButtonElement>(null)
  const launcher = useRef<HTMLButtonElement>(null)
  const handled = useRef(0)
  const direction = useUiDirection()
  const navigate = useNavigate()
  const firstName = profile.name.split(/\s+/)[0]
  const openCase = cases.find(item => item.status === 'action' || item.status === 'progress')

  function open(value = '') {
    if (value.trim()) setPending(items => [...items, { question: value, send: true }])
    setAssistantOpen(true)
  }
  function minimize() {
    setAssistantOpen(false)
    requestAnimationFrame(() => (widgetOpen ? expand.current : launcher.current)?.focus())
  }
  function end() {
    minimize()
    setStarted(false); setReady(false); setFailed(false); setPending([]); setTicket(null)
    setSession(value => value + 1)
  }
  function restart() {
    setReady(false); setFailed(false)
    setSession(value => value + 1)
  }
  useEffect(() => {
    if (assistantOpen) setStarted(true)
  }, [assistantOpen])
  useEffect(() => {
    if (!assistantOpen || assistantRequest.sequence === handled.current) return
    handled.current = assistantRequest.sequence
    if (assistantRequest.question.trim()) setPending(items => [...items, { question: assistantRequest.question, send: assistantRequest.send }])
  }, [assistantOpen, assistantRequest])
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin !== location.origin || event.source !== frame.current?.contentWindow) return
      const data: unknown = event.data
      if (!data || typeof data !== 'object' || !('source' in data) || data.source !== 'northwind-bot' || !('type' in data)) return
      if (data.type === 'ready') { setReady(true); setFailed(false) }
      if (data.type === 'error') { setReady(false); setFailed(true) }
      if (data.type === 'minimize') {
        setAssistantOpen(false)
        requestAnimationFrame(() => (expand.current ?? launcher.current)?.focus())
      }
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [setAssistantOpen])
  useEffect(() => {
    if (!ready || !pending.length || !frame.current?.contentWindow) return
    pending.forEach(item => frame.current!.contentWindow!.postMessage({ source: 'northwind-assistant', ...item }, location.origin))
    setPending([])
  }, [pending, ready])
  useEffect(() => {
    if (!assistantOpen || !ready) return
    frame.current?.focus()
  }, [assistantOpen, ready])

  const suggestions = [
    ...(openCase ? [{ label: `Get help with case ${openCase.number ?? openCase.id}`, question: `Get help with case ${openCase.number ?? openCase.id}` }] : []),
    { label: 'Track my open cases', question: 'Track my open cases' },
    { label: 'Get support', question: 'I need help with a support issue' },
  ]
  return <>
    {!assistantOpen && (widgetOpen
      ? <section className="assistant-widget" aria-labelledby="assistant-widget-title" data-bidi-id="assistant-widget">
        <div className="assistant-widget-header">
          <span className="assistant-mark" aria-hidden="true"><Icon name="spark" /></span>
          <div className="assistant-title"><strong id="assistant-widget-title">Northwind Assistant</strong><small>Need a hand, <bdi>{firstName}</bdi>?</small></div>
          <button ref={expand} type="button" className="assistant-header-button" aria-label="Expand assistant" aria-controls="assistant-dialog" aria-expanded="false" onClick={() => open()}><Icon name="expand" /></button>
          <button type="button" className="assistant-header-button" aria-label="Minimize assistant" onClick={() => { setWidgetOpen(false); requestAnimationFrame(() => launcher.current?.focus()) }}><Icon name="close" /></button>
        </div>
        <div className="assistant-widget-body">
          <form className="assistant-widget-form" onSubmit={event => { event.preventDefault(); open(question); setQuestion('') }}>
            <label className="sr-only" htmlFor="assistant-widget-input">Ask Northwind Assistant a question</label>
            <span className="assistant-form-icon" aria-hidden="true"><Icon name="spark" /></span>
            <input id="assistant-widget-input" name="assistant-widget-input" {...{ dirname: 'assistant-widget-input.dir' }} dir={question ? 'auto' : direction} autoComplete="off" placeholder="Ask Northwind a question..." value={question} onChange={event => setQuestion(event.target.value)} />
            <button type="submit" className="assistant-send" aria-label="Continue in assistant"><Icon name="arrow" progression /></button>
          </form>
          <p className="assistant-note"><Icon name="info" />AI responses can be inaccurate. Check important details.</p>
          <div className="assistant-shortcuts" role="group" aria-label="Suggested assistant actions">
            {suggestions.map(item => <button key={item.label} type="button" onClick={() => open(item.question)}><span>{item.label}</span><Icon name="external" progression /></button>)}
          </div>
        </div>
      </section>
      : <button ref={launcher} type="button" className="button chat-launcher" aria-controls="assistant-dialog" aria-expanded="false" onClick={() => open()}><Icon name="spark" />Assistant</button>)}
    <dialog open hidden={!assistantOpen} id="assistant-dialog" className={`assistant-panel${expanded ? ' is-expanded' : ''}`} aria-labelledby="assistant-dialog-title" data-bidi-id="assistant-panel"
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); minimize() } }}>
      <header className="assistant-panel-header">
        <span className="assistant-mark" aria-hidden="true"><Icon name="spark" /></span>
        <div className="assistant-title"><h2 id="assistant-dialog-title">Northwind Assistant</h2><small>Ask us about your support needs</small></div>
        <button type="button" className="assistant-header-button" aria-label="Minimize assistant" onClick={minimize}><Icon name="minimize" /></button>
        <button type="button" className="assistant-header-button" aria-pressed={expanded} aria-label={expanded ? 'Restore assistant size' : 'Expand assistant'} onClick={() => setExpanded(value => !value)}><Icon name={expanded ? 'restore' : 'expand'} /></button>
        <button type="button" className="assistant-header-button" aria-label="Close assistant" onClick={end}><Icon name="close" /></button>
      </header>
      {started && <iframe key={session} ref={frame} className="assistant-bot-frame" src="/bot-chat.html" title="Northwind support conversation" />}
      {failed && <div className="assistant-bot-actions"><button type="button" className="button secondary" onClick={restart}>Start a new conversation</button></div>}
      {ticket && <div className="assistant-bot-ticket">{renderTicket(ticket, caseId => setTicket(current => current && { ...current, caseId }))}</div>}
      <footer className="assistant-panel-footer">
        <div className="assistant-bot-actions">
          <button type="button" className="text-link" onClick={() => setTicket(current => current ?? { id: 1, kind: 'ticket', description: '' })}>Raise a ticket</button>
          <button type="button" className="text-link" onClick={() => { minimize(); navigate('/account#contact-support') }}>Contact support</button>
        </div>
        <p className="assistant-note"><Icon name="info" />AI responses can be inaccurate. Do not share passwords or sensitive identity information.</p>
      </footer>
    </dialog>
  </>
}
