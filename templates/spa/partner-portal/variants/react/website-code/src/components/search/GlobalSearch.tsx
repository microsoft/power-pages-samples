import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Avatar,
  Button,
  Caption1,
  makeStyles,
  mergeClasses,
  shorthands,
  Skeleton,
  SkeletonItem,
  Text,
  Title3,
  tokens,
  Tooltip,
  ToggleButton,
} from '@fluentui/react-components'
import {
  Add20Regular,
  ArrowLeft20Regular,
  ArrowRight16Regular,
  Briefcase20Regular,
  Building20Regular,
  Clock20Regular,
  Delete20Regular,
  Dismiss20Regular,
  ClipboardTaskListLtr20Regular,
  Document20Regular,
  History20Regular,
  Mail20Regular,
  MailInbox20Regular,
  Person20Regular,
  QuestionCircle20Regular,
  Ribbon20Regular,
  Search20Regular,
} from '@fluentui/react-icons'
import { useApp } from '../../store/AppStore'
import { can, distributedOpportunities, PARTNER_ROLES } from '../../lib/access'
import { nextTurnId, startersFor } from '../../lib/assistant'
import {
  contextualActions,
  itemMeta,
  itemPath,
  looksLikeQuestion,
  matchedActions,
  quickActions,
  TYPE_LABELS,
  TYPE_ORDER,
  urgencyOf,
  type ActionIcon,
  type SearchAction,
  type SearchHit,
  type SearchItem,
  type SearchType,
} from '../../lib/search'
import { loadRecent, pushRecent, saveRecent, searchAll, type RecentEntry, type SearchOutcome } from '../../services/search'
import { StatusBadge } from '../ui'
import { ON_NAVY_FG, SHELL_ACCENT, SHELL_TEXT, withAlpha } from '../../theme/fluentTheme'
import { AssistantChat, type ChatMode, type ChatTurn } from './AssistantChat'
import { AssistantIcon } from './AssistantIcon'
import { M3_DURATION, M3_EASING } from '../../lib/motion'
import { useRoutePreload } from '../../hooks/useRoutePreload'
import { preloadRoute } from '../../lib/routeModules'

/** Debounce before a typed query is searched (live: one server logic call per pause). */
const DEBOUNCE_MS = 200
const GROUP_LIMIT = 4

const useStyles = makeStyles({
  root: { position: 'relative', display: 'flex', alignItems: 'center', minWidth: 0 },
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    height: '40px',
    width: '100%',
    paddingInlineStart: tokens.spacingHorizontalM,
    paddingInlineEnd: tokens.spacingHorizontalXS,
    borderRadius: tokens.borderRadiusXLarge,
    border: `${tokens.strokeWidthThin} solid ${withAlpha(SHELL_ACCENT, 0.35)}`,
    backgroundColor: withAlpha(ON_NAVY_FG, 0.07),
    color: SHELL_TEXT,
    cursor: 'text',
    transitionProperty: 'background-color, border-color',
    transitionDuration: tokens.durationFaster,
    ':hover': { backgroundColor: withAlpha(ON_NAVY_FG, 0.12), ...shorthands.borderColor(SHELL_ACCENT) },
    ':focus-within': { ...shorthands.borderColor(SHELL_ACCENT) },
  },
  barActive: {
    paddingInlineStart: '2px',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderColor(tokens.colorNeutralBackground1),
    color: tokens.colorNeutralForeground2,
    ':hover': { backgroundColor: tokens.colorNeutralBackground1, ...shorthands.borderColor(tokens.colorNeutralBackground1) },
    ':focus-within': {
      ...shorthands.borderColor(tokens.colorNeutralBackground1),
      outlineWidth: '2px',
      outlineStyle: 'solid',
      outlineColor: SHELL_ACCENT,
      outlineOffset: '1px',
    },
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    color: ON_NAVY_FG,
    fontFamily: 'inherit',
    fontSize: tokens.fontSizeBase300,
    paddingInlineStart: tokens.spacingHorizontalS,
    paddingInlineEnd: tokens.spacingHorizontalXS,
    '::placeholder': { color: SHELL_TEXT, opacity: 1 },
    '::-webkit-search-cancel-button': { display: 'none' },
    '@media (max-width: 767px)': { fontSize: tokens.fontSizeBase400 },
  },
  inputActive: { color: tokens.colorNeutralForeground1, '::placeholder': { color: tokens.colorNeutralForeground3 } },
  onNavyIcon: { color: SHELL_TEXT, ':hover': { color: ON_NAVY_FG, backgroundColor: withAlpha(ON_NAVY_FG, 0.1) }, '& .fui-Button__icon': { color: 'inherit' } },
  askOnNavy: { color: SHELL_ACCENT },
  askActive: { color: tokens.colorBrandForeground1 },
  kbd: {
    fontFamily: 'inherit',
    fontSize: tokens.fontSizeBase100,
    lineHeight: '16px',
    paddingInlineStart: '5px',
    paddingInlineEnd: '5px',
    borderRadius: tokens.borderRadiusSmall,
    border: `${tokens.strokeWidthThin} solid ${withAlpha(SHELL_TEXT, 0.5)}`,
    marginInlineStart: tokens.spacingHorizontalXS,
    marginInlineEnd: tokens.spacingHorizontalXS,
    whiteSpace: 'nowrap',
  },
  surface: {
    position: 'fixed',
    insetInlineStart: 0,
    insetInlineEnd: 0,
    bottom: 0,
    zIndex: 40,
    overflowY: 'auto',
    backgroundColor: tokens.colorNeutralBackground1,
    paddingTop: tokens.spacingVerticalM,
    // Clears the always-visible assistant FAB (56px + 24px margin) so the last results stay reachable.
    paddingBottom: '104px',
    overscrollBehavior: 'contain',
    // M3 search view: results fade down from the expanded bar.
    animationName: { from: { opacity: 0, transform: 'translateY(-8px)' }, to: { opacity: 1, transform: 'none' } },
    animationDuration: `${M3_DURATION.medium2}ms`,
    animationTimingFunction: M3_EASING.emphasized,
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
  },
  col: { maxWidth: '720px', paddingInlineStart: tokens.spacingHorizontalS, paddingInlineEnd: tokens.spacingHorizontalS },
  colWide: { maxWidth: '880px' },
  chips: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    overflowX: 'auto',
    paddingTop: tokens.spacingVerticalXS,
    paddingBottom: tokens.spacingVerticalS,
    paddingInlineStart: tokens.spacingHorizontalS,
    scrollbarWidth: 'none',
  },
  chip: { flexShrink: 0, borderRadius: tokens.borderRadiusXLarge, fontWeight: tokens.fontWeightRegular },
  chipCount: { color: tokens.colorNeutralForeground2, marginInlineStart: tokens.spacingHorizontalXS },
  group: { marginTop: tokens.spacingVerticalL, ':first-child': { marginTop: tokens.spacingVerticalXS } },
  groupLabel: {
    display: 'flex',
    alignItems: 'center',
    minHeight: '36px',
    paddingInlineStart: tokens.spacingHorizontalL,
    color: tokens.colorNeutralForeground2,
    fontWeight: tokens.fontWeightSemibold,
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
    minHeight: '56px',
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingInlineStart: tokens.spacingHorizontalL,
    paddingInlineEnd: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusXLarge,
    cursor: 'pointer',
    transitionProperty: 'background-color',
    transitionDuration: tokens.durationFaster,
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
    '@media (max-width: 639px)': { gap: tokens.spacingHorizontalM },
  },
  optionActive: {
    backgroundColor: tokens.colorBrandBackground2,
    boxShadow: `inset 3px 0 0 ${tokens.colorBrandStroke1}`,
    ':hover': { backgroundColor: tokens.colorBrandBackground2 },
  },
  optionCompact: { minHeight: '48px' },
  lead: { width: '40px', height: '40px', display: 'grid', placeItems: 'center', flexShrink: 0, color: tokens.colorNeutralForeground2 },
  leadAi: { borderRadius: tokens.borderRadiusCircular, backgroundColor: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand },
  leadAction: { borderRadius: tokens.borderRadiusCircular, backgroundColor: tokens.colorBrandBackground2, color: tokens.colorBrandForeground1 },
  main: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' },
  title: {
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  titleLink: { color: tokens.colorBrandForeground1, fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase300 },
  meta: { color: tokens.colorNeutralForeground2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  metaWrap: { whiteSpace: 'normal' },
  why: { color: tokens.colorNeutralForeground1 },
  side: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, flexShrink: 0 },
  sideSecondary: { '@media (max-width: 639px)': { display: 'none' } },
  mark: { backgroundColor: 'transparent', color: 'inherit', fontWeight: tokens.fontWeightBold },
  skeletonRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
    minHeight: '56px',
    paddingInlineStart: tokens.spacingHorizontalL,
    paddingInlineEnd: tokens.spacingHorizontalL,
  },
  note: { display: 'block', paddingInlineStart: tokens.spacingHorizontalL, paddingTop: tokens.spacingVerticalM, color: tokens.colorNeutralForeground2 },
  empty: {
    display: 'block',
    paddingInlineStart: tokens.spacingHorizontalL,
    paddingInlineEnd: tokens.spacingHorizontalL,
    paddingTop: tokens.spacingVerticalXL,
    color: tokens.colorNeutralForeground2,
  },
  keys: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalL,
    marginTop: tokens.spacingVerticalXXL,
    paddingInlineStart: tokens.spacingHorizontalL,
    color: tokens.colorNeutralForeground2,
    '@media (max-width: 1023px)': { display: 'none' },
  },
  keyHint: {
    fontFamily: 'inherit',
    fontSize: tokens.fontSizeBase100,
    paddingInlineStart: '5px',
    paddingInlineEnd: '5px',
    marginInlineEnd: tokens.spacingHorizontalXS,
    borderRadius: tokens.borderRadiusSmall,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    borderBottomWidth: '2px',
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  resTitle: {
    display: 'block',
    marginTop: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalS,
    paddingInlineStart: tokens.spacingHorizontalL,
    color: tokens.colorNeutralForeground1,
  },
  srOnly: { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' },
})

const reEscape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function Highlight({ text, query }: { text: string; query: string }) {
  const s = useStyles()
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(t => t.length > 1)
  if (!terms.length || !text) return <>{text}</>
  const parts = text.split(new RegExp(`(${terms.map(reEscape).join('|')})`, 'gi'))
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <mark key={i} className={s.mark}>
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  )
}

const ACTION_ICONS: Record<ActionIcon, ReactNode> = {
  add: <Add20Regular />,
  inbox: <MailInbox20Regular />,
  mail: <Mail20Regular />,
  person: <Person20Regular />,
  ribbon: <Ribbon20Regular />,
  clock: <Clock20Regular />,
}

function ItemLead({ item }: { item: SearchItem }) {
  if (item.type === 'contact' || item.type === 'partner') return <Avatar name={item.title} size={40} color="colorful" aria-hidden />
  if (item.faq) return <QuestionCircle20Regular />
  const icons: Record<SearchType, ReactNode> = {
    opp: <Briefcase20Regular />,
    account: <Building20Regular />,
    contact: null,
    partner: null,
    workorder: <ClipboardTaskListLtr20Regular />,
    page: <Document20Regular />,
  }
  return <>{icons[item.type]}</>
}

function ItemBadges({ item }: { item: SearchItem }) {
  const s = useStyles()
  const urgency = urgencyOf(item)
  return (
    <>
      {urgency && <StatusBadge status={urgency} tone="amber" />}
      <span className={mergeClasses(s.side, s.sideSecondary)}>
        {item.collaboration && <StatusBadge status="Read-only" tone="slate" />}
        {(item.type === 'opp' || item.type === 'workorder') && item.status && <StatusBadge status={item.status} />}
        {item.active === false && <StatusBadge status="Inactive" />}
      </span>
    </>
  )
}

interface Option {
  id: string
  run: () => void
  to?: string
}

/**
 * Top app bar global search (Material 3 search pattern): the bar expands in place when focused and the page
 * area becomes the search surface — suggestions before typing, actions and records inline as you type, all
 * results on Enter — and "Ask Partner assistant" opens a full-screen chat. Records come from the
 * `global-search` server logic in live mode and the scoped seed store in mock mode.
 */
export function GlobalSearch({ active, onActiveChange }: { active: boolean; onActiveChange: (active: boolean) => void }) {
  const s = useStyles()
  const { db, session } = useApp()
  const navigate = useNavigate()
  const preload = useRoutePreload()
  const location = useLocation()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const quietFocus = useRef(false)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'suggest' | 'results'>('suggest')
  const [scope, setScope] = useState<'all' | SearchType>('all')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ q: string; sessionKey: string; attempt: number; outcome: SearchOutcome } | null>(null)
  const [recent, setRecent] = useState<RecentEntry[]>(() => loadRecent(session))
  // closed → nothing; full → full-screen modal; panel → floating window; fab → floating button.
  const [chatMode, setChatMode] = useState<ChatMode>('closed')
  const chatOpen = chatMode === 'full'
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [geometry, setGeometry] = useState({ top: 56, start: 0, wide: true })
  const role = session.role
  const partner = PARTNER_ROLES.includes(role)
  // The Partner assistant answers over sales records; the Technician workspace doesn't offer it.
  const technician = can(role, 'work-orders')
  const assistant = !technician
  const q = query.trim()
  const sessionKey = `${role}:${session.contact?.id ?? ''}`
  const currentResult = result?.q === q && result.sessionKey === sessionKey && result.attempt === attempt ? result.outcome : undefined
  const loading = !!q && !currentResult

  // Recent items and the conversation belong to the signed-in contact (reset during render, not in an effect).
  const [stateSessionKey, setStateSessionKey] = useState(sessionKey)
  if (stateSessionKey !== sessionKey) {
    setStateSessionKey(sessionKey)
    setRecent(loadRecent(session))
    setTurns([])
    setChatMode('closed')
    setQuery('')
    setResult(null)
  }

  // Focus moves after commit: the mobile trigger only re-mounts once search closes.
  const [focusRequest, setFocusRequest] = useState<{ target: 'input' | 'trigger'; quiet: boolean } | null>(null)
  useEffect(() => {
    if (!focusRequest) return
    if (focusRequest.target === 'trigger') triggerRef.current?.focus()
    else if (document.activeElement !== inputRef.current) {
      quietFocus.current = focusRequest.quiet
      inputRef.current?.focus()
    }
  }, [focusRequest])

  const measure = useCallback(() => {
    const header = rootRef.current?.closest('header')
    const bar = rootRef.current?.getBoundingClientRect()
    const wide = window.innerWidth >= 1024
    const rtl = document.dir === 'rtl'
    setGeometry({
      top: Math.max(0, header?.getBoundingClientRect().bottom ?? 56),
      start: wide && bar ? Math.max(0, rtl ? window.innerWidth - bar.right : bar.left) : 0,
      wide,
    })
  }, [])

  const close = useCallback(
    (returnFocus = false) => {
      onActiveChange(false)
      setQuery('')
      setView('suggest')
      setScope('all')
      setActiveIndex(-1)
      setResult(null)
      if (returnFocus) setFocusRequest({ target: window.innerWidth < 768 ? 'trigger' : 'input', quiet: true })
    },
    [onActiveChange],
  )

  const open = useCallback(() => {
    if (!active) onActiveChange(true)
  }, [active, onActiveChange])

  // Geometry follows the expanded bar; the page behind does not scroll while search is focused.
  useEffect(() => {
    if (!active) return
    const frame = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    const html = document.documentElement
    const previous = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
      html.style.overflow = previous
    }
  }, [active, measure])

  // Navigation (including opening a result) dismisses search; a full-screen assistant docks into the floating
  // window so the conversation stays available on the new page.
  const destination = location.pathname + location.search
  const lastDestination = useRef(destination)
  useEffect(() => {
    if (lastDestination.current === destination) return
    lastDestination.current = destination
    setChatMode(m => (m === 'full' ? 'panel' : m))
    close()
  }, [destination, close])

  // Debounced search; stale requests are aborted.
  useEffect(() => {
    if (!q || !active) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchAll(q, { db, session }, controller.signal)
        .then(outcome => {
          if (!controller.signal.aborted) setResult({ q, sessionKey, attempt, outcome })
        })
        .catch(e => {
          if (controller.signal.aborted) return
          console.warn('Global search failed:', e)
          setResult({ q, sessionKey, attempt, outcome: { status: 'error', hits: [], message: 'Search is unavailable. Try again.' } })
        })
    }, DEBOUNCE_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [q, db, session, sessionKey, active, attempt])

  // Ctrl/⌘ K toggles search; "/" focuses it when not typing elsewhere.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing = !!target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (chatOpen) return
        if (active) close(true)
        else {
          onActiveChange(true)
          requestAnimationFrame(() => inputRef.current?.focus())
        }
      } else if (e.key === '/' && !typing && !active && !chatOpen && !e.defaultPrevented) {
        e.preventDefault()
        onActiveChange(true)
        requestAnimationFrame(() => inputRef.current?.focus())
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, chatOpen, close, onActiveChange])

  const remember = (entry: RecentEntry) => setRecent(pushRecent(session, entry))

  const openItem = (item: SearchItem) => {
    if (item.type !== 'page' || item.faq) remember({ kind: 'item', item })
    close()
    navigate(itemPath(item))
  }
  /** Links in the assistant open the page and keep the conversation in the floating window. */
  const openItemFromChat = (item: SearchItem) => {
    setChatMode('panel')
    openItem(item)
  }
  const runAction = (a: SearchAction) => {
    close()
    if (a.path.startsWith('mailto:')) window.location.assign(a.path)
    else navigate(a.path)
  }
  const openChat = (message?: string) => {
    if (message) setTurns(t => [...t, { id: nextTurnId(), role: 'user', text: message }])
    setChatMode('full')
  }
  const showResults = (type: 'all' | SearchType = 'all') => {
    if (!q) return
    remember({ kind: 'query', text: q })
    setView('results')
    setScope(type)
    setActiveIndex(-1)
  }

  const waiting = useMemo(() => (role === 'anonymous' ? 0 : distributedOpportunities(db, session).length), [db, session, role])
  const actions = useMemo(() => quickActions(role, waiting), [role, waiting])

  /* ----------------------------- Option model ----------------------------- */
  const options: Option[] = []
  const option = (id: string, run: () => void, content: ReactNode, opts: { compact?: boolean; to?: string } = {}) => {
    const index = options.push({ id, run, to: opts.to }) - 1
    return (
      <div
        key={id}
        id={`gs-opt-${index}`}
        role="option"
        {...(opts.to ? preload(opts.to) : {})}
        aria-selected={index === activeIndex}
        className={mergeClasses(s.option, index === activeIndex && s.optionActive, opts.compact && s.optionCompact)}
        onMouseDown={e => e.preventDefault()}
        onClick={run}
      >
        {content}
      </div>
    )
  }
  const row = (lead: ReactNode, leadClass: string | undefined, title: ReactNode, meta?: ReactNode, side?: ReactNode, wrapMeta = false) => (
    <>
      <span className={mergeClasses(s.lead, leadClass)} aria-hidden="true">
        {lead}
      </span>
      <span className={s.main}>
        <Text className={s.title}>{title}</Text>
        {meta && <Caption1 className={mergeClasses(s.meta, wrapMeta && s.metaWrap)}>{meta}</Caption1>}
      </span>
      {side && <span className={s.side}>{side}</span>}
    </>
  )
  const group = (key: string, label: string | null, children: ReactNode) => (
    <div key={key} role="group" aria-labelledby={label ? `gs-g-${key}` : undefined} aria-label={label ? undefined : key} className={s.group}>
      {label && (
        <div id={`gs-g-${key}`} className={s.groupLabel}>
          {label}
        </div>
      )}
      {children}
    </div>
  )
  const actionOption = (a: SearchAction) =>
    option(
      `action:${a.id}`,
      () => runAction(a),
      row(ACTION_ICONS[a.icon], s.leadAction, a.label, undefined, a.badge ? <StatusBadge status={a.badge} tone="amber" /> : undefined),
      { to: a.path },
    )
  const resultOption = (h: SearchHit, rich = false) => {
    const meta = itemMeta(h.item).filter(Boolean)
    const why = h.field ? (
      <span className={s.why}>
        Matched on {h.field.label.toLowerCase()}: <Highlight text={h.field.value} query={q} />
      </span>
    ) : null
    return option(
      `item:${h.item.type}:${h.item.id}`,
      () => openItem(h.item),
      row(
        <ItemLead item={h.item} />,
        undefined,
        <Highlight text={h.item.title} query={q} />,
        <>
          {rich && `${h.item.faq ? 'FAQ' : TYPE_LABELS[h.item.type].one} · `}
          <Highlight text={meta.join(' · ')} query={q} />
          {why &&
            (rich ? (
              <>
                <br />
                {why}
              </>
            ) : (
              <> · {why}</>
            ))}
        </>,
        <ItemBadges item={h.item} />,
        rich,
      ),
      { to: itemPath(h.item) },
    )
  }
  const askOption = (message: string, title: ReactNode, meta: string) =>
    option(`ask:${message}`, () => openChat(message), row(<AssistantIcon size={20} />, s.leadAi, title, meta))

  let body: ReactNode
  let status = ''
  let chips: ReactNode = null
  const hits = currentResult?.hits ?? []
  const incomplete = currentResult?.status === 'partial' || currentResult?.status === 'error'
  const shownCount = (scope === 'all' ? hits : hits.filter(h => h.item.type === scope)).length
  const resultsHeading = loading
    ? `Searching for “${q}”…`
    : currentResult?.status === 'error'
      ? `Search unavailable for “${q}”`
      : incomplete
        ? `Partial results for “${q}”`
        : `Showing ${shownCount} result${shownCount === 1 ? '' : 's'} for “${q}”`
  const counts = hits.reduce<Partial<Record<SearchType, number>>>((acc, h) => ({ ...acc, [h.item.type]: (acc[h.item.type] ?? 0) + 1 }), {})
  const types = TYPE_ORDER.filter(t => counts[t]).sort((a, b) => hits.findIndex(h => h.item.type === a) - hits.findIndex(h => h.item.type === b))
  const chipBar = (current: typeof scope) =>
    hits.length > 0 && (
      <div className={s.chips} role="toolbar" aria-label="Filter results by type">
        {(['all', ...types] as const).map(t => (
          <ToggleButton
            key={t}
            size="medium"
            appearance={current === t ? 'primary' : 'outline'}
            checked={current === t}
            className={s.chip}
            onClick={() => {
              setScope(t)
              setActiveIndex(-1)
              setFocusRequest({ target: 'input', quiet: false })
            }}
          >
            {t === 'all' ? 'All' : TYPE_LABELS[t].plural}
            <span className={current === t ? undefined : s.chipCount}>&nbsp;{t === 'all' ? hits.length : counts[t]}</span>
          </ToggleButton>
        ))}
      </div>
    )

  if (active && view === 'results' && q) {
    const shown = scope === 'all' ? hits : hits.filter(h => h.item.type === scope)
    status = resultsHeading
    chips = !loading && chipBar(scope)
    body = loading ? null : (
      <>
        {assistant &&
          group(
            'assistant',
            null,
            askOption(`Summarize the results for "${q}"`, 'Ask Partner assistant about these results', 'A summary with links to each record'),
          )}
        {types
          .filter(t => scope === 'all' || scope === t)
          .map(t =>
            group(
              `r-${t}`,
              TYPE_LABELS[t].plural,
              shown.filter(h => h.item.type === t).map(h => resultOption(h, true)),
            ),
          )}
      </>
    )
  } else if (active && !q) {
    const recentRows = recent.map(e =>
      e.kind === 'query'
        ? option(
            `recent:q:${e.text}`,
            () => {
              setQuery(e.text)
              setActiveIndex(-1)
            },
            row(<History20Regular />, undefined, e.text, 'Recent search'),
          )
        : option(
            `recent:i:${e.item.type}:${e.item.id}`,
            () => openItem(e.item),
            row(
              <ItemLead item={e.item} />,
              undefined,
              e.item.title,
              `${TYPE_LABELS[e.item.type].one} · ${itemMeta(e.item).filter(Boolean)[0] ?? ''}`,
              <ItemBadges item={e.item} />,
            ),
            { to: itemPath(e.item) },
          ),
    )
    body = (
      <>
        {assistant &&
          group(
            'prompts',
            'Partner assistant',
            startersFor(role)
              .slice(0, 3)
              .map(st => askOption(st.q, st.q, st.hint)),
          )}
        {recent.length > 0
          ? group('recent', 'Recent', [
              ...recentRows,
              option(
                'recent:clear',
                () => {
                  saveRecent(session, [])
                  setRecent([])
                  setActiveIndex(-1)
                },
                row(<Delete20Regular />, undefined, <span className={s.titleLink}>Clear recent</span>),
                { compact: true },
              ),
            ])
          : group(
              'popular',
              'Popular pages',
              (technician
                ? [{ path: '/work-orders/', title: 'Work orders', description: 'Visits assigned to you or your organization.' }]
                : [
                {
                  path: '/partner-program/partner-program-details/',
                  title: 'Program details',
                  description: 'Tiers, criteria, benefits and partner responsibilities.',
                },
                { path: '/partner-program/become-a-partner/', title: 'Become a partner', description: 'How to apply to the partner program.' },
                {
                  path: '/partner-program/partner-program-FAQs/',
                  title: 'Frequently asked questions',
                  description: 'Deal registration, distributed opportunities and partner roles.',
                },
              ]).map(p =>
                resultOption({ item: { type: 'page', id: `page:${p.path}`, title: p.title, path: p.path, description: p.description, fields: {} }, score: 0 }),
              ),
            )}
        {actions.length > 0 && group('actions', 'Quick actions', actions.map(actionOption))}
      </>
    )
  } else if (active && q) {
    const question = looksLikeQuestion(q)
    const acts = loading ? [] : [...matchedActions(actions, q), ...contextualActions(hits, role)].slice(0, 4)
    chips = !loading && chipBar(scope)
    status = loading
      ? 'Searching…'
      : incomplete
        ? currentResult?.status === 'error'
          ? 'Search unavailable'
          : 'Partial search results'
        : hits.length
          ? `${hits.length} result${hits.length === 1 ? '' : 's'} for ${q}`
          : `No results for ${q}`
    body = (
      <>
        {assistant &&
          group(
            'assistant',
            null,
            askOption(
              q,
              <>Ask Partner assistant: “{q}”</>,
              question
                ? 'Looks like a question — press Enter to ask'
                : partner
                  ? 'Opens a full-screen chat · answers cite records you can access'
                  : 'Answers about the partner program',
            ),
          )}
        {loading ? (
          <div aria-hidden="true">
            <Caption1 className={s.note}>Searching records you can access…</Caption1>
            <Skeleton>
              {[42, 37, 32, 27].map(w => (
                <div key={w} className={s.skeletonRow}>
                  <SkeletonItem shape="circle" size={40} />
                  <div className="flex flex-col gap-2 flex-1">
                    <SkeletonItem size={12} style={{ width: `${w}%` }} />
                    <SkeletonItem size={12} style={{ width: `${w + 26}%` }} />
                  </div>
                </div>
              ))}
            </Skeleton>
          </div>
        ) : (
          <>
            {acts.length > 0 && scope === 'all' && group('actions', 'Actions', acts.map(actionOption))}
            {types
              .filter(t => scope === 'all' || scope === t)
              .map(t => {
                const rows = hits.filter(h => h.item.type === t)
                const limit = scope === 'all' ? GROUP_LIMIT : 20
                return group(t, TYPE_LABELS[t].plural, [
                  ...rows.slice(0, limit).map(h => resultOption(h)),
                  ...(rows.length > limit
                    ? [
                        option(
                          `more:${t}`,
                          () => showResults(t),
                          row(
                            <ArrowRight16Regular />,
                            undefined,
                            <span className={s.titleLink}>
                              Show all {rows.length} {TYPE_LABELS[t].plural.toLowerCase()}
                            </span>,
                          ),
                          { compact: true },
                        ),
                      ]
                    : []),
                ])
              })}
            {hits.length > 0 &&
              group(
                'all',
                null,
                option(
                  'all',
                  () => showResults(),
                  row(
                    <Search20Regular />,
                    undefined,
                    <span className={s.titleLink}>
                      Show all {hits.length} result{hits.length === 1 ? '' : 's'} for “{q}”
                    </span>,
                    undefined,
                    <ArrowRight16Regular />,
                  ),
                  { compact: true },
                ),
              )}
            {!incomplete && !hits.length && !acts.length && !currentResult?.message && (
              <Text className={s.empty}>
                <strong>No records or pages match “{q}”.</strong>{' '}
                {technician
                  ? 'Try a work order number, customer, site or asset.'
                  : partner
                    ? 'Try a customer, opportunity, contact or email — or ask the assistant.'
                    : 'Customer and opportunity records are available to partners. Try asking the assistant.'}
              </Text>
            )}
          </>
        )}
      </>
    )
  }

  const retry =
    active && q && incomplete
      ? group(
          'retry',
          null,
          option(
            'retry',
            () => {
              setAttempt(value => value + 1)
              setActiveIndex(-1)
              setFocusRequest({ target: 'input', quiet: false })
            },
            row(<Search20Regular />, undefined, 'Retry search'),
          ),
        )
      : null

  const activeId = activeIndex >= 0 && activeIndex < options.length ? `gs-opt-${activeIndex}` : undefined

  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!active && ['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) open()
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const n = options.length
      if (!n) return
      const next = activeIndex + (e.key === 'ArrowDown' ? 1 : -1)
      const index = next >= n ? -1 : next < -1 ? n - 1 : next
      setActiveIndex(index)
      const to = options[index]?.to
      if (to) void preloadRoute(to)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && !e.ctrlKey && !e.metaKey) return options[activeIndex]?.run()
      if (!q) return
      if (assistant && looksLikeQuestion(q) && !e.ctrlKey && !e.metaKey) openChat(q)
      else showResults()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (activeIndex >= 0) setActiveIndex(-1)
      else close(true)
    } else if (e.key === 'Tab' && active) {
      close()
    }
  }

  return (
    <div ref={rootRef} className={mergeClasses(s.root, active ? 'flex-1 min-w-0' : 'ms-auto')} role="search" aria-label="Site">
      {!active && (
        <Tooltip content="Search" relationship="label">
          <Button
            ref={triggerRef}
            appearance="transparent"
            className={mergeClasses(s.onNavyIcon, 'md:hidden!')}
            icon={<Search20Regular />}
            onClick={() => {
              open()
              requestAnimationFrame(() => inputRef.current?.focus())
            }}
          />
        </Tooltip>
      )}
      <div
        className={mergeClasses(s.bar, active && s.barActive, active ? 'max-w-[720px]' : 'hidden! md:flex! md:w-[240px] lg:w-[200px] xl:w-[340px]')}
        onMouseDown={e => {
          if (e.target === e.currentTarget) {
            e.preventDefault()
            inputRef.current?.focus()
          }
        }}
      >
        {active ? (
          <Tooltip content="Close search" relationship="label">
            <Button appearance="subtle" icon={<ArrowLeft20Regular />} onClick={() => close(true)} />
          </Tooltip>
        ) : (
          <Search20Regular aria-hidden="true" />
        )}
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={active}
          aria-controls={active ? 'gs-listbox' : undefined}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-activedescendant={active ? activeId : undefined}
          aria-keyshortcuts="Control+K /"
          aria-label={technician ? 'Search work orders and pages' : partner ? 'Search records, actions and pages' : 'Search the partner program'}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          className={mergeClasses(s.input, active && s.inputActive)}
          placeholder={technician ? 'Search work orders' : partner ? 'Search records and actions' : 'Search the partner program'}
          value={query}
          onFocus={() => {
            if (quietFocus.current) {
              quietFocus.current = false
              return
            }
            open()
          }}
          onChange={e => {
            setQuery(e.target.value)
            setView('suggest')
            setScope('all')
            setActiveIndex(-1)
            open()
          }}
          onKeyDown={onKeyDown}
        />
        {active && query && (
          <Tooltip content="Clear search" relationship="label">
            <Button
              appearance="subtle"
              icon={<Dismiss20Regular />}
              onClick={() => {
                setQuery('')
                setView('suggest')
                setActiveIndex(-1)
                inputRef.current?.focus()
              }}
            />
          </Tooltip>
        )}
        {!active && (
          <kbd className={mergeClasses(s.kbd, 'hidden xl:inline')} aria-hidden="true">
            Ctrl K
          </kbd>
        )}
        {assistant && (
          <Tooltip content="Ask Partner assistant" relationship="label">
            <Button
              appearance="subtle"
              className={mergeClasses(!active && s.onNavyIcon, active ? s.askActive : s.askOnNavy)}
              icon={<AssistantIcon size={20} />}
              onClick={() => openChat(q || undefined)}
            />
          </Tooltip>
        )}
      </div>

      {active && (
        <section className={s.surface} style={{ top: geometry.top }} aria-label="Search" tabIndex={0}>
          <div
            className={mergeClasses(s.col, view === 'results' && s.colWide)}
            style={geometry.wide ? { marginInlineStart: geometry.start } : { marginInlineStart: 'auto', marginInlineEnd: 'auto' }}
          >
            {view === 'results' && q && (
              <Title3 as="h2" className={s.resTitle}>
                {resultsHeading}
              </Title3>
            )}
            {chips}
            {q && currentResult?.message && (
              <Text as="p" className={s.note}>
                {currentResult.message}
              </Text>
            )}
            <div id="gs-listbox" role="listbox" aria-label={view === 'results' ? 'Search results' : 'Search suggestions'} aria-busy={loading || undefined}>
              {body}
              {retry}
            </div>
            <p className={s.keys} aria-hidden="true">
              <span>
                <kbd className={s.keyHint}>Enter</kbd>
                {q ? (assistant && looksLikeQuestion(q) ? 'ask the assistant' : 'see all results') : 'open'}
              </span>
              <span>
                <kbd className={s.keyHint}>↑</kbd>
                <kbd className={s.keyHint}>↓</kbd>pick a suggestion
              </span>
              <span>
                <kbd className={s.keyHint}>Esc</kbd>close search
              </span>
            </p>
            <span className={s.srOnly} role="status">
              {status}
              {currentResult?.message ? `. ${currentResult.message}` : ''}
            </span>
          </div>
        </section>
      )}

      {assistant && (
      <AssistantChat
        key={sessionKey}
        mode={chatMode}
        onModeChange={setChatMode}
        turns={turns}
        setTurns={setTurns}
        onBack={() => {
          setChatMode('closed')
          open()
          quietFocus.current = true
          requestAnimationFrame(() => inputRef.current?.focus())
        }}
        onOpenItem={openItemFromChat}
      />
      )}
    </div>
  )
}
