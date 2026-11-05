import { useState, type CSSProperties, type ImgHTMLAttributes, type ReactNode } from 'react'
import { makeStyles, mergeClasses, shorthands, Skeleton, SkeletonItem, tokens } from '@fluentui/react-components'
import { ImageOff24Regular } from '@fluentui/react-icons'
import { HERO_NAVY, ON_NAVY_FG, withAlpha } from '../theme/fluentTheme'

/**
 * Fluent v9 Skeleton compositions that mirror the real page layouts, used wherever content is
 * not yet available (lazy routes, live data loads, charts measuring their card, remote images).
 * Each top-level skeleton is a polite live status ("Loading...") with aria-busy; the shimmer
 * blocks themselves are hidden from assistive tech. Fluent disables the animation under
 * prefers-reduced-motion.
 */

/** Plot height shared by ChartCard and the chart placeholders. */
export const CHART_HEIGHT = 240

const cardBorder = `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`

const useStyles = makeStyles({
  status: { display: 'block' },
  page: {
    maxWidth: '1440px',
    marginInlineStart: 'auto',
    marginInlineEnd: 'auto',
    paddingInlineStart: tokens.spacingHorizontalXXL,
    paddingInlineEnd: tokens.spacingHorizontalXXL,
    paddingTop: '32px',
    paddingBottom: '32px',
  },
  stack: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  header: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, marginBottom: tokens.spacingVerticalXXL },
  crumbs: { display: 'flex', gap: tokens.spacingHorizontalM, alignItems: 'center' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: tokens.spacingHorizontalL, flexWrap: 'wrap' },
  actions: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  shell: { backgroundColor: tokens.colorNeutralBackground1, border: cardBorder, borderRadius: tokens.borderRadiusMedium, minWidth: 0, overflow: 'hidden' },
  shellHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    minHeight: '24px',
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalXL),
    borderBottom: cardBorder,
  },
  shellBody: { ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalXL) },
  shellFooter: { ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalXL), borderTop: cardBorder },
  divider: { height: tokens.strokeWidthThin, backgroundColor: tokens.colorNeutralStroke2 },
  fields: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, maxWidth: '40rem' },
  field: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS, minWidth: 0 },
  actionRow: { marginTop: tokens.spacingVerticalXL, paddingTop: tokens.spacingVerticalL, borderTop: cardBorder },
  formCard: { maxWidth: '48rem' },
  glanceHead: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalL,
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalXL, '0'),
  },
  figures: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: tokens.strokeWidthThin,
    borderTop: cardBorder,
    backgroundColor: tokens.colorNeutralStroke2,
    '@media (min-width: 1024px)': { gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' },
  },
  figuresStandalone: {
    marginBottom: tokens.spacingVerticalXXL,
    border: cardBorder,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
  },
  figure: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalXL),
    backgroundColor: tokens.colorNeutralBackground1,
    '@media (max-width: 1023px)': { ':last-child:nth-child(odd)': { gridColumn: '1 / -1' } },
  },
  listItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalM,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalXL),
    ':not(:last-child)': { borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke3}` },
  },
  tabs: { display: 'flex', gap: tokens.spacingHorizontalXL, ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalXL), borderBottom: cardBorder },
  rowLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    ':not(:last-child)': { borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke3}` },
  },
  toolbar: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: tokens.spacingHorizontalL, marginBottom: tokens.spacingVerticalL },
  navGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    ':not(:first-child)': { borderTop: cardBorder },
  },
  hero: { backgroundColor: HERO_NAVY },
  heroInner: {
    maxWidth: '1440px',
    marginInlineStart: 'auto',
    marginInlineEnd: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
    ...shorthands.padding('80px', tokens.spacingHorizontalXXL),
    '@media (min-width: 768px)': { ...shorthands.padding('112px', tokens.spacingHorizontalXXL) },
  },
  banner: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    minHeight: '172px',
    ...shorthands.padding(tokens.spacingVerticalXXL, tokens.spacingHorizontalXXL),
    backgroundColor: HERO_NAVY,
  },
  programHero: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    overflow: 'hidden',
    backgroundColor: HERO_NAVY,
    '@media (min-width: 1024px)': { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', minHeight: '344px' },
  },
  programHeroText: { display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: tokens.spacingVerticalM, ...shorthands.padding('40px', tokens.spacingHorizontalXXL) },
  programHeroImage: { display: 'none', height: '100%', '@media (min-width: 1024px)': { display: 'block' } },
  tierCard: { borderTopWidth: '3px', borderTopColor: tokens.colorNeutralStencil1 },
  ctaBand: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacingHorizontalL, ...shorthands.padding(tokens.spacingVerticalXL, tokens.spacingHorizontalXL), borderRadius: tokens.borderRadiusMedium, backgroundColor: HERO_NAVY },
  authSplit: {
    display: 'flex',
    flexDirection: 'column',
    '@media (min-width: 1024px)': { flexDirection: 'row', border: cardBorder, backgroundColor: tokens.colorNeutralBackground1 },
  },
  authBrand: { display: 'none', flexDirection: 'column', width: '420px', flexShrink: 0, backgroundColor: HERO_NAVY, '@media (min-width: 1024px)': { display: 'flex' } },
  authForm: { flex: 1, display: 'flex', '@media (min-width: 1024px)': { justifyContent: 'center', ...shorthands.padding('40px', tokens.spacingHorizontalXXL) } },
  table: { backgroundColor: tokens.colorNeutralBackground1, border: cardBorder, borderRadius: tokens.borderRadiusMedium, overflow: 'hidden' },
  tableHead: {
    display: 'grid',
    gap: tokens.spacingHorizontalL,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: cardBorder,
  },
  tableRow: {
    display: 'grid',
    gap: tokens.spacingHorizontalL,
    alignItems: 'center',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke3}`,
  },
  chart: { display: 'flex', alignItems: 'flex-end', gap: tokens.spacingHorizontalM, height: '100%', paddingTop: tokens.spacingVerticalM },
  chartBar: { flex: 1 },
  imageWrap: { position: 'relative', overflow: 'hidden' },
  imageFill: { position: 'absolute', inset: 0, width: '100%', height: '100%' },
  imageHidden: { opacity: 0 },
  imageShown: { opacity: 1, transitionProperty: 'opacity', transitionDuration: tokens.durationNormal },
  imageError: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground3,
  },
  srOnly: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
  },
})

/** Live-region wrapper announcing "Loading..." while the skeleton is shown; `variant` is exposed as data-skeleton. */
export function LoadingStatus({ label = 'Loading...', children, className, variant }: { label?: string; children: ReactNode; className?: string; variant?: string }) {
  const s = useStyles()
  return (
    <div role="status" aria-live="polite" aria-busy="true" data-skeleton={variant} className={mergeClasses(s.status, className)}>
      <span className={s.srOnly}>{label}</span>
      <Skeleton aria-hidden="true">{children}</Skeleton>
    </div>
  )
}

const bar = (width: CSSProperties['width'], size: 8 | 12 | 16 | 20 | 24 | 28 | 32 | 36 | 40 = 12, style?: CSSProperties) => (
  <SkeletonItem size={size} style={{ width, ...style }} />
)

/** Rows of a data table: header band plus `rows` rows of `columns` cells. `bare` drops the outer border (inside a card). */
export function TableSkeletonBlock({ rows = 6, columns = 5, bare = false }: { rows?: number; columns?: number; bare?: boolean }) {
  const s = useStyles()
  const template = `minmax(0, 2fr) ${'minmax(0, 1fr) '.repeat(Math.max(0, columns - 1))}`.trim()
  return (
    <div className={bare ? undefined : s.table}>
      <div className={s.tableHead} style={{ gridTemplateColumns: template }}>
        {Array.from({ length: columns }, (_, i) => (
          <SkeletonItem key={i} size={12} style={{ width: i === 0 ? '50%' : '70%' }} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className={s.tableRow} style={{ gridTemplateColumns: template }}>
          {Array.from({ length: columns }, (_, c) => (
            <SkeletonItem key={c} size={c === 0 ? 16 : 12} style={{ width: c === 0 ? `${70 - ((r * 7) % 25)}%` : `${55 + ((r + c) * 9) % 35}%` }} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Bars resembling a chart; fills its parent's height. */
function ChartBlock({ bars = 7 }: { bars?: number }) {
  const s = useStyles()
  return (
    <div className={s.chart}>
      {Array.from({ length: bars }, (_, i) => (
        <SkeletonItem key={i} className={s.chartBar} style={{ height: `${35 + ((i * 37) % 60)}%` }} />
      ))}
    </div>
  )
}

/** Stand-alone chart placeholder (inside a ChartCard while it measures its width). */
export function ChartSkeleton({ height = CHART_HEIGHT, label = 'Loading chart...' }: { height?: number; label?: string }) {
  return (
    <LoadingStatus label={label}>
      <div style={{ height }}>
        <ChartBlock />
      </div>
    </LoadingStatus>
  )
}

/** Stand-alone table placeholder. */
export function TableSkeleton(props: { rows?: number; columns?: number; label?: string }) {
  return (
    <LoadingStatus label={props.label}>
      <TableSkeletonBlock rows={props.rows} columns={props.columns} />
    </LoadingStatus>
  )
}

export type PageSkeletonVariant = 'dashboard' | 'landing' | 'hub' | 'program' | 'article' | 'list' | 'form' | 'settings' | 'detail' | 'summary' | 'auth'

/** Light shimmer on navy surfaces (hero, brand panels). */
const ON_NAVY_STENCIL = {
  '--colorNeutralStencil1': withAlpha(ON_NAVY_FG, 0.1),
  '--colorNeutralStencil2': withAlpha(ON_NAVY_FG, 0.18),
} as CSSProperties

/** Breadcrumbs, optional eyebrow, title and description, with actions bottom-aligned on the right (as PageHeader). */
function PageHeaderSkeleton({
  crumbs = 2,
  eyebrow = false,
  description = true,
  actions = [],
}: {
  crumbs?: number
  eyebrow?: boolean
  description?: boolean
  actions?: number[]
}) {
  const s = useStyles()
  return (
    <div className={s.header}>
      {crumbs > 0 && (
        <div className={s.crumbs}>
          {Array.from({ length: crumbs + 1 }, (_, i) => (
            <SkeletonItem key={i} size={12} style={{ width: i === crumbs ? '96px' : '56px' }} />
          ))}
        </div>
      )}
      <div className={s.headerRow}>
        <div className={s.stack} style={{ flex: '1 1 320px', minWidth: 0 }}>
          {eyebrow && bar('96px', 12)}
          {bar('min(340px, 70%)', 28)}
          {description && bar('min(520px, 95%)', 16)}
        </div>
        {actions.length > 0 && (
          <div className={s.actions}>
            {actions.map((w, i) => (
              <SkeletonItem key={i} size={32} style={{ width: `${w}px` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Card shell (white, thin cool-gray border) with an optional Panel-style header row. */
function CardShell({
  title,
  action,
  children,
  className,
  padded = true,
}: {
  title?: number
  action?: number
  children?: ReactNode
  className?: string
  padded?: boolean
}) {
  const s = useStyles()
  return (
    <div className={mergeClasses(s.shell, className)}>
      {title !== undefined && (
        <div className={s.shellHeader}>
          {bar(`${title}px`, 16)}
          {action !== undefined && <SkeletonItem size={24} style={{ width: `${action}px` }} />}
        </div>
      )}
      {children && <div className={padded ? s.shellBody : undefined}>{children}</div>}
    </div>
  )
}

/** Single-column labelled fields capped at the 40rem form column. */
function Fields({ count, section = true }: { count: number; section?: boolean }) {
  const s = useStyles()
  return (
    <div className={s.fields}>
      {section && bar('120px', 16)}
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={s.field}>
          {bar(`${90 + ((i * 37) % 80)}px`, 12)}
          <SkeletonItem size={32} />
        </div>
      ))}
    </div>
  )
}

function ActionRow({ widths = [140, 88] }: { widths?: number[] }) {
  const s = useStyles()
  return (
    <div className={mergeClasses(s.actions, s.actionRow)}>
      {widths.map((w, i) => (
        <SkeletonItem key={i} size={32} style={{ width: `${w}px` }} />
      ))}
    </div>
  )
}

function StatCards({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(var(--stats),minmax(0,1fr))] gap-4" style={{ '--stats': count } as CSSProperties}>
      {Array.from({ length: count }, (_, i) => (
        <CardShell key={i}>
          <div className="flex flex-col gap-2">
            {bar('55%', 12)}
            {bar('35%', 24)}
            {bar('70%', 12)}
          </div>
        </CardShell>
      ))}
    </div>
  )
}

/** Needs-attention list beside a tabbed table (dashboard and hubs). */
function WorkRowSkeleton() {
  const s = useStyles()
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6 items-start mb-6" data-skeleton-region="work">
      <CardShell title={170} padded={false}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className={s.listItem}>
            <SkeletonItem shape="circle" size={28} />
            <div className={s.stack} style={{ flex: 1 }}>
              {bar('35%', 12)}
              {bar('70%', 16)}
              {bar('55%', 12)}
            </div>
          </div>
        ))}
      </CardShell>
      <CardShell padded={false}>
        <div className={s.tabs}>
          {[130, 140, 130].map((w, i) => (
            <SkeletonItem key={i} size={16} style={{ width: `${w}px` }} />
          ))}
        </div>
        <TableSkeletonBlock rows={3} columns={5} bare />
        <div className={s.shellFooter}>{bar('200px', 12)}</div>
      </CardShell>
    </div>
  )
}

/** Joined summary figures (dashboard card footer, or standalone on the hubs). */
function FigureStripSkeleton({ count = 5, standalone = false }: { count?: number; standalone?: boolean }) {
  const s = useStyles()
  return (
    <div className={mergeClasses(s.figures, standalone && s.figuresStandalone)} data-skeleton-region="figures">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={s.figure}>
          {bar('60%', 12)}
          {bar('45%', 24)}
          {bar('70%', 12)}
        </div>
      ))}
    </div>
  )
}

/** Partner dashboard: header, Pipeline at a glance, attention + tabbed work list, pipeline trends. */
function DashboardSkeleton() {
  const s = useStyles()
  return (
    <>
      <PageHeaderSkeleton crumbs={0} eyebrow actions={[170, 240, 200, 130]} />
      <div className={mergeClasses(s.shell, 'mb-6')} data-skeleton-region="glance">
        <div className={s.glanceHead}>
          <div className={s.stack}>
            {bar('160px', 16)}
            {bar('220px', 12)}
          </div>
          <SkeletonItem size={32} style={{ width: '200px' }} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] gap-6 px-5 py-5">
          <div className="flex flex-col gap-3 min-w-0">
            <div className="flex justify-between gap-3">
              {bar('230px', 24)}
              {bar('120px', 16)}
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex flex-col gap-2" style={{ flex: 5 }}>
                {bar('55%', 16)}
                <SkeletonItem style={{ height: '40px' }} />
              </div>
              <div className="flex flex-col gap-2" style={{ flex: 1.2 }}>
                {bar('80%', 16)}
                <SkeletonItem style={{ height: '40px' }} />
              </div>
            </div>
            {bar('60%', 12)}
            <div className={s.divider} />
            <div className="flex justify-between gap-3">
              {bar('140px', 16)}
              {bar('100px', 16)}
            </div>
            <SkeletonItem style={{ height: '24px' }} />
            {bar('40%', 12)}
          </div>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex justify-between gap-3">
                {bar(i === 0 ? '30%' : `${40 + ((i * 11) % 25)}%`, 12)}
                {bar('22%', 12)}
              </div>
            ))}
          </div>
        </div>
        <FigureStripSkeleton />
      </div>

      <WorkRowSkeleton />
      <div data-skeleton-region="trends">
        <div className="flex items-baseline gap-3 mb-4">
          {bar('150px', 20)}
          {bar('160px', 12)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
          <CardShell title={180} action={130}>
            <div style={{ height: CHART_HEIGHT }}>
              <ChartBlock />
            </div>
          </CardShell>
          <CardShell title={170} action={130}>
            <div className="flex flex-col gap-5" style={{ minHeight: CHART_HEIGHT }}>
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    {bar('30%', 12)}
                    {bar('25%', 12)}
                  </div>
                  <SkeletonItem size={12} style={{ width: `${95 - i * 25}%` }} />
                </div>
              ))}
            </div>
          </CardShell>
        </div>
      </div>
    </>
  )
}

/** Public / non-partner home: full-bleed navy hero, then the benefits grid and resource cards. */
function LandingSkeleton() {
  const s = useStyles()
  return (
    <>
      <div className={s.hero} style={ON_NAVY_STENCIL}>
        <div className={s.heroInner}>
          {bar('180px', 12)}
          {bar('min(560px, 85%)', 40)}
          {bar('min(420px, 60%)', 40)}
          {bar('min(520px, 90%)', 16)}
          <div className={s.actions}>
            <SkeletonItem size={32} style={{ width: '150px' }} />
            <SkeletonItem size={32} style={{ width: '130px' }} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8" style={{ maxWidth: '48rem' }}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={s.stack}>
                {bar('70%', 12)}
                {bar('45%', 24)}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={s.page}>
        <div className={s.stack}>
          {bar('160px', 12)}
          {bar('min(460px, 80%)', 28)}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-8">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={s.stack}>
              <SkeletonItem size={36} style={{ width: '36px' }} />
              {bar('65%', 16)}
              {bar('95%', 12)}
              {bar('80%', 12)}
            </div>
          ))}
        </div>
        <div className={mergeClasses(s.stack, 'mt-12')}>
          {bar('100px', 12)}
          {bar('min(380px, 75%)', 28)}
        </div>
        <div className="grid md:grid-cols-3 gap-8 mt-8">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex gap-4">
              <SkeletonItem shape="circle" size={32} />
              <div className={s.stack} style={{ flex: 1 }}>
                {bar('45%', 16)}
                {bar('90%', 12)}
                {bar('70%', 12)}
              </div>
            </div>
          ))}
        </div>
        <div className={mergeClasses(s.stack, 'mt-12')}>
          {bar('100px', 12)}
          {bar('min(320px, 70%)', 28)}
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-8">
          {Array.from({ length: 2 }, (_, i) => (
            <CardShell key={i}>
              <div className={s.stack}>
                {bar('35%', 16)}
                {bar('60%', 12)}
              </div>
            </CardShell>
          ))}
        </div>
        <div className={mergeClasses(s.ctaBand, 'mt-8')} style={ON_NAVY_STENCIL}>
          <div className={s.stack} style={{ flex: '1 1 280px' }}>
            {bar('min(240px, 70%)', 20)}
            {bar('min(360px, 90%)', 12)}
          </div>
          <div className={s.actions}>
            <SkeletonItem size={32} style={{ width: '150px' }} />
            <SkeletonItem size={32} style={{ width: '120px' }} />
          </div>
        </div>
      </div>
    </>
  )
}

/** Opportunities / Customers hubs: summary figures, attention + tabbed work list, then area cards. */
function HubSkeleton() {
  const s = useStyles()
  return (
    <>
      <PageHeaderSkeleton crumbs={1} actions={[170, 220]} />
      <FigureStripSkeleton standalone />
      <WorkRowSkeleton />
      {bar('170px', 20, { marginBottom: tokens.spacingVerticalM })}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <CardShell key={i}>
            <div className={s.stack}>
              <div className="flex items-center gap-3">
                <SkeletonItem size={28} style={{ width: '28px' }} />
                {bar('55%', 16)}
              </div>
              {bar('95%', 12)}
              {bar('75%', 12)}
              {bar('45%', 12, { marginTop: tokens.spacingVerticalS })}
            </div>
          </CardShell>
        ))}
      </div>
    </>
  )
}

/** Partner program home: split navy hero with image, highlights, partnership band, tiers, resources and popular questions. */
function ProgramSkeleton() {
  const s = useStyles()
  return (
    <>
      <div className={s.crumbs} style={{ marginBottom: tokens.spacingVerticalM }}>
        {bar('56px', 12)}
        {bar('96px', 12)}
      </div>
      <div className={mergeClasses(s.programHero, 'mb-8')} style={ON_NAVY_STENCIL}>
        <div className={s.programHeroText}>
          {bar('150px', 12)}
          {bar('min(380px, 85%)', 28)}
          {bar('95%', 12)}
          {bar('90%', 12)}
          {bar('60%', 12)}
          <div className={s.actions} style={{ marginTop: tokens.spacingVerticalL }}>
            <SkeletonItem size={32} style={{ width: '130px' }} />
            <SkeletonItem size={32} style={{ width: '110px' }} />
          </div>
        </div>
        <SkeletonItem className={s.programHeroImage} style={{ borderRadius: 0 }} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 mb-6">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={s.stack}>
            {bar('45%', 20)}
            {bar('70%', 12)}
          </div>
        ))}
      </div>
      <div className={mergeClasses(s.shell, 'mb-8')}>
        <div className={s.glanceHead} style={{ paddingBottom: tokens.spacingVerticalM }}>
          <div className={s.stack}>
            {bar('120px', 16)}
            {bar('240px', 12)}
          </div>
          {bar('160px', 12)}
        </div>
        <div className={s.figures} style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={s.figure}>
              {bar('55%', 12)}
              {bar('35%', 20)}
              {bar('70%', 12)}
            </div>
          ))}
        </div>
      </div>
      <div className={mergeClasses(s.stack, 'mb-4')}>
        {bar('90px', 12)}
        {bar('min(260px, 70%)', 20)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }, (_, i) => (
          <CardShell key={i} className={s.tierCard}>
            <div className={s.stack}>
              {bar('45%', 16)}
              {Array.from({ length: 3 }, (_, j) => (
                <div key={j} className="flex flex-col gap-1 mt-1">
                  {bar('55%', 12)}
                  {bar('75%', 12)}
                </div>
              ))}
            </div>
          </CardShell>
        ))}
      </div>
      {bar('min(200px, 60%)', 20, { marginBottom: tokens.spacingVerticalM })}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {Array.from({ length: 2 }, (_, i) => (
          <CardShell key={i}>
            <div className={s.stack}>
              <SkeletonItem size={16} style={{ width: '16px' }} />
              {bar('40%', 20)}
              {bar('90%', 12)}
              {bar('30%', 12)}
            </div>
          </CardShell>
        ))}
      </div>
      <div className={mergeClasses(s.stack, 'mb-4')}>
        {bar('80px', 12)}
        {bar('min(200px, 60%)', 20)}
      </div>
      <div className={s.shell}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className={s.rowLine} style={{ minHeight: '52px' }}>
            {bar(`${30 + i * 6}%`, 12)}
            <SkeletonItem size={16} style={{ width: '16px' }} />
          </div>
        ))}
      </div>
    </>
  )
}
/** Static content pages (program details, become a partner, FAQs, sitemap): headed text sections + side card. */
function ArticleSkeleton() {
  const s = useStyles()
  return (
    <>
      <PageHeaderSkeleton crumbs={2} />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-x-12 gap-y-6 items-start">
        <div className="flex flex-col gap-8 min-w-0" style={{ maxWidth: '48rem' }}>
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className={s.stack} style={{ gap: tokens.spacingVerticalM }}>
              {bar(i === 0 ? '180px' : '220px', 20)}
              {Array.from({ length: 3 }, (_, j) => (
                <div key={j} className="flex gap-3">
                  <SkeletonItem shape="circle" size={24} />
                  <div className={s.stack} style={{ flex: 1 }}>
                    {bar(`${35 + ((i + j) * 9) % 25}%`, 16)}
                    {bar('95%', 12)}
                    {bar(`${60 + ((i + j) * 13) % 30}%`, 12)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <CardShell title={140}>
          <div className={s.stack}>
            {bar('90%', 12)}
            {bar('70%', 12)}
            <SkeletonItem size={32} style={{ width: '120px' }} />
          </div>
        </CardShell>
      </div>
    </>
  )
}
/** Data lists: one primary action, labelled toolbar, table card with a record-count footer. */
function ListSkeleton() {
  const s = useStyles()
  return (
    <>
      <PageHeaderSkeleton crumbs={2} actions={[160]} />
      <div className={s.toolbar}>
        <div className={s.field} style={{ flex: '0 1 380px' }}>
          {bar('110px', 12)}
          <SkeletonItem size={32} />
        </div>
        <div className={s.field}>
          {bar('50px', 12)}
          <div className={s.actions}>
            {[68, 60, 60, 56].map((w, i) => (
              <SkeletonItem key={i} size={32} style={{ width: `${w}px` }} />
            ))}
          </div>
        </div>
        <SkeletonItem size={32} style={{ width: '130px', marginInlineStart: 'auto', alignSelf: 'flex-end' }} />
      </div>
      <CardShell padded={false}>
        <TableSkeletonBlock rows={6} columns={6} bare />
        <div className={s.shellFooter}>{bar('90px', 12)}</div>
      </CardShell>
    </>
  )
}

/** Create/edit forms: single-column fields in a 48rem card, with an action row. */
function FormSkeleton() {
  const s = useStyles()
  return (
    <>
      <PageHeaderSkeleton crumbs={3} eyebrow />
      <CardShell className={s.formCard} title={130}>
        <Fields count={6} />
        <ActionRow />
      </CardShell>
    </>
  )
}

/** Profile and account security: settings navigation beside a form card. */
function SettingsSkeleton() {
  const s = useStyles()
  return (
    <>
      <PageHeaderSkeleton crumbs={1} />
      <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,48rem)] gap-3 items-start">
        <CardShell padded={false}>
          {[3, 4, 2].map((n, g) => (
            <div key={g} className={s.navGroup}>
              {bar('45%', 12)}
              {Array.from({ length: n }, (_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <SkeletonItem size={16} style={{ width: '16px' }} />
                  {bar(`${50 + ((i * 17) % 30)}%`, 12)}
                </div>
              ))}
            </div>
          ))}
        </CardShell>
        <CardShell title={110}>
          <Fields count={4} section={false} />
          <ActionRow widths={[150]} />
        </CardShell>
      </div>
    </>
  )
}

/** Opportunity details: stat cards, then main cards (form, products) beside a side column. */
function DetailSkeleton() {
  const s = useStyles()
  return (
    <>
      <PageHeaderSkeleton crumbs={3} actions={[130, 32]} />
      <div className="flex flex-col gap-4">
        <StatCards count={3} />
        <SkeletonItem size={24} style={{ width: '170px' }} />
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] gap-4 items-start">
          <div className={s.stack} style={{ gap: tokens.spacingVerticalL, minWidth: 0 }}>
            <CardShell title={170}>
              <Fields count={5} />
            </CardShell>
            <CardShell title={90} action={110} padded={false}>
              <TableSkeletonBlock rows={2} columns={4} bare />
            </CardShell>
          </div>
          <div className={s.stack} style={{ gap: tokens.spacingVerticalL }}>
            {[4, 2, 2].map((n, i) => (
              <CardShell key={i} title={100}>
                <div className={s.stack}>
                  {Array.from({ length: n }, (_, j) => (
                    <div key={j} className="flex gap-2 items-start">
                      <SkeletonItem shape="circle" size={16} />
                      <div className={s.stack} style={{ flex: 1 }}>
                        {bar('70%', 12)}
                        {bar('45%', 12)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardShell>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

/** Distributed opportunity summary: read-only details card beside a distribution card. */
function SummarySkeleton() {
  const s = useStyles()
  return (
    <>
      <PageHeaderSkeleton crumbs={3} eyebrow actions={[160, 90]} />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(200px,300px)] gap-3 items-start">
        <CardShell title={150}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className={s.stack}>
                {bar('35%', 12)}
                {bar(`${45 + ((i * 11) % 30)}%`, 16)}
              </div>
            ))}
          </div>
          <div className={s.divider} style={{ marginTop: tokens.spacingVerticalL, marginBottom: tokens.spacingVerticalL }} />
          <div className={s.stack}>
            {bar('20%', 12)}
            {bar('85%', 16)}
            {bar('20%', 12, { marginTop: tokens.spacingVerticalS })}
            {bar('60%', 16)}
          </div>
        </CardShell>
        <CardShell title={100}>
          <div className={s.stack}>
            {bar('40%', 12)}
            {bar('55%', 16)}
            {bar('40%', 12, { marginTop: tokens.spacingVerticalS })}
            {bar('35%', 16)}
          </div>
        </CardShell>
      </div>
    </>
  )
}

/** Sign-in and account pages: header, then a bordered split card (navy brand panel + form column). */
function AuthSkeleton() {
  const s = useStyles()
  return (
    <>
      <PageHeaderSkeleton crumbs={1} description={false} />
      <div className={s.authSplit}>
        <div className={s.authBrand} style={ON_NAVY_STENCIL}>
          <SkeletonItem style={{ height: '176px', borderRadius: 0 }} />
          <div className={s.stack} style={{ padding: tokens.spacingHorizontalXXXL, gap: tokens.spacingVerticalM }}>
            {bar('80%', 20)}
            {bar('90%', 12)}
            {bar('70%', 12)}
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonItem key={i} size={12} style={{ width: `${60 + ((i * 9) % 25)}%`, marginTop: i === 0 ? tokens.spacingVerticalM : 0 }} />
            ))}
          </div>
        </div>
        <div className={s.authForm}>
          <div className={s.stack} style={{ width: '100%', maxWidth: '440px', gap: tokens.spacingVerticalL }}>
            {bar('90%', 12)}
            <SkeletonItem size={32} />
            {bar('40%', 12, { alignSelf: 'center' })}
            <Fields count={2} section={false} />
            <SkeletonItem size={32} />
          </div>
        </div>
      </div>
    </>
  )
}

const PAGE_BODIES: Record<Exclude<PageSkeletonVariant, 'landing'>, () => ReactNode> = {
  dashboard: DashboardSkeleton,
  hub: HubSkeleton,
  program: ProgramSkeleton,
  article: ArticleSkeleton,
  list: ListSkeleton,
  form: FormSkeleton,
  settings: SettingsSkeleton,
  detail: DetailSkeleton,
  summary: SummarySkeleton,
  auth: AuthSkeleton,
}

/** Full-page placeholder matching the layout of the page being loaded (see skeletonVariantForPath). */
export function PageSkeleton({ variant = 'article' }: { variant?: PageSkeletonVariant }) {
  const s = useStyles()
  if (variant === 'landing')
    return (
      <LoadingStatus variant={variant}>
        <LandingSkeleton />
      </LoadingStatus>
    )
  const Body = PAGE_BODIES[variant]
  return (
    <LoadingStatus variant={variant}>
      <div className={s.page}>
        <Body />
      </div>
    </LoadingStatus>
  )
}

/**
 * <img> that shows a Skeleton block until the image has loaded, and a neutral placeholder
 * (keeping the alt text available) if it fails. The wrapper reserves space, so pass a
 * className/style that gives it a size (height or aspect-ratio) — the image fills it.
 */
export function ImageWithSkeleton({
  className,
  style,
  imgClassName,
  alt,
  ...img
}: ImgHTMLAttributes<HTMLImageElement> & { alt: string; imgClassName?: string }) {
  const s = useStyles()
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading')
  return (
    <div className={mergeClasses(s.imageWrap, className)} style={style} aria-busy={state === 'loading' || undefined}>
      {state === 'loading' && (
        <Skeleton aria-hidden="true" className={s.imageFill}>
          <SkeletonItem className={s.imageFill} style={{ borderRadius: 0 }} />
        </Skeleton>
      )}
      {state === 'error' ? (
        <div className={s.imageError} role="img" aria-label={alt}>
          <ImageOff24Regular aria-hidden="true" />
        </div>
      ) : (
        <img
          {...img}
          alt={alt}
          className={mergeClasses(s.imageFill, state === 'loaded' ? s.imageShown : s.imageHidden, imgClassName)}
          style={{ objectFit: 'cover' }}
          onLoad={e => {
            setState('loaded')
            img.onLoad?.(e)
          }}
          onError={e => {
            setState('error')
            img.onError?.(e)
          }}
        />
      )}
    </div>
  )
}

const AUTH_PATHS = new Set([
  '/login',
  '/registration',
  '/redeem-invitation',
  '/forgot-password',
  '/reset-password',
  '/external-login-confirmation',
  '/signin',
  '/register',
])

/**
 * Picks the skeleton that matches the page about to render for a given path.
 * `/` is the dashboard for partners but the landing page for everyone else.
 */
export function skeletonVariantForPath(pathname: string, isPartner = true, isTechnician = false): PageSkeletonVariant {
  const p = pathname.toLowerCase().replace(/\/+$/, '') || '/'
  // The Technician workspace home is a header, figures and two work panels: the hub layout.
  if (p === '/') return isTechnician ? 'hub' : isPartner ? 'dashboard' : 'landing'
  if (p === '/profile' || p.startsWith('/account/manage/')) return 'settings'
  if (AUTH_PATHS.has(p) || p.startsWith('/account/')) return 'auth'
  if (/opportunity-details|work-order-details/.test(p)) return 'detail'
  if (/opportunity-summary/.test(p)) return 'summary'
  if (/create-|edit-|register-to-be-a-partner|parent-account/.test(p)) return 'form'
  if (/managed-opportunities$|distributed-opportunities$|customer-accounts$|customer-contacts$|manage-access$|^\/work-orders$/.test(p)) return 'list'
  if (p === '/opportunities' || p === '/customers') return 'hub'
  if (p === '/partner-program') return 'program'
  return 'article'
}