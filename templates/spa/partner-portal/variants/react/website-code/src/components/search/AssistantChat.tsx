import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import {
  Badge,
  Body1,
  Button,
  Caption1,
  Dialog,
  DialogSurface,
  makeStyles,
  mergeClasses,
  Portal,
  shorthands,
  Skeleton,
  SkeletonItem,
  Text,
  Title2,
  ToggleButton,
  tokens,
  Tooltip,
} from '@fluentui/react-components'
import {
  ArrowLeft20Regular,
  ArrowMaximize20Regular,
  ArrowMinimize20Regular,
  Briefcase16Regular,
  Building16Regular,
  ChatAdd20Regular,
  Checkmark20Regular,
  Copy20Regular,
  Dismiss20Regular,
  Document16Regular,
  Person16Regular,
  QuestionCircle16Regular,
  Send20Filled,
  ThumbDislike20Filled,
  ThumbDislike20Regular,
  ThumbLike20Filled,
  ThumbLike20Regular,
} from '@fluentui/react-icons'
import { useApp } from '../../store/AppStore'
import { AssistantIcon, AssistantMark } from './AssistantIcon'
import { useBottomObstruction } from '../../hooks/useBottomObstruction'
import { useInlineFeedback } from '../../hooks/useInlineFeedback'
import { InlineFeedback } from '../InlineFeedback'
import { PARTNER_ROLES, ROLE_LABELS } from '../../lib/access'
import { nextTurnId, startersFor, type AnswerBlock, type AnswerPart, type AssistantAnswer } from '../../lib/assistant'
import { itemPath, type SearchItem } from '../../lib/search'
import { useRoutePreload } from '../../hooks/useRoutePreload'
import { useAssistantReply, type ChatTurn } from '../../hooks/useAssistantReply'
import { ChatFullScreenMotion, ChatWindowMotion, M3_DURATION, M3_EASING } from '../../lib/motion'

export type { ChatTurn } from '../../hooks/useAssistantReply'

const useStyles = makeStyles({
  surface: {
    position: 'fixed',
    inset: 0,
    width: '100vw',
    maxWidth: 'none',
    height: '100dvh',
    maxHeight: 'none',
    margin: 0,
    padding: 0,
    borderRadius: 0,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  top: {
    flexShrink: 0,
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    paddingInlineStart: tokens.spacingHorizontalM,
    paddingInlineEnd: tokens.spacingHorizontalM,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  topCompact: { height: '52px', paddingInlineStart: tokens.spacingHorizontalL, paddingInlineEnd: tokens.spacingHorizontalS, gap: tokens.spacingHorizontalXS },
  panel: {
    position: 'fixed',
    insetInlineEnd: tokens.spacingHorizontalXXL,
    bottom: 'calc(24px + var(--fab-inset, 0px))',
    zIndex: 1000,
    // Fluid size: width follows the viewport (360–440px); height is ~75% of the viewport (480–720px) but never
    // taller than the space below the app bar (and above any fixed bottom bar).
    width: 'clamp(360px, 28vw, 440px)',
    height: 'min(720px, max(480px, 75dvh), calc(100dvh - 104px - var(--fab-inset, 0px)))',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    boxShadow: tokens.shadow28,
    '@media (max-width: 639px)': {
      insetInlineEnd: tokens.spacingHorizontalS,
      insetInlineStart: tokens.spacingHorizontalS,
      bottom: 'calc(8px + var(--fab-inset, 0px))',
      width: 'auto',
      height: 'min(85dvh, calc(100dvh - 72px - var(--fab-inset, 0px)))',
    },
  },
  // Material 3 FAB: 24dp margin (16dp on compact windows), above page content but below dialogs.
  // --fab-inset lifts the FAB and window above fixed bottom bars (useBottomObstruction).
  // The FAB scales in when it (re)appears, e.g. after the chat window shrinks back into it.
  fabWrap: {
    position: 'fixed',
    insetInlineEnd: '24px',
    bottom: 'calc(24px + var(--fab-inset, 0px))',
    zIndex: 1000,
    '@media (max-width: 639px)': { insetInlineEnd: '16px', bottom: 'calc(16px + var(--fab-inset, 0px))' },
    animationName: { from: { opacity: 0, transform: 'scale(0.6)' }, to: { opacity: 1, transform: 'none' } },
    animationDuration: `${M3_DURATION.short4}ms`,
    animationDelay: `${M3_DURATION.short2}ms`,
    animationTimingFunction: M3_EASING.emphasized,
    animationFillMode: 'both',
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
  },
  // Circular FAB: 56dp, brand primary fill with on-brand icon, 24dp icon, elevation level 3 (level 4 on hover) and a
  // state layer for hover/pressed.
  fab: {
    position: 'relative',
    display: 'grid',
    placeItems: 'center',
    width: '56px',
    height: '56px',
    padding: 0,
    borderRadius: tokens.borderRadiusCircular,
    border: 'none',
    cursor: 'pointer',
    overflow: 'hidden',
    color: tokens.colorNeutralForegroundOnBrand,
    backgroundColor: tokens.colorBrandBackground,
    boxShadow: '0 1px 3px rgba(20, 45, 64, 0.3), 0 4px 8px 3px rgba(20, 45, 64, 0.15)',
    transitionProperty: 'box-shadow',
    transitionDuration: '150ms',
    transitionTimingFunction: 'cubic-bezier(0.2, 0, 0, 1)',
    '::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      backgroundColor: 'currentColor',
      opacity: 0,
      transitionProperty: 'opacity',
      transitionDuration: '150ms',
      pointerEvents: 'none',
    },
    ':hover': { boxShadow: '0 2px 3px rgba(20, 45, 64, 0.3), 0 6px 10px 4px rgba(20, 45, 64, 0.15)' },
    ':hover::before': { opacity: 0.08 },
    ':active::before': { opacity: 0.1 },
    ':active': { boxShadow: '0 1px 3px rgba(20, 45, 64, 0.3), 0 4px 8px 3px rgba(20, 45, 64, 0.15)' },
    ':focus-visible': { outlineWidth: '2px', outlineStyle: 'solid', outlineColor: tokens.colorBrandStroke1, outlineOffset: '2px' },
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0.01ms' },
  },
  fabIcon: { display: 'flex', width: '24px', height: '24px', fontSize: '24px' },
  fabDot: {
    position: 'absolute',
    top: '1px',
    insetInlineEnd: '1px',
    width: '12px',
    height: '12px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorPaletteDarkOrangeBorderActive,
    border: `2px solid ${tokens.colorNeutralBackground1}`,
    animationName: { from: { transform: 'scale(0)' }, to: { transform: 'none' } },
    animationDuration: `${M3_DURATION.short4}ms`,
    animationTimingFunction: M3_EASING.emphasized,
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
  },
  // New turns (and answers replacing their loading placeholder) fade up into the conversation once.
  enter: {
    animationName: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
    animationDuration: `${M3_DURATION.medium1}ms`,
    animationTimingFunction: M3_EASING.emphasized,
    animationFillMode: 'both',
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
  },
  reveal: {
    animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
    animationDuration: `${M3_DURATION.short4}ms`,
    animationTimingFunction: M3_EASING.standard,
    '@media (prefers-reduced-motion: reduce)': { animationName: 'none' },
  },
  title: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, color: tokens.colorNeutralForeground1, minWidth: 0 },
  colCompact: { maxWidth: 'none', paddingInlineStart: tokens.spacingHorizontalL, paddingInlineEnd: tokens.spacingHorizontalL },
  helloCompact: { paddingTop: tokens.spacingVerticalXL, paddingBottom: tokens.spacingVerticalL },
  helloTitleCompact: { fontSize: tokens.fontSizeBase500, lineHeight: tokens.lineHeightBase500 },
  threadCompact: { gap: tokens.spacingVerticalXL, paddingTop: tokens.spacingVerticalL, paddingBottom: tokens.spacingVerticalL },
  bottomCompact: { paddingBottom: tokens.spacingVerticalM, borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}` },
  scroll: { flex: 1, minHeight: 0, overflowY: 'auto' },
  col: {
    maxWidth: '768px',
    marginInlineStart: 'auto',
    marginInlineEnd: 'auto',
    paddingInlineStart: tokens.spacingHorizontalXL,
    paddingInlineEnd: tokens.spacingHorizontalXL,
  },
  hello: { paddingTop: '48px', paddingBottom: tokens.spacingVerticalXXL, '@media (max-width: 639px)': { paddingTop: tokens.spacingVerticalXL } },
  helloLead: { color: tokens.colorNeutralForeground2, marginTop: tokens.spacingVerticalXS, display: 'block' },
  starter: {
    textAlign: 'start',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: '2px',
    minHeight: '64px',
    height: 'auto',
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    fontWeight: tokens.fontWeightSemibold,
  },
  starterHint: { color: tokens.colorNeutralForeground2, fontWeight: tokens.fontWeightRegular },
  thread: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXL,
    paddingTop: tokens.spacingVerticalXXL,
    paddingBottom: tokens.spacingVerticalXXL,
  },
  user: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingInlineStart: tokens.spacingHorizontalM,
    paddingInlineEnd: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusXLarge,
    overflowWrap: 'anywhere',
  },
  answer: { display: 'grid', gridTemplateColumns: '32px minmax(0, 1fr)', gap: tokens.spacingHorizontalM },
  body: {
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    '& p': { margin: 0 },
    '& p + *, & ol + *, & ul + *': { marginTop: tokens.spacingVerticalS },
    '& ol, & ul': { margin: 0, paddingInlineStart: '24px' },
    '& ol': { listStyleType: 'decimal' },
    '& ul': { listStyleType: 'disc' },
    '& li + li': { marginTop: tokens.spacingVerticalXS },
  },
  cite: {
    minWidth: '20px',
    height: '20px',
    paddingInlineStart: '4px',
    paddingInlineEnd: '4px',
    marginInlineStart: '2px',
    verticalAlign: '1px',
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightBold,
    color: tokens.colorBrandForeground2,
    backgroundColor: tokens.colorBrandBackground2,
    border: 'none',
    borderRadius: tokens.borderRadiusSmall,
    cursor: 'pointer',
    ':hover': { backgroundColor: tokens.colorBrandBackground2Hover },
  },
  sources: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS, marginTop: tokens.spacingVerticalM },
  source: { fontWeight: tokens.fontWeightRegular, maxWidth: '100%' },
  sourceNum: { fontWeight: tokens.fontWeightBold, color: tokens.colorBrandForeground2 },
  tools: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS, marginTop: tokens.spacingVerticalS, color: tokens.colorNeutralForeground2 },
  toolsStatus: { display: 'flex', justifyContent: 'flex-end' },
  follow: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS, marginTop: tokens.spacingVerticalM },
  bottom: { flexShrink: 0, paddingTop: tokens.spacingVerticalS, paddingBottom: tokens.spacingVerticalL, backgroundColor: tokens.colorNeutralBackground1 },
  composer: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalS,
    paddingBottom: tokens.spacingVerticalS,
    paddingInlineStart: tokens.spacingHorizontalL,
    paddingInlineEnd: tokens.spacingHorizontalS,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
    ':focus-within': {
      ...shorthands.borderColor(tokens.colorBrandStroke1),
      outlineWidth: tokens.strokeWidthThin,
      outlineStyle: 'solid',
      outlineColor: tokens.colorBrandStroke1,
    },
  },
  textarea: {
    flex: 1,
    minWidth: 0,
    resize: 'none',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    color: tokens.colorNeutralForeground1,
    fontFamily: 'inherit',
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    minHeight: '24px',
    maxHeight: '120px',
    paddingTop: '6px',
    paddingBottom: '6px',
    '::placeholder': { color: tokens.colorNeutralForeground3 },
  },
  disclaimer: { display: 'block', textAlign: 'center', color: tokens.colorNeutralForeground2, marginTop: tokens.spacingVerticalS },
  srOnly: { position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' },
})

function SourceIcon({ item }: { item: SearchItem }) {
  if (item.faq) return <QuestionCircle16Regular />
  if (item.type === 'opp') return <Briefcase16Regular />
  if (item.type === 'account') return <Building16Regular />
  if (item.type === 'page') return <Document16Regular />
  return <Person16Regular />
}

function Parts({ parts, citations, onCite }: { parts: AnswerPart[]; citations: SearchItem[]; onCite: (item: SearchItem) => void }) {
  const s = useStyles()
  const preload = useRoutePreload()
  return (
    <>
      {parts.map((part, i) => {
        if (part.cite) {
          const item = citations[part.cite - 1]
          if (!item) return null
          return (
            <button
              {...preload(itemPath(item))}
              key={i}
              type="button"
              className={s.cite}
              onClick={() => onCite(item)}
              aria-label={`Source ${part.cite}: ${item.title}`}
            >
              {part.cite}
            </button>
          )
        }
        return part.strong ? <strong key={i}>{part.text}</strong> : <span key={i}>{part.text}</span>
      })}
    </>
  )
}

function AnswerView({ answer, onCite }: { answer: AssistantAnswer; onCite: (item: SearchItem) => void }) {
  const s = useStyles()
  const preload = useRoutePreload()
  const block = (b: AnswerBlock, i: number) => {
    if (b.kind === 'p')
      return (
        <p key={i}>
          <Parts parts={b.parts} citations={answer.citations} onCite={onCite} />
        </p>
      )
    const List = b.kind === 'ol' ? 'ol' : 'ul'
    return (
      <List key={i}>
        {b.items.map((parts, j) => (
          <li key={j}>
            <Parts parts={parts} citations={answer.citations} onCite={onCite} />
          </li>
        ))}
      </List>
    )
  }
  return (
    <div className={s.body}>
      {answer.blocks.map(block)}
      {answer.citations.length > 0 && (
        <div className={s.sources} role="group" aria-label="Sources">
          {answer.citations.map((item, i) => (
            <Button
              {...preload(itemPath(item))}
              key={item.id}
              size="small"
              appearance="outline"
              className={s.source}
              icon={<SourceIcon item={item} />}
              onClick={() => onCite(item)}
            >
              <span className={s.sourceNum}>{i + 1}</span>&nbsp;{item.title}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Copy and rate one answer; the result is confirmed beside the buttons rather than in a page-level message. */
function AnswerActions({ answer }: { answer: AssistantAnswer }) {
  const s = useStyles()
  const [copied, setCopied] = useState(false)
  const [rating, setRating] = useState<'up' | 'down' | null>(null)
  const status = useInlineFeedback()

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(answerText(answer))
      setCopied(true)
      status.show('Answer copied.')
    } catch {
      status.show('Couldn’t copy the answer. Select the text and copy it instead.', 'error')
    }
  }
  const rate = (next: 'up' | 'down') => {
    setRating(next)
    status.show('Thanks for the feedback.')
  }

  return (
    <>
      <div className={s.tools}>
        <Caption1>AI-generated · check before acting</Caption1>
        <span className="flex-1" />
        <Tooltip content={copied ? 'Copied' : 'Copy answer'} relationship="label">
          <Button size="small" appearance="subtle" icon={copied ? <Checkmark20Regular /> : <Copy20Regular />} onClick={() => void copy()} />
        </Tooltip>
        <Tooltip content="Helpful" relationship="label">
          <ToggleButton
            size="small"
            appearance="subtle"
            checked={rating === 'up'}
            icon={rating === 'up' ? <ThumbLike20Filled /> : <ThumbLike20Regular />}
            onClick={() => rate('up')}
          />
        </Tooltip>
        <Tooltip content="Not helpful" relationship="label">
          <ToggleButton
            size="small"
            appearance="subtle"
            checked={rating === 'down'}
            icon={rating === 'down' ? <ThumbDislike20Filled /> : <ThumbDislike20Regular />}
            onClick={() => rate('down')}
          />
        </Tooltip>
      </div>
      <InlineFeedback feedback={status.feedback} className={s.toolsStatus} />
    </>
  )
}

/** Applies the enter animation only when the element first mounts as new content; later re-renders keep it. */
function Appear({ first, className, enterClassName, children }: { first: boolean; className?: string; enterClassName?: string; children: ReactNode }) {
  const [animate] = useState(first)
  return <div className={mergeClasses(className, animate && enterClassName)}>{children}</div>
}

const isAnswered = (t: ChatTurn) => t.role === 'assistant' && !!(t.answer || t.error)

/**
 * Ids of turns (and answers) already rendered before the latest change of `turns` or `mode`, so only new content
 * animates in. Tracked in state and adjusted during render; reading refs during render would break the Rules of React.
 */
function useSeenTurns(turns: ChatTurn[], mode: ChatMode): { turns: ReadonlySet<number>; answers: ReadonlySet<number> } {
  const [seen, setSeen] = useState(() => ({ source: turns, mode, turns: new Set<number>(), answers: new Set<number>() }))
  if (seen.source === turns && seen.mode === mode) return seen
  const currentIds = new Set(turns.map(turn => turn.id))
  const next = { source: turns, mode, turns: new Set<number>(), answers: new Set<number>() }
  for (const t of seen.source) {
    if (!currentIds.has(t.id)) continue
    next.turns.add(t.id)
    if (isAnswered(t)) next.answers.add(t.id)
  }
  setSeen(next)
  return next
}

function answerText(answer: AssistantAnswer) {
  const join = (p: AnswerPart[]) => p.map(x => x.text).join('')
  return answer.blocks
    .map(b => (b.kind === 'p' ? join(b.parts) : b.items.map((it, i) => `${b.kind === 'ol' ? `${i + 1}.` : '-'} ${join(it)}`).join('\n')))
    .join('\n\n')
}

/** closed = only the always-visible FAB; panel = floating window; full = full-screen modal. */
export type ChatMode = 'closed' | 'full' | 'panel'

/**
 * Partner assistant opened from global search (Ask row, ✦ button, prompts, results page).
 * - full: full-screen modal chat. Back/Esc return to where it was opened from (search, or the floating window when
 *   expanded from it); "Restore to chat window" docks it; Close collapses to the FAB.
 * - panel: non-modal floating chat window that stays open while the user browses (New chat, Expand, Close; Esc closes).
 * - closed: only the always-visible circular Material 3 FAB, which opens the window and shows a dot for unread answers.
 * Close never discards the conversation; New chat does.
 * Links in the answer open their page and dock a full-screen chat into the floating window, so the conversation
 * is never lost. The thread lives in the parent; a trailing user turn without a reply is answered on open.
 */
export function AssistantChat({
  mode,
  onModeChange,
  turns,
  setTurns,
  onBack,
  onOpenItem,
}: {
  mode: ChatMode
  onModeChange: (mode: ChatMode) => void
  turns: ChatTurn[]
  setTurns: (fn: (t: ChatTurn[]) => ChatTurn[]) => void
  onBack: () => void
  onOpenItem: (item: SearchItem) => void
}) {
  const s = useStyles()
  const { db, session } = useApp()
  const [draft, setDraft] = useState('')
  const [seenAnswers, setSeenAnswers] = useState(0)
  // Each surface owns its refs: during a crossfade both are mounted, and a shared ref would be nulled when the
  // outgoing surface unmounts, breaking composer sizing and auto-scroll in the surface that stays.
  const windowScrollRef = useRef<HTMLDivElement>(null)
  const fullScrollRef = useRef<HTMLDivElement>(null)
  const windowInputRef = useRef<HTMLTextAreaElement>(null)
  const fullInputRef = useRef<HTMLTextAreaElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)
  useAssistantReply(turns, setTurns, { db, session })
  const pending = turns.some(t => t.role === 'assistant' && !t.answer && !t.error)
  const answers = turns.filter(t => t.role === 'assistant' && (t.answer || t.error)).length
  const visible = mode === 'full' || mode === 'panel'
  const { inset: bottomInset, modalOpen } = useBottomObstruction()
  // The floating window is hidden (not closed) while a page dialog is open; answers then are not "seen".
  const onScreen = mode === 'full' || (mode === 'panel' && !modalOpen)
  // Answers read in the window or full screen count as seen (adjusted during render, not in an effect).
  if (onScreen && seenAnswers !== answers) setSeenAnswers(answers)
  const unread = !onScreen && answers > seenAnswers
  // Where full screen was opened from: search (Back to search) or the floating window (expanded).
  const [modeHistory, setModeHistory] = useState<{ last: ChatMode; origin: 'search' | 'panel' }>({ last: mode, origin: 'search' })
  let origin = modeHistory.origin
  if (modeHistory.last !== mode) {
    if (mode === 'full') origin = modeHistory.last === 'panel' ? 'panel' : 'search'
    setModeHistory({ last: mode, origin })
  }
  const fromPanel = origin === 'panel'
  const insetStyle = { '--fab-inset': `${bottomInset}px` } as CSSProperties
  const first = session.contact?.firstName
  const partner = PARTNER_ROLES.includes(session.role)
  // Turns and answers already shown animate only once, not again when the chat moves between window and full screen.
  const seen = useSeenTurns(turns, mode)

  const send = (text: string) => {
    const message = text.trim()
    if (!message || pending) return
    const id = nextTurnId()
    setTurns(t => [...t, { id, role: 'user', text: message }])
    setDraft('')
  }

  // The composer keeps the draft's height when the chat switches between full screen and the window.
  useLayoutEffect(() => {
    const el = (mode === 'full' ? fullInputRef : windowInputRef).current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [draft, mode])

  useEffect(() => {
    const el = (mode === 'full' ? fullScrollRef : windowScrollRef).current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns, mode])

  // Focus follows the mode: the composer when the chat is shown, the floating button when minimized.
  const previousMode = useRef(mode)
  useEffect(() => {
    const prev = previousMode.current
    previousMode.current = mode
    if (prev === mode) return
    const id = window.setTimeout(() => {
      if (mode === 'full') fullInputRef.current?.focus()
      else if (mode === 'panel') windowInputRef.current?.focus()
      else if (mode === 'closed' && (prev === 'panel' || prev === 'full')) fabRef.current?.focus()
    }, 0)
    return () => window.clearTimeout(id)
  }, [mode])

  /** Close = collapse to the FAB; the conversation is kept. */
  const close = () => onModeChange('closed')
  /** Esc / Back in full screen: return to where it was opened from. */
  const stepBack = () => (fromPanel ? onModeChange('panel') : onBack())
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(draft)
    }
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    send(draft)
  }
  const lastAnswerIndex = turns.reduce((acc, t, i) => (t.role === 'assistant' && t.answer ? i : acc), -1)

  /**
   * Each surface renders its own layout, so a surface keeps it while it animates out. Only the active surface
   * carries the shared ids; the outgoing one is inert and hidden from assistive tech.
   */
  const renderBody = (compact: boolean) => {
    const active = compact ? mode === 'panel' : mode === 'full'
    const titleId = active ? 'assistant-title' : undefined
    const inputId = active ? 'assistant-input' : undefined
    const newChat = turns.length > 0 && (
      <Tooltip content="New chat" relationship="label">
        <Button appearance="subtle" icon={<ChatAdd20Regular />} onClick={() => setTurns(() => [])} disabled={pending}>
          {!compact && <span className="hidden sm:inline">New chat</span>}
        </Button>
      </Tooltip>
    )
    const title = (
      <span className={s.title}>
        <AssistantMark size={compact ? 28 : 32} />
        <Text as="h2" id={titleId} weight="semibold" size={compact ? 300 : 400} truncate wrap={false}>
          Partner assistant
        </Text>
        {!compact && (
          <Badge appearance="tint" color="informative" className="hidden! sm:inline-flex!">
            Preview
          </Badge>
        )}
      </span>
    )
    const topBar = !compact ? (
      <div className={s.top}>
        {!fromPanel && (
          <Tooltip content="Back to search" relationship="label">
            <Button appearance="subtle" icon={<ArrowLeft20Regular />} onClick={onBack} />
          </Tooltip>
        )}
        {title}
        <span className="flex-1" />
        {newChat}
        <Tooltip content="Restore to chat window" relationship="label">
          <Button appearance="subtle" icon={<ArrowMinimize20Regular />} onClick={() => onModeChange('panel')} />
        </Tooltip>
        <Tooltip content="Close assistant" relationship="label">
          <Button appearance="subtle" icon={<Dismiss20Regular />} onClick={close} />
        </Tooltip>
      </div>
    ) : (
      <div className={mergeClasses(s.top, s.topCompact)}>
        {title}
        <span className="flex-1" />
        {newChat}
        <Tooltip content="Expand to full screen" relationship="label">
          <Button appearance="subtle" icon={<ArrowMaximize20Regular />} onClick={() => onModeChange('full')} />
        </Tooltip>
        <Tooltip content="Close assistant" relationship="label">
          <Button appearance="subtle" icon={<Dismiss20Regular />} onClick={close} />
        </Tooltip>
      </div>
    )

    return (
      <>
        {topBar}
        <div className={s.scroll} ref={compact ? windowScrollRef : fullScrollRef}>
          <div className={mergeClasses(s.col, compact && s.colCompact)}>
            {turns.length === 0 ? (
              <div className={mergeClasses(s.hello, compact && s.helloCompact)}>
                <AssistantMark size={compact ? 32 : 48} />
                <Title2 as="p" className={mergeClasses('block mt-4', compact && s.helloTitleCompact)}>
                  {first ? `Hi ${first}, how can I help?` : 'Hi, how can I help?'}
                </Title2>
                <Body1 className={s.helloLead}>
                  {partner
                    ? 'Ask about your opportunities, customers, deadlines or the partner program.'
                    : 'Ask about the Zava Partner Program and how to join.'}
                </Body1>
                <div
                  className={compact ? 'grid grid-cols-1 gap-2 mt-5' : 'grid grid-cols-1 sm:grid-cols-2 gap-3 mt-7'}
                  role="group"
                  aria-label="Suggested questions"
                >
                  {startersFor(session.role).map(st => (
                    <Button key={st.q} appearance="outline" className={s.starter} onClick={() => send(st.q)}>
                      {st.q}
                      <Caption1 className={s.starterHint}>{st.hint}</Caption1>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className={mergeClasses(s.thread, compact && s.threadCompact)} role="log" aria-label="Conversation">
                {turns.map((t, i) =>
                  t.role === 'user' ? (
                    <Appear key={t.id} first={!seen.turns.has(t.id)} className={s.user} enterClassName={s.enter}>
                      <span className={s.srOnly}>You: </span>
                      {t.text}
                    </Appear>
                  ) : (
                    <Appear key={t.id} first={!seen.turns.has(t.id)} className={s.answer} enterClassName={s.enter}>
                      <AssistantMark size={32} />
                      <Appear
                        key={t.answer || t.error ? 'done' : 'pending'}
                        first={!!(t.answer || t.error) && !seen.answers.has(t.id)}
                        className="min-w-0"
                        enterClassName={s.reveal}
                      >
                        <span className={s.srOnly}>Partner assistant: </span>
                        {t.answer ? (
                          <>
                            <AnswerView answer={t.answer} onCite={onOpenItem} />
                            <AnswerActions answer={t.answer} />
                            {i === lastAnswerIndex && t.answer.followUps.length > 0 && (
                              <div className={s.follow} role="group" aria-label="Suggested follow-ups">
                                {t.answer.followUps.map(f => (
                                  <Button key={f} appearance="outline" onClick={() => send(f)} disabled={pending}>
                                    {f}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </>
                        ) : t.error ? (
                          <Body1 role="alert">{t.error}</Body1>
                        ) : (
                          <div role="status">
                            <span className={s.srOnly}>Searching records you can access…</span>
                            <Skeleton aria-hidden="true" className="flex flex-col gap-2 pt-1">
                              <SkeletonItem size={16} style={{ width: '80%' }} />
                              <SkeletonItem size={16} style={{ width: '95%' }} />
                              <SkeletonItem size={16} style={{ width: '60%' }} />
                            </Skeleton>
                          </div>
                        )}
                      </Appear>
                    </Appear>
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        <div className={mergeClasses(s.bottom, compact && s.bottomCompact)}>
          <div className={mergeClasses(s.col, compact && s.colCompact)}>
            <form className={s.composer} onSubmit={onSubmit}>
              <label htmlFor={inputId} className={s.srOnly}>
                Message Partner assistant
              </label>
              <textarea
                id={inputId}
                ref={compact ? windowInputRef : fullInputRef}
                className={s.textarea}
                rows={1}
                value={draft}
                placeholder={
                  turns.length ? 'Ask a follow-up…' : partner ? 'Ask about your pipeline, customers or the program…' : 'Ask about the partner program…'
                }
                onChange={e => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
              />
              <Button type="submit" appearance="primary" icon={<Send20Filled />} aria-label="Send" disabled={!draft.trim() || pending} />
            </form>
            <Caption1 className={s.disclaimer}>
              {compact
                ? 'AI-generated — check before acting. Uses only records you can access.'
                : `AI-generated answers can be wrong — check before acting. Uses only records you can access as ${ROLE_LABELS[session.role]} and never changes data.`}
            </Caption1>
          </div>
        </div>
      </>
    )
  }

  const fabButton = (
    <button
      ref={fabRef}
      type="button"
      data-assistant-fab=""
      className={s.fab}
      aria-label={unread ? 'Open Partner assistant, new answer' : 'Open Partner assistant'}
      aria-haspopup="dialog"
      onClick={() => onModeChange('panel')}
    >
      <span className={s.fabIcon} aria-hidden="true">
        <AssistantIcon size={24} />
      </span>
    </button>
  )

  return (
    <>
      <Dialog
        open={mode === 'full'}
        modalType="modal"
        surfaceMotion={{ children: (_, motion) => <ChatFullScreenMotion {...motion} origin={origin} /> }}
        onOpenChange={(_, data) => {
          if (data.open) return
          // Esc steps back one level (to search or the window); anything else collapses to the FAB.
          if (data.type === 'escapeKeyDown') stepBack()
          else close()
        }}
      >
        <DialogSurface className={s.surface} aria-labelledby="assistant-title" data-assistant-surface="">
          {/* Keeps its content while fading out after Restore; Fluent unmounts the surface once the exit ends. */}
          {renderBody(false)}
        </DialogSurface>
      </Dialog>

      {/* Close shrinks the window back into the FAB. Expanding keeps it mounted, fading out under the incoming
          full-screen surface (a crossfade). It is inert and hidden from assistive tech while it animates out. */}
      <Portal>
        <ChatWindowMotion visible={mode === 'panel'} exitTo={mode === 'full' ? 'full' : 'fab'} appear unmountOnExit>
          <section
            className={s.panel}
            style={insetStyle}
            // Stays mounted (keeps the draft) but steps aside while a page dialog is open.
            hidden={modalOpen}
            inert={mode !== 'panel'}
            aria-hidden={mode !== 'panel' || undefined}
            role="dialog"
            aria-modal="false"
            aria-labelledby="assistant-title"
            onKeyDown={e => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                close()
              }
            }}
          >
            {renderBody(true)}
          </section>
        </ChatWindowMotion>
      </Portal>

      {!visible && !modalOpen && (
        <Portal>
          <div className={s.fabWrap} style={insetStyle}>
            <Tooltip content="Partner assistant" relationship="inaccessible">
              {fabButton}
            </Tooltip>
            {unread && <span className={s.fabDot} aria-hidden="true" />}
          </div>
        </Portal>
      )}
    </>
  )
}
