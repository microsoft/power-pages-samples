import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useSupport } from '../SupportContext'
import { formatNumber } from '../data'
import Icon, { type IconName } from './Icon'
import Dialog from './Dialog'
import Assistant from './Assistant'
import IssueDialog from './IssueDialog'
import { DemoSignInDialog, SignInLink, SignOutLink } from './SignIn'

const links: { path: string; label: string; icon: IconName; personal?: boolean }[] = [
  { path: '/', label: 'Ask Northwind', icon: 'spark' },
  { path: '/cases', label: 'My cases', icon: 'case', personal: true },
  { path: '/account', label: 'Account & support', icon: 'person', personal: true },
]
const signInPaths: { to: string; icon: IconName; title: string; detail: string }[] = [
  { to: '/#support-library', icon: 'book', title: 'Browse articles', detail: 'Sign in to search support guidance' },
  { to: '/', icon: 'alert', title: 'Report an issue', detail: 'Sign in to create a support case' },
  { to: '/', icon: 'spark', title: 'Chat with assistant', detail: 'Sign in for guided help' },
  { to: '/account#contact-support', icon: 'person', title: 'Contact support', detail: 'Sign in to message the team' },
]
export default function Layout({ children }: { children: ReactNode }) {
  const { isDemo, phase, loadError, refresh, notifications, setNotifications, openAssistant, setIssueOpen, realtime, caseAnnouncement, preferences, signedIn, signedOut, knowledgeReady, publicKnowledge } = useSupport()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const sidebarBell = useRef<HTMLButtonElement>(null)
  const mobileBell = useRef<HTMLButtonElement>(null)
  const notificationFocus = useRef<HTMLElement | null>(null)
  const [announcement, setAnnouncement] = useState({ sequence: 0, text: '', dialog: false })
  const unread = notifications.filter(item => !item.read).length
  const notificationStatus = phase !== 'ready' ? `Case notifications are unavailable until your support workspace loads.${loadError ? ` ${loadError}` : ''}`
    : realtime.error ? `Case updates could not be refreshed. ${realtime.error} Use Retry case updates to try again.`
    : realtime.state === 'waiting' ? 'Waiting for the Power Pages case update service.'
    : realtime.state === 'unavailable' ? 'Live case updates are unavailable on this page. Reload to check your current cases.'
    : preferences[0] || preferences[1] ? 'In-app updates for your personal cases are enabled for this tab. No email or device notifications are sent.'
    : 'New case and support-reply notifications are turned off in Account & support. Your case data still refreshes.'
  const announced = useRef({ sequence: caseAnnouncement.sequence, status: notificationStatus, open: notificationsOpen })
  const location = useLocation()
  function focusBell() {
    const bell = [sidebarBell.current, mobileBell.current].find(item => item && item.getClientRects().length > 0)
    bell?.focus()
  }
  function focusNotificationHeading() { document.querySelector<HTMLElement>('#notification-dialog h2')?.focus() }
  function releaseActionFocus(action: HTMLButtonElement) {
    if (document.activeElement !== action) return
    if (action.closest('#notification-dialog')) focusNotificationHeading()
    else focusBell()
  }
  useEffect(() => {
    function trackFocus(event: FocusEvent) {
      const target = event.target
      notificationFocus.current = target instanceof HTMLElement && target.closest('#notification-dialog, [data-case-updates-retry]') ? target : null
    }
    document.addEventListener('focusin', trackFocus)
    return () => document.removeEventListener('focusin', trackFocus)
  }, [])
  useLayoutEffect(() => {
    const previous = notificationFocus.current
    // Recover only focus owned by a notification control removed by an async update.
    if (!previous || document.activeElement !== document.body || (previous.isConnected && !previous.matches(':disabled'))) return
    if (notificationsOpen) focusNotificationHeading()
    else focusBell()
  }, [notifications, realtime.error, phase, notificationsOpen])
  useEffect(() => {
    const previous = announced.current
    announced.current = { sequence: caseAnnouncement.sequence, status: notificationStatus, open: notificationsOpen }
    if (isDemo) return
    const messages: string[] = []
    if (notificationsOpen && notificationStatus !== previous.status) messages.push(notificationStatus)
    if (caseAnnouncement.sequence !== previous.sequence && caseAnnouncement.count > 0) {
      messages.push(`${formatNumber(caseAnnouncement.count)} personal case ${caseAnnouncement.count === 1 ? 'update is' : 'updates are'} available in Notifications.`)
    }
    // Changing modal visibility must not replay a previously announced update.
    if (messages.length || notificationsOpen !== previous.open) {
      setAnnouncement(value => ({ sequence: value.sequence + 1, text: messages.join(' '), dialog: notificationsOpen }))
    }
  }, [caseAnnouncement, notificationStatus, notificationsOpen, isDemo])
  useEffect(() => {
    setMenuOpen(false); setNotificationsOpen(false)
    const frame = requestAnimationFrame(() => {
      const target = location.hash ? document.getElementById(location.hash.slice(1)) : document.getElementById('main-content')
      target?.focus({ preventScroll: true })
      if (location.hash) target?.scrollIntoView()
      else window.scrollTo({ top: 0 })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.pathname, location.hash])
  useEffect(() => { if (!signedIn) setNotificationsOpen(false) }, [signedIn])
  const navigation = <nav className="primary-nav" aria-label="Primary navigation">{links.filter(link => signedIn || !link.personal).map(link =>
    <NavLink key={link.path} to={link.path} end={link.path === '/'} className="nav-link" onClick={() => setMenuOpen(false)}><span className="nav-icon"><Icon name={link.icon} /></span>{link.label}</NavLink>)}</nav>
  const bell = (ref: Ref<HTMLButtonElement>, compact: boolean) => <button ref={ref} type="button" className={compact ? 'icon-button bell-button' : 'nav-link utility-link bell-button'} aria-label={`Notifications, ${formatNumber(unread)} unread`} aria-haspopup="dialog" aria-controls="notification-dialog" onClick={() => setNotificationsOpen(true)}>
    {compact ? <Icon name="bell" /> : <span className="utility-label"><span className="nav-icon"><Icon name="bell" /></span>Notifications</span>}
    {unread > 0 && <span className="count">{formatNumber(unread)}</span>}
  </button>
  const utilities = (inMenu: boolean) => <div className="sidebar-utilities">
    {signedIn && !inMenu && bell(sidebarBell, false)}
    {signedIn && <SignOutLink className="nav-link utility-link" onClick={() => setMenuOpen(false)}><span className="utility-label"><span className="nav-icon"><Icon name="signOut" progression /></span>Sign out</span></SignOutLink>}
    {signedOut && <SignInLink to={location.pathname + location.search + location.hash} className="nav-link utility-link" onClick={() => setMenuOpen(false)}><span className="utility-label"><span className="nav-icon"><Icon name="signIn" progression /></span>Sign in</span></SignInLink>}
    {signedIn && <button type="button" className="button secondary sidebar-report" onClick={() => { setMenuOpen(false); setIssueOpen(true) }}>Report an issue <Icon name="arrow" progression /></button>}
  </div>
  const hasArticleId = new URLSearchParams(location.search).has('id')
  const articleRoute = location.pathname.startsWith('/articles/') || (location.pathname === '/' && hasArticleId)
  const publicRoute = signedOut && (articleRoute ? knowledgeReady : location.pathname === '/')
  const loadingPublic = signedOut && articleRoute && publicKnowledge === 'loading'
  return <>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <div className="app">
      <aside className="sidebar" aria-label="Northwind workspace">
        <Link className="logo" to="/" aria-label="Northwind - Ask Northwind"><span className="logo-mark">N</span><span><strong>Northwind</strong><small>Field Services</small></span></Link>
        {navigation}
        {utilities(false)}
      </aside>
      <div className="main-column">
        <div className="mobile-bar">
          <button type="button" className="icon-button mobile-menu" aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="navigation-dialog" onClick={() => setMenuOpen(true)}><Icon name="menu" /></button>
          <Link className="mobile-logo" to="/" aria-label="Northwind - Ask Northwind"><span className="logo-mark">N</span><strong>Northwind</strong></Link>
          {signedIn && bell(mobileBell, true)}
        </div>
        {isDemo && <div className="demo-banner"><strong>Demo workspace.</strong> Sample data; edits and drafts last until reload. No requests, documents or messages are sent to support.</div>}
        {!isDemo && <div id="case-updates-live" className="sr-only" aria-live={notificationsOpen ? 'off' : 'polite'} aria-atomic="true">{!notificationsOpen && !announcement.dialog && announcement.text && <span key={announcement.sequence}>{announcement.text}</span>}</div>}
        {!isDemo && phase === 'ready' && realtime.error && <div className="notice"><p className="error" role="alert">Case updates could not be refreshed. {realtime.error}</p><button data-case-updates-retry className="button secondary small" onClick={event => { releaseActionFocus(event.currentTarget); realtime.retry() }}>Retry case updates</button></div>}
        <main id="main-content" tabIndex={-1}>
          <div className="page" key={location.pathname}>{signedIn || publicRoute ? children : <section className="panel stack" aria-busy={phase === 'loading' || loadingPublic}>
            <h1>{phase === 'loading' ? 'Loading your support workspace' : loadingPublic ? 'Loading support articles' : signedOut ? 'Sign in to customer support' : 'Support data is unavailable'}</h1>
            {phase === 'loading' ? <p role="status">Retrieving your profile, personal cases and published knowledge.</p> : loadingPublic ? <p role="status">Retrieving published knowledge.</p> : isDemo
              ? <><p>Sign in to view your cases, support articles and account details.</p><div className="actions"><SignInLink to={location.pathname + location.search + location.hash} className="button">Sign in</SignInLink></div></>
              : <><p role="alert">{loadError}</p><p>No sample records are substituted for unavailable customer data.</p><div className="actions"><a className="button" href="/SignIn?returnUrl=%2F">Sign in</a><button className="button secondary" onClick={() => void refresh()}>Try again</button></div></>}
          </section>}</div>
          {(signedIn || signedOut) && <section className="quick-paths" aria-labelledby="help-heading"><h2 id="help-heading">Still need help?</h2><div className="quick-path-grid">
            {signedIn ? <>
              <Link className="quick-path" to="/#support-library"><Icon name="book" /><span><strong>Browse articles</strong><small>Find support guidance</small></span></Link>
              <button className="quick-path" disabled={phase !== 'ready'} onClick={() => setIssueOpen(true)}><Icon name="alert" /><span><strong>Report an issue</strong><small>{isDemo ? 'Check guidance and prepare a draft' : 'Create a personal support case'}</small></span></button>
              <button className="quick-path" onClick={() => openAssistant()}><Icon name="spark" /><span><strong>Chat with assistant</strong><small>Follow a guided resolution path</small></span></button>
              <Link className="quick-path" to="/account#contact-support"><Icon name="person" /><span><strong>Contact support</strong><small>{isDemo ? 'Prepare a message or callback' : 'Save a support-contact request'}</small></span></Link>
            </> : signInPaths.map(item => item.title === 'Browse articles' && knowledgeReady
              ? <Link key={item.title} className="quick-path" to="/#support-library"><Icon name="book" /><span><strong>Browse articles</strong><small>Find support guidance</small></span></Link>
              : <SignInLink key={item.title} to={item.to} className="quick-path"><Icon name={item.icon} /><span><strong>{item.title}</strong><small>{item.detail}</small></span></SignInLink>)}
          </div></section>}
          <footer className="site-footer"><span>Northwind Field Services · Customer Support</span><span>{isDemo ? 'Demonstration content. Not connected to a live service.' : 'Signed-in customers can access their own cases. Bookmarks and notification preferences stay in this browser tab. No automated email or callback booking.'}</span></footer>
        </main>
      </div>
    </div>
    <Dialog id="navigation-dialog" title="Navigation" open={menuOpen} onClose={() => setMenuOpen(false)}><div className="mobile-nav">{navigation}{utilities(true)}</div></Dialog>
    <Dialog id="notification-dialog" title="Notifications" eyebrow="In-app updates" variant="popover" open={notificationsOpen && signedIn} onClose={() => setNotificationsOpen(false)}>
      {!isDemo && <div id="notification-updates-live" className="sr-only" aria-live={notificationsOpen ? 'polite' : 'off'} aria-atomic="true">{notificationsOpen && announcement.dialog && announcement.text && <span key={announcement.sequence}>{announcement.text}</span>}</div>}
      {unread > 0 && <button className="button secondary" onClick={event => { releaseActionFocus(event.currentTarget); setNotifications(items => items.map(item => ({ ...item, read: true }))) }}>Mark all as read</button>}
      {!isDemo && <p className="muted">{notificationStatus}</p>}
      {!isDemo && phase === 'ready' && realtime.error && <button data-case-updates-retry className="button secondary" onClick={event => { releaseActionFocus(event.currentTarget); realtime.retry() }}>Retry case updates</button>}
      {!notifications.length && <p role="status">{isDemo ? 'You are all caught up. No notifications to show.' : 'No in-app notifications to show.'}</p>}
      {notifications.map(item => <article className={`notification-item${item.read ? '' : ' unread'}`} key={item.id}>
        <span className="eyebrow">{item.read ? 'Read' : isDemo ? 'New sample update' : item.kind === 'reply' ? 'New support reply' : 'New case update'}</span><h3><bdi>{item.title}</bdi></h3><p dir="auto">{item.detail}</p>
        <div className="actions"><Link className="text-link" to={`/cases/${item.caseId}${item.kind === 'reply' ? '#case-conversation' : ''}`} onClick={() => { setNotifications(items => items.map(current => current.id === item.id ? { ...current, read: true } : current)); setNotificationsOpen(false) }}>Open case <Icon name="arrow" progression /></Link>
          <button className="button secondary small" disabled={item.read} onClick={event => { releaseActionFocus(event.currentTarget); setNotifications(items => items.map(current => current.id === item.id ? { ...current, read: true } : current)) }}>{item.read ? 'Marked read' : 'Mark read'}</button>
          <button className="button secondary small" onClick={event => { releaseActionFocus(event.currentTarget); setNotifications(items => items.filter(current => current.id !== item.id)) }}>Dismiss</button></div>
      </article>)}
    </Dialog>
    {signedIn && <Assistant />}
    <IssueDialog /><DemoSignInDialog />
  </>
}
