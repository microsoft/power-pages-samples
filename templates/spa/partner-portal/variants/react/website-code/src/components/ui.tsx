import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type AriaAttributes,
  type ButtonHTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Breadcrumb,
  BreadcrumbButton,
  BreadcrumbDivider,
  BreadcrumbItem,
  Button as FluentButton,
  Caption1,
  Card,
  Link as FluentLink,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Subtitle2,
  Tab,
  TabList,
  Text,
  Title2,
  Title3,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
  type BadgeProps,
  type ButtonProps,
  type MessageBarIntent,
} from '@fluentui/react-components'
import {
  CheckmarkCircle12Regular,
  ChevronLeft16Regular,
  Circle12Regular,
  CircleHalfFill12Regular,
  Clock12Regular,
  ErrorCircle12Regular,
} from '@fluentui/react-icons'
import { BADGE_WARNING_FG } from '../theme/fluentTheme'
import { useRoutePreload } from '../hooks/useRoutePreload'
import { useBusyIndicator } from '../hooks/usePendingAction'
import { announce } from '../lib/announce'

const SITE = 'Zava Partner Portal'

/** Sets document.title as "<Page> — Zava Partner Portal" (home uses the site name alone). */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE}` : SITE
  }, [title])
}

/* ------------------------------------------------------------------ */
/* Client-side navigation helpers                                      */
/* ------------------------------------------------------------------ */

export type LinkClickHandler = (event: MouseEvent<HTMLElement>) => void

function isModifiedClick(event: MouseEvent<HTMLElement>) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

/**
 * Returns a factory `(to) => onClick` for anchors (Fluent Button/Link/MenuItem/BreadcrumbButton rendered
 * `as="a"` with `href={to}`) so plain left-clicks navigate client-side while ctrl/meta/shift/middle-clicks
 * keep the browser's default (new tab/window). Use this inside loops where a hook per item is not possible.
 */
export function useRouterNavigate() {
  const navigate = useNavigate()
  return useCallback(
    (to: string): LinkClickHandler =>
      event => {
        if (event.defaultPrevented || isModifiedClick(event)) return
        const target = event.currentTarget.getAttribute('target')
        if (target && target !== '_self') return
        event.preventDefault()
        navigate(to)
      },
    [navigate],
  )
}

/** onClick handler that navigates to `to` client-side (see useRouterNavigate). */
export function useLinkClick(to: string): LinkClickHandler {
  const factory = useRouterNavigate()
  return useMemo(() => factory(to), [factory, to])
}

/** Fluent `Link` rendered as an anchor that navigates client-side via react-router. */
export function AppLink({
  to,
  children,
  className,
  inline,
  onClick,
  ...rest
}: {
  to: string
  children: ReactNode
  className?: string
  inline?: boolean
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
  id?: string
  title?: string
} & AriaAttributes) {
  const navigate = useLinkClick(to)
  const preload = useRoutePreload()
  return (
    <FluentLink
      {...rest}
      {...preload(to)}
      as="a"
      href={to}
      inline={inline}
      className={className}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event)
        navigate(event)
      }}
    >
      {children}
    </FluentLink>
  )
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

/**
 * - `primary`: the one main action per view. `success` is kept for compatibility and renders exactly like primary.
 * - `danger`: outlined red, for in-row/secondary destructive triggers.
 * - `dangerPrimary`: filled red, only for the confirm button of a destructive confirmation.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'dangerPrimary' | 'ghost' | 'success'
type Variant = ButtonVariant

const APPEARANCE: Record<Variant, ButtonProps['appearance']> = {
  primary: 'primary',
  secondary: 'secondary',
  danger: 'secondary',
  dangerPrimary: 'primary',
  ghost: 'subtle',
  success: 'primary',
}

const useButtonStyles = makeStyles({
  root: {
    maxWidth: 'none',
    // Touch devices: at least 44px targets regardless of size.
    '@media (pointer: coarse)': { minHeight: '44px', minWidth: '44px' },
  },
  // `sm` keeps compact text/padding but never drops below a 32px target.
  small: { minHeight: '32px' },
  dangerPrimary: {
    color: tokens.colorNeutralForegroundOnBrand,
    backgroundColor: tokens.colorPaletteRedBackground3,
    ...shorthands.borderColor('transparent'),
    ':hover': {
      color: tokens.colorNeutralForegroundOnBrand,
      backgroundColor: tokens.colorPaletteRedForeground1,
      ...shorthands.borderColor('transparent'),
    },
    ':hover:active': {
      color: tokens.colorNeutralForegroundOnBrand,
      backgroundColor: tokens.colorPaletteRedForeground2,
      ...shorthands.borderColor('transparent'),
    },
  },
  danger: {
    color: tokens.colorPaletteRedForeground1,
    ...shorthands.borderColor(tokens.colorPaletteRedBorder1),
    ':hover': {
      color: tokens.colorPaletteRedForeground1,
      backgroundColor: tokens.colorPaletteRedBackground1,
      ...shorthands.borderColor(tokens.colorPaletteRedBorder2),
    },
    ':hover:active': {
      color: tokens.colorPaletteRedForeground1,
      backgroundColor: tokens.colorPaletteRedBackground2,
      ...shorthands.borderColor(tokens.colorPaletteRedBorder2),
    },
  },
})

function useVariantClass(variant: Variant, size: 'sm' | 'md', disabled?: boolean, className?: string) {
  const styles = useButtonStyles()
  return mergeClasses(
    styles.root,
    size === 'sm' && styles.small,
    !disabled && variant === 'danger' && styles.danger,
    !disabled && variant === 'dangerPrimary' && styles.dangerPrimary,
    className,
  )
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  icon,
  children,
  pending = false,
  pendingLabel,
  disabledFocusable,
  style,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: 'sm' | 'md'
  icon?: ReactElement
  /**
   * The action this button started is still running. Further clicks (and form submits) are ignored at once;
   * after a short delay the button shows a tiny spinner and `pendingLabel`, keeps its width and stays focusable.
   */
  pending?: boolean
  /** Short "-ing" label while pending, e.g. "Saving…". Defaults to the normal label. */
  pendingLabel?: string
  /** Disabled but still focusable, so focus and tab order are kept. */
  disabledFocusable?: boolean
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const [width, setWidth] = useState<number>()
  const busy = useBusyIndicator(pending, () => {
    setWidth(ref.current?.getBoundingClientRect().width)
    announce(pendingLabel ?? 'Working…')
  })
  const inactive = rest.disabled || disabledFocusable || busy
  const cls = useVariantClass(variant, size, inactive, className)
  return (
    <FluentButton
      type="button"
      {...({ ...rest, onClick: pending ? (event: MouseEvent<HTMLButtonElement>) => event.preventDefault() : onClick } as ButtonProps)}
      ref={ref}
      disabledFocusable={busy || disabledFocusable}
      aria-busy={busy || undefined}
      appearance={APPEARANCE[variant]}
      size={size === 'sm' ? 'small' : 'medium'}
      icon={busy ? <Spinner size="tiny" aria-hidden="true" /> : icon}
      className={cls}
      style={busy && width ? { ...style, minWidth: width } : style}
    >
      {busy && pendingLabel ? pendingLabel : children}
    </FluentButton>
  )
}

export function ButtonLink({
  to,
  variant = 'secondary',
  size = 'md',
  children,
  className,
  icon,
}: {
  to: string
  variant?: Variant
  size?: 'sm' | 'md'
  children: ReactNode
  className?: string
  icon?: ReactElement
}) {
  const cls = useVariantClass(variant, size, false, className)
  const onClick = useLinkClick(to)
  const preload = useRoutePreload()
  return (
    <FluentButton
      {...preload(to)}
      as="a"
      href={to}
      onClick={onClick}
      appearance={APPEARANCE[variant]}
      size={size === 'sm' ? 'small' : 'medium'}
      icon={icon}
      className={cls}
    >
      {children}
    </FluentButton>
  )
}

/* ------------------------------------------------------------------ */
/* Responsive helpers                                                  */
/* ------------------------------------------------------------------ */

/** Subscribes to a CSS media query (SSR-safe; false when matchMedia is unavailable). */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => (typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches),
    () => false,
  )
}

/** True below the 640px (`sm`) breakpoint. */
export function useIsNarrow(): boolean {
  return useMediaQuery('(max-width: 639.98px)')
}

/* ------------------------------------------------------------------ */
/* Breadcrumbs & page header                                           */
/* ------------------------------------------------------------------ */

export interface Crumb {
  label: string
  to?: string
}

const useHeaderStyles = makeStyles({
  breadcrumb: { marginBottom: tokens.spacingVerticalS, marginInlineStart: `calc(-1 * ${tokens.spacingHorizontalS})`, maxWidth: '100%' },
  crumbList: { flexWrap: 'wrap', rowGap: tokens.spacingVerticalXXS },
  crumbText: { color: tokens.colorNeutralForeground2, paddingInline: tokens.spacingHorizontalS },
  backNav: { marginBottom: tokens.spacingVerticalS },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    minHeight: '44px',
    fontSize: tokens.fontSizeBase300,
  },
  header: { marginBottom: tokens.spacingVerticalXXL },
  eyebrow: {
    display: 'block',
    margin: 0,
    marginBottom: tokens.spacingVerticalXS,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    fontWeight: tokens.fontWeightSemibold,
  },
  eyebrowSmall: { fontSize: tokens.fontSizeBase200, lineHeight: tokens.lineHeightBase200 },
  title: { display: 'block', margin: 0, color: tokens.colorNeutralForeground1, overflowWrap: 'break-word' },
  description: {
    display: 'block',
    marginTop: tokens.spacingVerticalS,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    color: tokens.colorNeutralForeground2,
    maxWidth: '65ch',
  },
})

/**
 * Breadcrumb trail (Home first). Wraps on small screens; below 640px it collapses to a single
 * "‹ <parent>" back link inside the same `nav` landmark.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const styles = useHeaderStyles()
  const linkClick = useRouterNavigate()
  const preload = useRoutePreload()
  const narrow = useIsNarrow()

  if (narrow) {
    const parent = [...items.slice(0, -1)].reverse().find(c => c.to) ?? { label: 'Home', to: '/' }
    return (
      <nav aria-label="Breadcrumb" className={styles.backNav}>
        <AppLink to={parent.to!} className={styles.backLink} aria-label={`Back to ${parent.label}`}>
          <ChevronLeft16Regular aria-hidden="true" />
          {parent.label}
        </AppLink>
      </nav>
    )
  }

  return (
    <Breadcrumb aria-label="Breadcrumb" size="small" className={styles.breadcrumb} list={{ className: styles.crumbList }}>
      <BreadcrumbItem>
        <BreadcrumbButton {...preload('/')} as="a" href="/" onClick={linkClick('/')}>
          Home
        </BreadcrumbButton>
      </BreadcrumbItem>
      {items.map((c, i) => {
        const last = i === items.length - 1
        return [
          <BreadcrumbDivider key={`d-${c.label}-${i}`} />,
          <BreadcrumbItem key={`${c.label}-${i}`}>
            {c.to && !last ? (
              <BreadcrumbButton {...preload(c.to)} as="a" href={c.to} onClick={linkClick(c.to)}>
                {c.label}
              </BreadcrumbButton>
            ) : last ? (
              <BreadcrumbButton current>{c.label}</BreadcrumbButton>
            ) : (
              <span className={styles.crumbText}>{c.label}</span>
            )}
          </BreadcrumbItem>,
        ]
      })}
    </Breadcrumb>
  )
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  eyebrow,
}: {
  title: string
  description?: ReactNode
  breadcrumbs?: Crumb[]
  actions?: ReactNode
  eyebrow?: string
}) {
  usePageTitle(title)
  const styles = useHeaderStyles()
  return (
    <div className={styles.header}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <Text as="p" className={mergeClasses(styles.eyebrow, breadcrumbs && styles.eyebrowSmall)}>
              {eyebrow}
            </Text>
          )}
          <Title2 as="h1" className={styles.title}>
            {title}
          </Title2>
          {description && (
            <div className={styles.description}>
              {description}
            </div>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Panel / cards                                                       */
/* ------------------------------------------------------------------ */

const useCardStyles = makeStyles({
  panel: { ...shorthands.padding('0'), rowGap: '0' },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalXL),
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  panelTitle: { margin: 0, color: tokens.colorNeutralForeground1 },
  stat: { ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalXL), rowGap: tokens.spacingVerticalXS },
  statLabel: {
    display: 'block',
    margin: 0,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    fontWeight: tokens.fontWeightSemibold,
  },
  statValue: { display: 'block', margin: 0, color: tokens.colorNeutralForeground1 },
  statHint: { display: 'block', margin: 0, color: tokens.colorNeutralForeground2 },
  empty: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalL,
    border: `${tokens.strokeWidthThin} dashed ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.padding(tokens.spacingVerticalXXL, tokens.spacingHorizontalXXL),
    textAlign: 'start',
  },
  emptyBare: {
    ...shorthands.borderStyle('none'),
    borderRadius: 0,
    backgroundColor: 'transparent',
    ...shorthands.padding(tokens.spacingVerticalXL, tokens.spacingHorizontalL),
  },
  emptyIcon: { flexShrink: 0, color: tokens.colorNeutralForeground3, fontSize: '32px', lineHeight: 0 },
  emptyContent: { minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: tokens.spacingVerticalS },
  emptyTitle: {
    display: 'block',
    margin: 0,
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  emptyBody: {
    margin: 0,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    color: tokens.colorNeutralForeground2,
    maxWidth: '65ch',
  },
  emptyAction: { marginTop: tokens.spacingVerticalXS },
  prose: {
    fontFamily: tokens.fontFamilyBase,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    color: tokens.colorNeutralForeground1,
    maxWidth: '65ch',
    margin: 0,
  },
})

export function Panel({
  title,
  actions,
  children,
  className,
  bodyClassName = 'p-5',
  headerClassName,
}: {
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  headerClassName?: string
}) {
  const styles = useCardStyles()
  return (
    <Card className={mergeClasses(styles.panel, className)}>
      {(title || actions) && (
        <div className={mergeClasses(styles.panelHeader, headerClassName)}>
          {title && (
            <Subtitle2 as="h2" className={styles.panelTitle}>
              {title}
            </Subtitle2>
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Status badge                                                        */
/* ------------------------------------------------------------------ */

export type BadgeTone = 'green' | 'red' | 'amber' | 'indigo' | 'slate' | 'sky'

const TONE_COLOR: Record<BadgeTone, NonNullable<BadgeProps['color']>> = {
  green: 'success',
  red: 'danger',
  amber: 'warning',
  // Informative statuses/tags use neutral colours — brand indigo is reserved for interactive elements.
  indigo: 'informative',
  // Overridden below with Fluent's blue palette (Fluent's own `informative` tint is grey).
  sky: 'informative',
  slate: 'subtle',
}

// A per-tone leading icon so status is never conveyed by colour alone.
const TONE_ICON: Record<BadgeTone, ReactElement> = {
  green: <CheckmarkCircle12Regular aria-hidden="true" />,
  red: <ErrorCircle12Regular aria-hidden="true" />,
  amber: <Clock12Regular aria-hidden="true" />,
  indigo: <CircleHalfFill12Regular aria-hidden="true" />,
  sky: <Circle12Regular aria-hidden="true" />,
  slate: <Circle12Regular aria-hidden="true" />,
}

const STATUS_TONE: Record<string, BadgeTone> = {
  'In Progress': 'indigo',
  'On Hold': 'amber',
  Delivered: 'sky',
  Accepted: 'green',
  Declined: 'red',
  Returned: 'amber',
  Expired: 'slate',
  Won: 'green',
  Lost: 'red',
  Canceled: 'slate',
  Purchased: 'green',
  New: 'sky',
  'Under Review': 'amber',
  Approved: 'green',
  Expiring: 'amber',
  Closed: 'slate',
  Rejected: 'red',
  Submitted: 'sky',
  Active: 'green',
  Inactive: 'slate',
  Sent: 'sky',
  Redeemed: 'green',
  Yes: 'indigo',
  'Partner Admin': 'indigo',
  'Partner Manager': 'sky',
  'Partner Seller': 'slate',
}

const useBadgeStyles = makeStyles({
  root: { whiteSpace: 'nowrap', flexShrink: 0, columnGap: tokens.spacingHorizontalXXS },
  warning: { color: BADGE_WARNING_FG },
  informative: { color: tokens.colorNeutralForeground2, ...shorthands.borderColor(tokens.colorNeutralStroke1) },
  sky: {
    color: tokens.colorPaletteBlueForeground2,
    backgroundColor: tokens.colorPaletteBlueBackground2,
    ...shorthands.borderColor(tokens.colorPaletteBlueBorderActive),
  },
  role: { color: tokens.colorNeutralForeground1, whiteSpace: 'nowrap' },
})

export function StatusBadge({ status, tone }: { status: string; tone?: BadgeTone }) {
  const styles = useBadgeStyles()
  const resolved = tone ?? STATUS_TONE[status] ?? 'slate'
  const color = TONE_COLOR[resolved]
  return (
    <Badge
      appearance="tint"
      color={color}
      icon={TONE_ICON[resolved]}
      className={mergeClasses(
        styles.root,
        color === 'warning' && styles.warning,
        resolved === 'indigo' && styles.informative,
        resolved === 'sky' && styles.sky,
      )}
    >
      {status}
    </Badge>
  )
}

/** Plain-text rendering for roles and other non-status labels (roles are not statuses, so no badge). */
export function RoleText({ role, className }: { role: string; className?: string }) {
  const styles = useBadgeStyles()
  return <Text className={mergeClasses(styles.role, className)}>{role}</Text>
}

/** Long-form text at 16/24 with a comfortable 65ch line length. */
export function Prose({ children, className, as = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'p' }) {
  const styles = useCardStyles()
  const Tag = as
  return <Tag className={mergeClasses(styles.prose, className)}>{children}</Tag>
}

/**
 * Empty state: left-aligned title, optional body (explain why it's empty) and an optional call to action.
 * `children` is kept as an alias for `body`. Use `bare` inside tables/panels (no dashed border).
 */
export function EmptyState({
  title,
  children,
  body,
  action,
  icon,
  bare,
  className,
}: {
  title: string
  children?: ReactNode
  body?: ReactNode
  action?: ReactNode
  icon?: ReactElement
  bare?: boolean
  className?: string
}) {
  const styles = useCardStyles()
  const content = body ?? children
  return (
    <div className={mergeClasses(styles.empty, bare && styles.emptyBare, className)}>
      {icon && (
        <span className={styles.emptyIcon} aria-hidden="true">
          {icon}
        </span>
      )}
      <div className={styles.emptyContent}>
        <Text as="p" className={styles.emptyTitle}>
          {title}
        </Text>
        {content && <div className={styles.emptyBody}>{content}</div>}
        {action && <div className={styles.emptyAction}>{action}</div>}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Alert                                                               */
/* ------------------------------------------------------------------ */

const useAlertStyles = makeStyles({ title: { display: 'block' } })

export function Alert({ tone = 'info', children, title }: { tone?: 'info' | 'success' | 'warning' | 'error'; title?: string; children: ReactNode }) {
  const styles = useAlertStyles()
  return (
    <MessageBar
      intent={tone as MessageBarIntent}
      politeness={tone === 'error' ? 'assertive' : 'polite'}
      layout={title ? 'multiline' : 'auto'}
      {...(title ? {} : { 'aria-labelledby': undefined })}
    >
      <MessageBarBody>
        {title && <MessageBarTitle className={styles.title}>{title}</MessageBarTitle>}
        {children}
      </MessageBarBody>
    </MessageBar>
  )
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

const useTabsStyles = makeStyles({
  list: {
    flexWrap: 'wrap',
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    marginBottom: tokens.spacingVerticalL,
  },
  count: { marginInlineStart: tokens.spacingHorizontalXS, color: tokens.colorNeutralForeground3, fontWeight: tokens.fontWeightSemibold },
})

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: string; count?: number }[]
  value: T
  onChange: (id: T) => void
  label: string
}) {
  const styles = useTabsStyles()
  return (
    <TabList aria-label={label} selectedValue={value} onTabSelect={(_, data) => onChange(data.value as T)} className={styles.list}>
      {tabs.map(t => (
        <Tab key={t.id} value={t.id}>
          {t.label}
          {t.count !== undefined && <span className={styles.count}>({t.count})</span>}
        </Tab>
      ))}
    </TabList>
  )
}

/* ------------------------------------------------------------------ */
/* Detail list & stat                                                  */
/* ------------------------------------------------------------------ */

const useDetailStyles = makeStyles({
  term: {
    margin: 0,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  value: {
    margin: 0,
    marginTop: tokens.spacingVerticalXXS,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    color: tokens.colorNeutralForeground1,
    overflowWrap: 'break-word',
  },
})

export function DetailList({ items, columns = 2 }: { items: { label: string; value: ReactNode }[]; columns?: 1 | 2 | 3 }) {
  const styles = useDetailStyles()
  const grid = columns === 1 ? '' : columns === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'
  return (
    <dl className={`grid grid-cols-1 ${grid} gap-x-6 gap-y-4`}>
      {items.map(i => (
        <div key={i.label} className="min-w-0">
          <dt className={styles.term}>{i.label}</dt>
          <dd className={styles.value}>{i.value === undefined || i.value === null || i.value === '' ? '—' : i.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  const styles = useCardStyles()
  return (
    <Card className={styles.stat}>
      <Text as="p" className={styles.statLabel}>
        {label}
      </Text>
      <Title3 as="p" className={styles.statValue}>
        {value}
      </Title3>
      {hint && (
        <Caption1 as="p" className={styles.statHint}>
          {hint}
        </Caption1>
      )}
    </Card>
  )
}
