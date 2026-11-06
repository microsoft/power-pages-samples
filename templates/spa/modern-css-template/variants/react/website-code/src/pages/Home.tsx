import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatDate, formatNumber } from '../data'
import { useSupport } from '../SupportContext'
import SupportSearch from '../components/SupportSearch'
import Field from '../components/Field'
import Icon from '../components/Icon'
import { SignInLink } from '../components/SignIn'
import { usePageTitle } from '../usePageTitle'

function HeroIllustration() {
  return <div className="hero-illustration" aria-hidden="true">
    <svg viewBox="0 0 300 250" fill="none" focusable="false">
      <circle className="art-amber" cx="252" cy="42" r="5" />
      <circle className="art-cyan" cx="43" cy="199" r="3" />
      <path className="art-sparkle" d="m270 119 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7ZM49 45l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z" />
      <g transform="rotate(-8 70 104)">
        <rect className="art-card-back" x="22" y="78" width="109" height="87" rx="15" />
        <path className="art-lines" d="M45 105h61M45 120h45M45 135h34" strokeWidth="6" strokeLinecap="round" />
        <circle className="art-amber" cx="48" cy="91" r="5" />
      </g>
      <g transform="rotate(5 171 128)">
        <rect className="art-card" x="91" y="62" width="157" height="126" rx="19" />
        <rect className="art-amber" x="108" y="80" width="39" height="39" rx="12" />
        <path className="art-spark" d="m127.5 87 3.1 7.4 7.4 3.1-7.4 3.1-3.1 7.4-3.1-7.4-7.4-3.1 7.4-3.1 3.1-7.4Z" />
        <path className="art-heading" d="M158 91h67M158 103h47" strokeWidth="5" strokeLinecap="round" />
        <rect className="art-row" x="108" y="133" width="123" height="37" rx="10" />
        <circle className="art-check-dot" cx="127" cy="151.5" r="9" />
        <path className="art-check" d="m123 151 3 3 5-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path className="art-row-lines" d="M144 148h68M144 157h48" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  </div>
}

function SupportLibrary({ query, setQuery }: { query: string; setQuery: (value: string) => void }) {
  const { articles, categories, isDemo, saved } = useSupport()
  const [params] = useSearchParams()
  const [category, setCategory] = useState('all')
  const [savedOnly, setSavedOnly] = useState(params.has('saved'))
  useEffect(() => { setSavedOnly(params.has('saved')) }, [params])
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const visible = articles.filter(item => (category === 'all' || item.category === category)
    && (!savedOnly || saved.includes(item.id))
    && terms.every(term => `${item.number ?? ''} ${item.title} ${item.description} ${item.keywords}`.toLowerCase().includes(term)))
  return <section className="support-library" id="support-library" tabIndex={-1} aria-labelledby="library-heading">
    <div className="library-heading"><h2 id="library-heading">Browse support library</h2></div>
    <div className="library-toolbar-row">
      <div className="filters library-categories" aria-label="Support library filters">
        {isDemo ? ([['all', 'All topics'], ['equipment', 'Equipment'], ['events', 'Events & bookings'], ['account', 'Account & billing']] as const).map(([value, label]) => <button key={value} className="filter-button" aria-pressed={category === value} onClick={() => setCategory(value)}>{label}</button>)
          : categories.map(item => <button key={item.id} className="filter-button" onClick={() => setQuery(item.name)} aria-label={`Search articles for ${item.name}`}><bdi>{item.name}</bdi></button>)}
        <button className="filter-button" aria-pressed={savedOnly} onClick={() => setSavedOnly(value => !value)}>Saved articles</button>
      </div>
      <div className="library-toolbar">
        <Field id="library-search" label="Search support articles" hideLabel type="search" value={query} onChange={setQuery} placeholder="Search equipment, bookings, billing…" />
        <Icon name="search" />
      </div>
    </div>
    <p className="muted library-count" role="status">{formatNumber(visible.length)} articles shown</p>
    <div className="library-grid">{visible.map(item => <article className="article-card" key={item.id}>
      <span className="eyebrow">{item.label} · <bdi>{item.number ?? item.id}</bdi></span><h3><bdi>{item.title}</bdi></h3><p><bdi>{item.description}</bdi></p><Link className="text-link" to={`/articles/${item.id}`} aria-label={`Read ${item.title}`}>Read article <Icon name="arrow" progression /></Link>
    </article>)}</div>
    {!visible.length && <div className="empty"><p>No articles match these filters.</p><button className="button secondary" onClick={() => { setCategory('all'); setQuery(''); setSavedOnly(false) }}>Clear filters</button></div>}
  </section>
}

function showLibrary() {
  const library = document.getElementById('support-library')
  library?.focus({ preventScroll: true })
  library?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function SignedOutHome() {
  usePageTitle('')
  const { knowledgeReady } = useSupport()
  const [inquiry, setInquiry] = useState('')
  const [libraryQuery, setLibraryQuery] = useState('')
  return <>
    <section className="agent-hero" aria-labelledby="welcome-heading">
      <HeroIllustration />
      <span className="eyebrow">Ask Northwind</span>
      <h1 id="welcome-heading">Welcome to Northwind support</h1>
      {knowledgeReady && <SupportSearch query={inquiry} onQueryChange={setInquiry} articlesOnly
        onSearchLibrary={value => { setLibraryQuery(value.trim()); requestAnimationFrame(showLibrary) }} />}
      <div className="hero-sign-in">
        <div className="hero-sign-in-copy">
          <span className="hero-sign-in-mark" aria-hidden="true"><Icon name="signIn" progression /></span>
          {knowledgeReady
            ? <span><strong>Still need help?</strong><small>Sign in to view your cases and get support for your account.</small></span>
            : <span><strong>Sign in for personal support</strong><small>Search support articles, view your cases, and get help with your account.</small></span>}
        </div>
        <SignInLink to="/" className="button accent hero-sign-in-button">Sign in to continue <Icon name="arrow" progression /></SignInLink>
      </div>
    </section>
    {knowledgeReady && <SupportLibrary query={libraryQuery} setQuery={setLibraryQuery} />}
  </>
}

export default function Home() {
  usePageTitle('')
  const { profile, cases, isDemo, signedIn, setIssueOpen, openAssistant } = useSupport()
  const [inquiry, setInquiry] = useState('')
  const [libraryQuery, setLibraryQuery] = useState('')
  if (!signedIn) return <SignedOutHome />
  const openCases = cases.filter(item => item.status === 'action' || item.status === 'progress')
  const actions = openCases.filter(item => item.status === 'action')
  return <>
    <section className="agent-hero" aria-labelledby="welcome-heading">
      <HeroIllustration />
      <span className="eyebrow">Ask Northwind</span>
      <h1 id="welcome-heading">Hi <bdi>{profile.name.split(/\s+/)[0]}</bdi>! How can we help you?</h1>
      <SupportSearch query={inquiry} onQueryChange={setInquiry} />
      <div className="hero-actions">
        <button type="button" className="button accent" onClick={() => openAssistant(inquiry.trim())}><Icon name="spark" />Ask assistant <Icon name="arrow" progression /></button>
        <button type="button" className="button hero-outline" onClick={() => setIssueOpen(true)}><Icon name="plus" />Report an issue</button>
      </div>
    </section>
    <div className="dashboard-grid">
      <section className="panel" aria-labelledby="actions-heading">
        <div className="section-heading"><div><span className="eyebrow">{isDemo ? 'Prioritized for you' : 'Your current requests'}</span><h2 id="actions-heading">{isDemo ? 'Your next actions' : 'Open cases'}</h2></div><Link className="text-link" to="/cases">View all cases</Link></div>
        {openCases.map(item => <div className="action-row" key={item.id}><span className={`action-dot${item.status === 'progress' ? ' update' : ''}`} aria-hidden="true" /><div><strong><bdi>{isDemo ? item.status === 'action' ? 'Review the requested identity evidence' : 'Review the firmware investigation update' : item.title}</bdi></strong><small><bdi>{item.number ?? item.id}</bdi> · Updated {formatDate(item.updated)}</small></div><Link className={`button${item.status === 'progress' ? ' secondary' : ''}`} to={`/cases/${item.id}`}>{item.status === 'action' ? 'Respond' : 'Review'}</Link></div>)}
        {!openCases.length && <p className="empty">No outstanding actions.</p>}
      </section>
      <aside className="panel" aria-label="Case snapshot">
        <span className="eyebrow">Case snapshot</span><span className="snapshot-number">{formatNumber(openCases.length)}</span><strong>{isDemo ? 'Open sample cases' : 'Your open cases'}</strong>
        <div className="snapshot-status">{isDemo
          ? <><div><span>Waiting on you</span><strong>{formatNumber(actions.length)}</strong></div><div><span>In progress</span><strong>{formatNumber(openCases.length - actions.length)}</strong></div><div><span>Local drafts</span><strong>{formatNumber(cases.filter(item => item.status === 'draft').length)}</strong></div></>
          : <><div><span>Active</span><strong>{formatNumber(openCases.length)}</strong></div><div><span>Resolved</span><strong>{formatNumber(cases.filter(item => item.status === 'resolved').length)}</strong></div><div><span>Cancelled</span><strong>{formatNumber(cases.filter(item => item.status === 'cancelled').length)}</strong></div></>}</div>
        <Link className="button secondary" to="/cases">View my cases</Link>
      </aside>
    </div>
    <SupportLibrary query={libraryQuery} setQuery={setLibraryQuery} />
  </>
}
