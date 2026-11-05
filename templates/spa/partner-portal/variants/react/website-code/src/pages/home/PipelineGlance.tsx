import { useId, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoutePreload } from '../../hooks/useRoutePreload'
import {
  Body1,
  Body1Strong,
  Caption1,
  Caption1Strong,
  Card,
  Label,
  Select,
  Subtitle2,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  ToggleButton,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components'
import { Warning16Regular } from '@fluentui/react-icons'
import type { DealRegistration, Opportunity } from '../../data/types'
import { formatCompactCurrency, formatCurrency } from '../../lib/format'
import { AppLink } from '../../components/ui'
import { useElementWidth } from '../../components/charts'
import { BADGE_WARNING_FG } from '../../theme/fluentTheme'
import { CLOSE_PERIODS, readableOn, registrationBreakdown, seriesFill, statusBreakdown, statusHref, type ClosePeriod, type Slice, type StatusSlice } from './pipeline'

export interface GlanceFigure {
  label: string
  value: string
  hint: string
  to: string
  /** Needs action: tinted so risk stands apart from size figures. */
  warn?: boolean
}

type Measure = 'revenue' | 'count'

const MIDDOT = '\u00B7'
/** Matches `groups` gap (spacingHorizontalM). */
const GROUP_GAP = 12
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const useStyles = makeStyles({
  card: { ...shorthands.padding('0'), rowGap: '0', minWidth: 0 },
  head: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalXL, '0'),
    '@media (max-width: 639.98px)': { ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL, '0') },
  },
  title: { display: 'block', margin: 0, color: tokens.colorNeutralForeground1 },
  sub: { display: 'block', margin: 0, color: tokens.colorNeutralForeground2 },
  period: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    marginInlineStart: 'auto',
    '@media (max-width: 639.98px)': { marginInlineStart: 0, width: '100%', '& .fui-Select': { flex: 1 } },
  },
  periodLabel: { color: tokens.colorNeutralForeground2, whiteSpace: 'nowrap' },
  select: { minWidth: '11rem' },
  body: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: tokens.spacingHorizontalXXL,
    ...shorthands.padding(tokens.spacingVerticalXL, tokens.spacingHorizontalXL),
    '@media (min-width: 1024px)': { gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 340px)' },
    '@media (max-width: 639.98px)': { ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL) },
  },
  barHead: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    marginBottom: tokens.spacingVerticalM,
  },
  barTitle: { display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: tokens.spacingHorizontalS, color: tokens.colorNeutralForeground1 },
  segmented: {
    display: 'inline-flex',
    '& > button': { minWidth: 0 },
    '& > button:first-child': { borderStartEndRadius: 0, borderEndEndRadius: 0 },
    '& > button:last-child': { borderStartStartRadius: 0, borderEndStartRadius: 0, marginInlineStart: '-1px' },
  },
  nowrap: { whiteSpace: 'nowrap' },
  groups: { display: 'flex', alignItems: 'flex-end', gap: tokens.spacingHorizontalM },
  group: { flexBasis: 0, minWidth: '96px', display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalSNudge },
  groupLabel: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: tokens.spacingHorizontalS,
    paddingBottom: tokens.spacingVerticalXS,
    borderBottom: `${tokens.strokeWidthThick} solid ${tokens.colorNeutralForeground1}`,
  },
  groupLabelClosed: { borderBottomColor: tokens.colorNeutralStroke1, '& > :first-child': { color: tokens.colorNeutralForeground2 } },
  groupHint: { color: tokens.colorNeutralForeground2 },
  stack: { position: 'relative', display: 'flex', height: '40px' },
  stackSlim: { height: '24px' },
  seg: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '4px',
    height: '100%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    fontVariantNumeric: 'tabular-nums',
    borderInlineEndWidth: tokens.strokeWidthThick,
    borderInlineEndStyle: 'solid',
    borderInlineEndColor: tokens.colorNeutralBackground1,
    transitionProperty: 'opacity',
    transitionDuration: tokens.durationFaster,
    ':first-child': { borderStartStartRadius: tokens.borderRadiusMedium, borderEndStartRadius: tokens.borderRadiusMedium },
    ':last-child': { borderInlineEndWidth: 0, borderStartEndRadius: tokens.borderRadiusMedium, borderEndEndRadius: tokens.borderRadiusMedium },
    '@media (forced-colors: active)': { forcedColorAdjust: 'none' },
  },
  segLink: { cursor: 'pointer' },
  segDim: { opacity: 0.3 },
  segText: { ...shorthands.padding(0, tokens.spacingHorizontalXS), overflow: 'hidden', textOverflow: 'ellipsis' },
  segTextHatched: { borderRadius: tokens.borderRadiusSmall },
  tip: {
    position: 'absolute',
    top: `calc(100% + ${tokens.spacingVerticalS})`,
    zIndex: 2,
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow16,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  },
  help: { display: 'block', margin: 0, marginTop: tokens.spacingVerticalS, color: tokens.colorNeutralForeground2 },
  regs: { marginTop: tokens.spacingVerticalXL, paddingTop: tokens.spacingVerticalL, borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}` },
  regLegend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalL}`,
    marginTop: tokens.spacingVerticalS,
    color: tokens.colorNeutralForeground2,
  },
  regWarn: { color: BADGE_WARNING_FG, fontWeight: tokens.fontWeightSemibold },
  swatch: {
    display: 'inline-block',
    flexShrink: 0,
    width: '10px',
    height: '10px',
    marginInlineEnd: tokens.spacingHorizontalSNudge,
    borderRadius: tokens.borderRadiusSmall,
    verticalAlign: '-1px',
    '@media (forced-colors: active)': { forcedColorAdjust: 'none' },
  },
  empty: { display: 'block', margin: 0, color: tokens.colorNeutralForeground2 },
  legendCell: { paddingInlineStart: 0, whiteSpace: 'nowrap' },
  legend: { tableLayout: 'auto', alignSelf: 'start' },
  num: { textAlign: 'end', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  numHead: { textAlign: 'end', '& .fui-TableHeaderCell__button': { justifyContent: 'flex-end' } },
  groupRow: { borderBottom: 'none', ':hover': { backgroundColor: 'transparent' } },
  groupCell: { paddingTop: tokens.spacingVerticalS, color: tokens.colorNeutralForeground2 },
  rowHl: { backgroundColor: tokens.colorBrandBackground2, ':hover': { backgroundColor: tokens.colorBrandBackground2 } },
  totalRow: { fontWeight: tokens.fontWeightSemibold, borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`, borderBottom: 'none' },
  figures: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: tokens.strokeWidthThin,
    margin: 0,
    ...shorthands.padding(0),
    listStyle: 'none',
    overflow: 'hidden',
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderEndStartRadius: tokens.borderRadiusMedium,
    borderEndEndRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralStroke2,
    '@media (min-width: 1024px)': { gridTemplateColumns: 'repeat(var(--figure-count), minmax(0, 1fr))' },
  },
  figureWide: { '@media (max-width: 1023.98px)': { gridColumn: 'span 2' } },
  figuresStandalone: {
    ...shorthands.border(tokens.strokeWidthThin, 'solid', tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
    marginBottom: tokens.spacingVerticalXXL,
  },
  figure: { display: 'flex', backgroundColor: tokens.colorNeutralBackground1 },
  figureWarn: { backgroundColor: tokens.colorPaletteDarkOrangeBackground1 },
  figureLink: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalXL),
    color: tokens.colorNeutralForeground1,
    textDecorationLine: 'none',
    ':hover': { color: tokens.colorNeutralForeground1, textDecorationLine: 'none', backgroundColor: tokens.colorSubtleBackgroundHover },
    ':hover .figure-label': { textDecorationLine: 'underline' },
    '@media (max-width: 639.98px)': { ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL) },
  },
  figureLabel: { display: 'inline-flex', alignItems: 'center', gap: tokens.spacingHorizontalXS, color: tokens.colorNeutralForeground2 },
  figureValue: { fontSize: tokens.fontSizeBase500, lineHeight: tokens.lineHeightBase500, fontWeight: tokens.fontWeightSemibold, fontVariantNumeric: 'tabular-nums' },
  figureHint: { color: tokens.colorNeutralForeground2 },
  warnText: { color: BADGE_WARNING_FG },
})

export function PipelineGlance({
  rows,
  regs,
  period,
  onPeriodChange,
  figures,
  canDistributed,
}: {
  rows: Opportunity[]
  regs: DealRegistration[]
  period: ClosePeriod
  onPeriodChange: (p: ClosePeriod) => void
  figures: GlanceFigure[]
  canDistributed: boolean
}) {
  const styles = useStyles()
  const id = useId()
  const [measure, setMeasure] = useState<Measure>('revenue')
  const [hovered, setHovered] = useState<string | null>(null)
  const slices = statusBreakdown(rows)
  const value = (s: Slice) => (measure === 'revenue' ? s.revenue : s.count)
  const fmt = (n: number) => (measure === 'revenue' ? formatCompactCurrency(n) : String(n))
  const total = slices.reduce((a, s) => a + value(s), 0)
  const totalRevenue = slices.reduce((a, s) => a + s.revenue, 0)
  const totalCount = slices.reduce((a, s) => a + s.count, 0)
  const phrase = CLOSE_PERIODS.find(p => p.id === period)?.phrase ?? ''

  return (
    <section aria-labelledby={`${id}-title`} className="mb-6">
      <Card className={styles.card}>
        <div className={styles.head}>
          <div className="min-w-0">
            <Subtitle2 as="h2" id={`${id}-title`} className={styles.title}>
              Pipeline at a glance
            </Subtitle2>
            <Body1 as="p" className={styles.sub}>
              Opportunities {phrase}
            </Body1>
          </div>
          <div className={styles.period}>
            <Label htmlFor={`${id}-period`} className={styles.periodLabel}>
              Close date
            </Label>
            <Select id={`${id}-period`} className={styles.select} value={period} onChange={(_, d) => onPeriodChange(d.value as ClosePeriod)}>
              {CLOSE_PERIODS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className={styles.body}>
          <div className="min-w-0">
            <div className={styles.barHead}>
              <span className={styles.barTitle}>
                <Body1Strong id={`${id}-by`}>Opportunities by</Body1Strong>
                <span role="group" aria-labelledby={`${id}-by`} className={styles.segmented}>
                  <ToggleButton size="small" checked={measure === 'revenue'} onClick={() => setMeasure('revenue')}>
                    Revenue
                  </ToggleButton>
                  <ToggleButton size="small" checked={measure === 'count'} onClick={() => setMeasure('count')}>
                    Count
                  </ToggleButton>
                </span>
              </span>
              <Body1Strong className={styles.nowrap}>
                {measure === 'revenue' ? `${formatCompactCurrency(totalRevenue)} total` : plural(totalCount, 'opportunity', 'opportunities')}
              </Body1Strong>
            </div>
            {slices.length === 0 ? (
              <Body1 as="p" className={styles.empty}>
                No opportunities {phrase}. Choose another close date range.
              </Body1>
            ) : (
              <StatusBar slices={slices} value={value} fmt={fmt} total={total} hovered={hovered} onHover={setHovered} canDistributed={canDistributed} measure={measure} />
            )}
            <RegistrationBar regs={regs} />
          </div>

          {slices.length > 0 && (
            <StatusLegend slices={slices} measure={measure} hovered={hovered} onHover={setHovered} canDistributed={canDistributed} />
          )}
        </div>

        <FigureStrip figures={figures} label="Pipeline summary" />
      </Card>
    </section>
  )
}

/**
 * Row of linked headline figures (value + hint), tinted when a figure needs action. Inside a card it sits under the
 * card body; `standalone` renders it as its own card (section overview pages).
 */
export function FigureStrip({ figures, label, standalone = false }: { figures: GlanceFigure[]; label: string; standalone?: boolean }) {
  const styles = useStyles()
  return (
    <ul aria-label={label} className={mergeClasses(styles.figures, standalone && styles.figuresStandalone)} style={{ ['--figure-count' as string]: figures.length }}>
      {figures.map((f, i) => (
        <li key={f.label} className={mergeClasses(styles.figure, f.warn && styles.figureWarn, figures.length % 2 === 1 && i === figures.length - 1 && styles.figureWide)}>
          <AppLink to={f.to} className={styles.figureLink}>
            <Caption1 className={mergeClasses('figure-label', styles.figureLabel, f.warn && styles.warnText)}>
              {f.warn && <Warning16Regular aria-hidden="true" />}
              {f.label}
            </Caption1>
            <span className={styles.figureValue}>{f.value}</span>
            <Caption1 className={mergeClasses(styles.figureHint, f.warn && styles.warnText)}>{f.hint}</Caption1>
          </AppLink>
        </li>
      ))}
    </ul>
  )
}

function StatusBar({
  slices,
  value,
  fmt,
  total,
  hovered,
  onHover,
  canDistributed,
  measure,
}: {
  slices: StatusSlice[]
  value: (s: Slice) => number
  fmt: (n: number) => string
  total: number
  hovered: string | null
  onHover: (name: string | null) => void
  canDistributed: boolean
  measure: Measure
}) {
  const styles = useStyles()
  const navigate = useNavigate()
  const [ref, barWidth] = useElementWidth<HTMLDivElement>()
  const totalRevenue = slices.reduce((a, s) => a + s.revenue, 0)
  const groups = [
    { name: 'Open', hint: 'still being worked', items: slices.filter(s => s.open) },
    { name: 'Closed', hint: 'won, lost or canceled', items: slices.filter(s => !s.open) },
  ]
    .map(g => ({ ...g, sum: g.items.reduce((a, s) => a + value(s), 0) }))
    .filter(g => g.sum > 0)
  const summary = groups.map(g => `${g.name} ${fmt(g.sum)}: ${g.items.map(s => `${s.name} ${fmt(value(s))}`).join(', ')}`).join('. ')
  // Show an in-bar value only when it fits the measured segment; the legend always has every value.
  const usable = Math.max(0, barWidth - GROUP_GAP * (groups.length - 1))
  const fits = (n: number) => usable > 0 && (usable * n) / total >= fmt(n).length * 7 + 12

  return (
    <>
      <div ref={ref} role="img" aria-label={`Opportunities by ${measure === 'revenue' ? 'estimated revenue' : 'count'}. ${summary}.`} className={styles.groups}>
        {groups.map(g => (
            <div key={g.name} className={styles.group} style={{ flexGrow: g.sum }}>
              <div className={mergeClasses(styles.groupLabel, g.name === 'Closed' && styles.groupLabelClosed)}>
                <Body1Strong className={styles.nowrap}>
                  {g.name} {MIDDOT} {fmt(g.sum)}
                </Body1Strong>
                <Caption1 className={styles.groupHint}>
                  {pct(g.sum, total)}% {MIDDOT} {g.hint}
                </Caption1>
              </div>
              <div className={styles.stack}>
                {g.items.map(s => (
                  <Segment
                    key={s.name}
                    color={s.color}
                    hatched={s.hatched}
                    width={(value(s) / g.sum) * 100}
                    label={fits(value(s)) ? fmt(value(s)) : ''}
                    dim={!!hovered && hovered !== s.name}
                    onEnter={() => onHover(s.name)}
                    onLeave={() => onHover(null)}
                    onClick={() => navigate(statusHref(s.name, canDistributed))}
                    to={statusHref(s.name, canDistributed)}
                  />
                ))}
                {g.items.map(s => {
                  if (hovered !== s.name) return null
                  const before = g.items.slice(0, g.items.indexOf(s)).reduce((a, x) => a + value(x), 0)
                  const left = Math.min(85, Math.max(15, ((before + value(s) / 2) / g.sum) * 100))
                  return (
                    <span key="tip" className={styles.tip} style={{ left: `${left}%` }}>
                      <Caption1Strong>
                        <span className={styles.swatch} style={seriesFill(s.color, s.hatched)} />
                        {s.name}
                      </Caption1Strong>
                      <Body1Strong>{formatCurrency(s.revenue)}</Body1Strong>
                      <Caption1>
                        {plural(s.count, 'opportunity', 'opportunities')} {MIDDOT} {pct(s.revenue, totalRevenue)}% of revenue
                      </Caption1>
                    </span>
                  )
                })}
              </div>
            </div>
        ))}
      </div>
      <Caption1 as="p" className={styles.help}>
        Each block is one status; its width is that status&apos;s share. Select a status in the table to open its list.
      </Caption1>
    </>
  )
}

function Segment({
  color,
  hatched,
  width,
  label,
  dim,
  onEnter,
  onLeave,
  onClick,
  slim,
  to,
}: {
  color: string
  hatched?: boolean
  width: number
  label: ReactNode
  dim?: boolean
  onEnter?: () => void
  onLeave?: () => void
  onClick?: () => void
  slim?: boolean
  to?: string
}) {
  const styles = useStyles()
  const preload = useRoutePreload()
  return (
    <span
      {...(to ? preload(to) : {})}
      className={mergeClasses(styles.seg, onClick && styles.segLink, dim && styles.segDim, slim && styles.stackSlim)}
      style={{ width: `${width}%`, ...seriesFill(color, hatched), color: readableOn(color) }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {label && (
        <span className={mergeClasses(styles.segText, hatched && styles.segTextHatched)} style={hatched ? { backgroundColor: color } : undefined}>
          {label}
        </span>
      )}
    </span>
  )
}

function RegistrationBar({ regs }: { regs: DealRegistration[] }) {
  const styles = useStyles()
  const slices = registrationBreakdown(regs)
  const total = regs.length
  return (
    <div className={styles.regs}>
      <div className={styles.barHead}>
        <Body1Strong>Deal registrations</Body1Strong>
        <Body1Strong className={styles.nowrap}>{plural(total, 'registration', 'registrations')}</Body1Strong>
      </div>
      {total === 0 ? (
        <Body1 as="p" className={styles.empty}>
          No deal registrations for these opportunities.
        </Body1>
      ) : (
        <>
          <div role="img" aria-label={`Deal registrations by status: ${slices.map(s => `${s.name} ${s.count}`).join(', ')}`} className={mergeClasses(styles.stack, styles.stackSlim)}>
            {slices.map(s => (
              <Segment key={s.name} color={s.color} hatched={s.hatched} width={(s.count / total) * 100} label={s.count / total >= 0.08 ? s.count : ''} slim />
            ))}
          </div>
          <ul aria-label="Deal registration statuses" className={styles.regLegend}>
            {slices.map(s => (
              <li key={s.name}>
                <Caption1 className={s.name === 'Expiring' ? styles.regWarn : undefined}>
                  <span aria-hidden="true" className={styles.swatch} style={seriesFill(s.color, s.hatched)} />
                  {s.name} {s.count}
                </Caption1>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function StatusLegend({
  slices,
  measure,
  hovered,
  onHover,
  canDistributed,
}: {
  slices: StatusSlice[]
  measure: Measure
  hovered: string | null
  onHover: (name: string | null) => void
  canDistributed: boolean
}) {
  const styles = useStyles()
  const totalRevenue = slices.reduce((a, s) => a + s.revenue, 0)
  const totalCount = slices.reduce((a, s) => a + s.count, 0)
  const share = (s: Slice) => (measure === 'revenue' ? pct(s.revenue, totalRevenue) : pct(s.count, totalCount))
  const group = (open: boolean) => slices.filter(s => s.open === open)
  return (
    <Table size="small" className={styles.legend}>
      <caption className="sr-only">Opportunities by status</caption>
      <TableHeader>
        <TableRow>
          <TableHeaderCell scope="col" className={styles.legendCell}>
            Status
          </TableHeaderCell>
          <TableHeaderCell scope="col" className={styles.numHead}>
            Revenue
          </TableHeaderCell>
          <TableHeaderCell scope="col" className={styles.numHead}>
            Count
          </TableHeaderCell>
          <TableHeaderCell scope="col" className={styles.numHead}>
            Share
          </TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[true, false].map(open =>
          group(open).length === 0
            ? null
            : [
                <TableRow key={open ? 'open' : 'closed'} className={styles.groupRow}>
                  <TableCell colSpan={4} className={mergeClasses(styles.legendCell, styles.groupCell)}>
                    <Caption1Strong>{open ? 'Open' : 'Closed'}</Caption1Strong>
                  </TableCell>
                </TableRow>,
                ...group(open).map(s => (
                  <TableRow
                    key={s.name}
                    className={hovered === s.name ? styles.rowHl : undefined}
                    onMouseEnter={() => onHover(s.name)}
                    onMouseLeave={() => onHover(null)}
                    onFocus={() => onHover(s.name)}
                    onBlur={() => onHover(null)}
                  >
                    <TableCell className={styles.legendCell}>
                      <span aria-hidden="true" className={styles.swatch} style={seriesFill(s.color, s.hatched)} />
                      <AppLink to={statusHref(s.name, canDistributed)}>{s.name}</AppLink>
                    </TableCell>
                    <TableCell className={styles.num}>{formatCompactCurrency(s.revenue)}</TableCell>
                    <TableCell className={styles.num}>{s.count}</TableCell>
                    <TableCell className={styles.num}>{share(s)}%</TableCell>
                  </TableRow>
                )),
              ],
        )}
        <TableRow className={styles.totalRow}>
          <TableCell className={styles.legendCell}>Total</TableCell>
          <TableCell className={styles.num}>{formatCompactCurrency(totalRevenue)}</TableCell>
          <TableCell className={styles.num}>{totalCount}</TableCell>
          <TableCell className={styles.num}>100%</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}
