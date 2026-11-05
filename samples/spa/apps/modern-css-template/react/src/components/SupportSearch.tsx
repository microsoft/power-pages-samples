import { useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { searchSupport, type SearchResult } from '../data'
import { useSupport } from '../SupportContext'
import { useSearchSummary } from '../hooks/useSearchSummary'
import { GEN_AI_SEARCH_ENABLE_DOC_URL } from '../services/aiSummaryService'
import Field from './Field'
import Icon from './Icon'

type SearchProps = { query: string; onQueryChange: (value: string) => void; articlesOnly?: boolean; onSearchLibrary?: (value: string) => void }
export default function SupportSearch({ query, onQueryChange, articlesOnly = false, onSearchLibrary }: SearchProps) {
  const { cases, articles, openAssistant, isDemo, phase } = useSupport()
  const navigate = useNavigate()
  const setQuery = onQueryChange
  const [expanded, setExpanded] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const { state, run, reset } = useSearchSummary(articles, isDemo, phase === 'ready')
  const results = searchSupport(query, articlesOnly ? [] : cases, articles)
  const groups: [string, string, SearchResult[]][] = [
    ['cases', 'Cases', results.filter(result => result.kind === 'Case')],
    ['articles', 'Support articles', results.filter(result => result.kind === 'Article')],
  ]
  const concern = query.trim()
  useLayoutEffect(() => {
    const viewport = root.current?.querySelector<HTMLElement>('#support-results')
    const focused = document.activeElement
    if (!viewport) return
    if (!(focused instanceof HTMLElement) || !focused.matches('a.search-result') || !viewport.contains(focused)) {
      viewport.style.removeProperty('--search-results-available-size')
      return
    }
    // Fit the scrollport to the visible browser area before scrolling, including its last match.
    const screenStart = window.visualViewport?.offsetTop ?? 0
    const screenEnd = screenStart + (window.visualViewport?.height ?? window.innerHeight)
    let bounds = viewport.getBoundingClientRect()
    if (bounds.bottom <= screenStart || bounds.top >= screenEnd) return
    viewport.style.setProperty('--search-results-available-size', `${screenEnd - Math.max(bounds.top, screenStart)}px`)
    bounds = viewport.getBoundingClientRect()
    const item = focused.getBoundingClientRect()
    const style = getComputedStyle(viewport)
    const top = bounds.top + viewport.clientTop
    const visibleStart = Math.max(top + (parseFloat(style.paddingBlockStart) || 0), screenStart)
    const visibleEnd = Math.min(top + viewport.clientHeight - (parseFloat(style.paddingBlockEnd) || 0), screenEnd)
    if (item.top < visibleStart) viewport.scrollTop += item.top - visibleStart
    else if (item.bottom > visibleEnd) viewport.scrollTop += item.bottom - visibleEnd
  }, [state])
  function searchLibrary() {
    const reference = concern.match(/\bKA-\d+\b/i)?.[0].toUpperCase()
    const article = reference && articles.find(item => (item.number ?? item.id).toUpperCase() === reference)
    setExpanded(false)
    if (article) navigate(`/articles/${article.id}`)
    else onSearchLibrary?.(concern)
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    if (articlesOnly) { searchLibrary(); return }
    setExpanded(true); void run(query)
  }
  function close() { setExpanded(false); if (state.kind === 'loading') reset() }
  return <div className="support-search" ref={root} data-bidi-id="support-search"
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) close() }}
    onKeyDown={event => {
      if (event.key === 'Escape') { close(); root.current?.querySelector('input')?.focus() }
      if (event.key === 'ArrowDown' && event.target instanceof HTMLInputElement && expanded) {
        event.preventDefault(); root.current?.querySelector<HTMLAnchorElement>('.search-result')?.focus()
      }
    }}>
    <form className="search-form" role="search" onSubmit={submit}>
      <Field id="inquiry" label={articlesOnly ? 'Search knowledge articles' : 'Search cases and articles'} hideLabel value={query}
        placeholder={articlesOnly ? 'Search support articles…' : 'Ask a question, describe a problem, or check something already in progress.'}
        onChange={value => { reset(); setQuery(value); setExpanded(value.trim().length >= 2) }} autoComplete="off" />
      <button className="icon-button search-icon-button" type="submit" aria-label="Search support" aria-expanded={expanded} aria-controls="support-results"><Icon name="search" /></button>
    </form>
    {expanded && <section className="search-results" id="support-results" aria-label="Support search results" tabIndex={-1}>
      <div className="search-menu-head"><strong>Suggested matches</strong><small>{articlesOnly ? 'Support articles' : 'Cases and support articles'}</small></div>
      {state.kind !== 'idle' && state.query === query && <section className="panel ai-search-summary" aria-labelledby="ai-search-title" data-bidi-id="ai-search-summary">
        <h2 id="ai-search-title">AI knowledge answer <small>Preview</small></h2>
        <p className="muted">Knowledge articles only. AI-generated content may be incorrect. Check the sources.</p>
        <button className="button secondary small ai-search-dismiss" type="button" onClick={() => { reset(); root.current?.querySelector('input')?.focus() }}>
          {state.kind === 'loading' ? 'Cancel AI search' : 'Dismiss AI answer'}
        </button>
        {state.kind === 'demo' && <p role="status">AI search is unavailable in demo mode. No AI request was sent; suggested matches still work.</p>}
        {state.kind === 'setup-unavailable' && <p role="status">AI knowledge search is not enabled in this build. Knowledge-only search setup and approval must be verified before it can be enabled. No AI request was sent; suggested matches still work.</p>}
        {state.kind === 'loading' && <p role="status">Searching knowledge articles for an AI answer…</p>}
        {state.kind === 'empty' && <p role="status">No AI answer was found in the knowledge articles for this query. Try the suggested matches or a different phrase.</p>}
        {state.kind === 'disabled' && <div role="status">
          <p><strong>AI search summary is turned off for this site.</strong></p>
          <p>A site administrator must check tenant AI settings, then environment/site access in Copilot Hub. These override the maker toggle in Set up workspace → Copilot → Site search (preview) → Enable Site search with generative AI (preview).</p>
          <a href={GEN_AI_SEARCH_ENABLE_DOC_URL}>Enable AI search in Power Pages</a>
        </div>}
        {state.kind === 'error' && <div>
          <p role="alert">{state.error.message}</p>
          {['NETWORK', 'HTTP', 'SERVICE'].includes(state.error.code) && <button className="button secondary small" type="button" onClick={() => { root.current?.querySelector('input')?.focus(); void run(query) }}>Retry AI search</button>}
        </div>}
        {state.kind === 'success' && <>
          <p className="sr-only" role="status">AI knowledge answer ready. Review the answer and its sources.</p>
          {state.summary.title && <h3><bdi>{state.summary.title}</bdi></h3>}
          <p className="ai-search-answer" dir="auto">{state.summary.parts.map((part, index) => part.kind === 'text'
            ? <span key={index}>{part.text}</span>
            : <Link key={index} to={part.source.href} title={part.source.title} aria-label={`Source ${part.source.token}: ${part.source.title}`}><bdi>{part.source.token}</bdi></Link>)}</p>
          <h3 id="ai-search-sources">Knowledge sources</h3>
          <ul className="ai-search-sources" aria-labelledby="ai-search-sources">
            {state.summary.sources.map(source => <li key={source.token}><Link to={source.href}><bdi>{source.token} {source.title}</bdi></Link></li>)}
          </ul>
        </>}
      </section>}
      {groups.map(([key, label, group]) => group.length > 0 && <div className="search-group" role="group" aria-labelledby={`search-group-${key}`} key={key}>
        <span className="search-group-label" id={`search-group-${key}`}>{label}</span>
        {group.map(result => <Link key={result.id} className="search-result" to={result.path}>
          <span className="result-tile"><Icon name={result.kind === 'Case' ? 'case' : 'book'} /></span><span><strong><bdi>{result.title}</bdi></strong><small>{result.kind} · <bdi>{result.id}</bdi> · {result.meta}</small></span><Icon name="arrow" progression />
        </Link>)}
      </div>)}
      {!results.length && <p className="muted search-empty" role="status">{!concern ? 'Enter a product, booking reference or concern to search.'
        : articlesOnly ? 'No matching support articles. Try another phrase or sign in for personal support.' : 'No matching cases or articles. Try another phrase or prepare an issue draft.'}</p>}
      <div className="search-menu-footer">
        {articlesOnly
          ? <button type="button" className="text-link search-menu-all" onClick={searchLibrary}>{results.length
            ? 'View matching support articles'
            : <span>Search all support articles for “<bdi>{concern}</bdi>”</span>} <Icon name="arrow" progression /></button>
          : <>
            <button type="button" className="text-link search-menu-all" onClick={() => { close(); openAssistant(concern, Boolean(concern)) }}>{concern ? <span>Ask Northwind about “<bdi>{concern}</bdi>”</span> : 'Ask Northwind about this concern'} <Icon name="arrow" progression /></button>
            <button type="button" className="button secondary small" onClick={() => { close(); openAssistant(concern) }}><Icon name="spark" />Chat with an assistant</button>
          </>}
      </div>
    </section>}
  </div>
}
