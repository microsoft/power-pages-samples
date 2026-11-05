import { useState } from 'react'
import {
  Body1,
  Body1Strong,
  Button,
  Caption1,
  Caption1Strong,
  Card,
  Subtitle2,
  Tab,
  TabList,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components'
import { ErrorCircle16Regular, Warning16Regular } from '@fluentui/react-icons'
import type { Opportunity } from '../../data/types'
import { useApp } from '../../store/AppStore'
import { formatCurrency, formatDate } from '../../lib/format'
import { AppLink, StatusBadge, useMediaQuery } from '../../components/ui'
import { BADGE_WARNING_FG } from '../../theme/fluentTheme'
import { daysUntil, relativeDay } from './pipeline'

const MIDDOT = '\u00B7'
const EM_DASH = '\u2014'

export interface AttentionItem {
  key: string
  type: string
  headline: string
  to: string
  action: string
  deadline: string
}

const useStyles = makeStyles({
  card: { ...shorthands.padding('0'), rowGap: '0', minWidth: 0 },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    margin: 0,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalXL),
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    color: tokens.colorNeutralForeground1,
    '@media (max-width: 639.98px)': { ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL) },
  },
  count: { color: tokens.colorNeutralForeground3, fontWeight: tokens.fontWeightRegular },
  item: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    columnGap: tokens.spacingHorizontalM,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalXL),
    ':not(:last-child)': { borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke3}` },
    '@media (max-width: 639.98px)': { ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL) },
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: tokens.borderRadiusCircular,
    color: BADGE_WARNING_FG,
    backgroundColor: tokens.colorPaletteDarkOrangeBackground1,
  },
  iconDanger: { color: tokens.colorPaletteRedForeground1, backgroundColor: tokens.colorPaletteRedBackground1 },
  when: { display: 'block', margin: 0, color: BADGE_WARNING_FG },
  whenDanger: { color: tokens.colorPaletteRedForeground1 },
  headline: { display: 'block', margin: 0, color: tokens.colorNeutralForeground1, overflowWrap: 'anywhere' },
  meta: { display: 'block', margin: 0, color: tokens.colorNeutralForeground2 },
  footer: {
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalXL),
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    '@media (max-width: 639.98px)': { ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalL) },
  },
  footerLink: { display: 'inline-flex', alignItems: 'center', minHeight: '32px' },
  empty: { display: 'block', margin: 0, ...shorthands.padding(tokens.spacingVerticalXL, tokens.spacingHorizontalXL), color: tokens.colorNeutralForeground2 },
  tabs: {
    ...shorthands.padding(0, tokens.spacingHorizontalS),
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    overflowX: 'auto',
  },
  tabCount: { marginInlineStart: tokens.spacingHorizontalXS, color: tokens.colorNeutralForeground3, fontWeight: tokens.fontWeightSemibold },
  panel: { flex: 1, minWidth: 0, overflowX: 'auto' },
  cell: {
    verticalAlign: 'top',
    ':first-child': { paddingInlineStart: tokens.spacingHorizontalXL },
    ':last-child': { paddingInlineEnd: tokens.spacingHorizontalXL },
    '& > a': { display: 'inline-block', minHeight: '24px' },
  },
  head: { whiteSpace: 'nowrap', ':first-child': { paddingInlineStart: tokens.spacingHorizontalXL }, ':last-child': { paddingInlineEnd: tokens.spacingHorizontalXL } },
  muted: { color: tokens.colorNeutralForeground2 },
  money: { textAlign: 'end', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  moneyHead: { textAlign: 'end', '& .fui-TableHeaderCell__button': { justifyContent: 'flex-end' } },
  date: { whiteSpace: 'nowrap', color: tokens.colorNeutralForeground2 },
  due: { color: BADGE_WARNING_FG, fontWeight: tokens.fontWeightSemibold },
  stackItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalXL),
    ':not(:last-child)': { borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke3}` },
    '@media (max-width: 639.98px)': { ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL) },
  },
  stackMeta: { display: 'block', margin: 0, color: tokens.colorNeutralForeground2, fontVariantNumeric: 'tabular-nums' },
})

const ATTENTION_LIMIT = 3

export function AttentionPanel({
  items,
  idPrefix = 'attention',
  empty = 'Nothing is due. Expiring distributed opportunities and deal registrations will show here.',
}: {
  items: AttentionItem[]
  /** Keeps heading/list ids unique when the panel appears on another page. */
  idPrefix?: string
  empty?: string
}) {
  const styles = useStyles()
  const [showAll, setShowAll] = useState(false)
  return (
    <section aria-labelledby={`${idPrefix}-heading`} className="min-w-0">
      <Card className={mergeClasses(styles.card, 'h-full')}>
        <Subtitle2 as="h2" id={`${idPrefix}-heading`} className={styles.header}>
          Needs your attention <span className={styles.count}>({items.length})</span>
        </Subtitle2>
        {items.length === 0 ? (
          <Body1 as="p" className={styles.empty}>
            {empty}
          </Body1>
        ) : (
          <ul id={`${idPrefix}-list`}>
            {(showAll ? items : items.slice(0, ATTENTION_LIMIT)).map(a => {
              const days = daysUntil(a.deadline)
              const urgent = days <= 1
              return (
                <li key={a.key} className={styles.item}>
                  <span aria-hidden="true" className={mergeClasses(styles.icon, urgent && styles.iconDanger)}>
                    {urgent ? <ErrorCircle16Regular /> : <Warning16Regular />}
                  </span>
                  <div className="min-w-0">
                    <Caption1Strong as="p" className={mergeClasses(styles.when, urgent && styles.whenDanger)}>
                      {relativeDay(days)} {MIDDOT} {formatDate(a.deadline)}
                    </Caption1Strong>
                    <Body1Strong as="p" className={styles.headline}>
                      {a.headline}
                    </Body1Strong>
                    <Caption1 as="p" className={styles.meta}>
                      {a.type} {MIDDOT} <AppLink to={a.to}>{a.action}</AppLink>
                    </Caption1>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {items.length > ATTENTION_LIMIT && (
          <div className={styles.footer}>
            <Button appearance="transparent" aria-controls={`${idPrefix}-list`} aria-expanded={showAll} onClick={() => setShowAll(v => !v)}>
              {showAll ? 'Show fewer' : `Show all ${items.length}`}
            </Button>
          </div>
        )}
      </Card>
    </section>
  )
}

export interface WorkTab {
  id: string
  label: string
  rows: Opportunity[]
  hrefFor: (o: Opportunity) => string
  /** Date column: distributed opportunities show their response deadline. */
  date: { header: string; value: (o: Opportunity) => string | undefined }
  empty: string
  viewAll: { to: string; label: string }
}

const ROW_LIMIT = 5

export function WorkTabs({ tabs, label = 'Opportunity work lists', idPrefix = 'work' }: { tabs: WorkTab[]; label?: string; idPrefix?: string }) {
  const styles = useStyles()
  const [selected, setSelected] = useState(() => (tabs.find(t => t.rows.length > 0) ?? tabs[0])?.id)
  const tab = tabs.find(t => t.id === selected) ?? tabs[0]
  return (
    <section aria-label={label} className="min-w-0">
      <Card className={mergeClasses(styles.card, 'h-full')}>
        <TabList className={styles.tabs} selectedValue={tab.id} onTabSelect={(_, d) => setSelected(String(d.value))}>
          {tabs.map(t => (
            <Tab key={t.id} id={`${idPrefix}-tab-${t.id}`} value={t.id}>
              {t.label}
              <span className={styles.tabCount}>({t.rows.length})</span>
            </Tab>
          ))}
        </TabList>
        <div role="tabpanel" aria-labelledby={`${idPrefix}-tab-${tab.id}`} className={styles.panel}>
          <OppList tab={tab} />
        </div>
        <div className={styles.footer}>
          <AppLink to={tab.viewAll.to} className={styles.footerLink}>
            {tab.viewAll.label}
          </AppLink>
        </div>
      </Card>
    </section>
  )
}

function OppList({ tab }: { tab: WorkTab }) {
  const { db } = useApp()
  const styles = useStyles()
  const stacked = useMediaQuery('(max-width: 1279.98px)')
  const customerName = (o: Opportunity) => db.accounts.find(a => a.id === o.customerId)?.name ?? EM_DASH
  const rows = tab.rows.slice(0, ROW_LIMIT)
  const dateText = (o: Opportunity) => {
    const d = tab.date.value(o)
    return { text: formatDate(d), due: !!d && daysUntil(d) <= 7 }
  }
  if (rows.length === 0)
    return (
      <Body1 as="p" className={styles.empty}>
        {tab.empty}
      </Body1>
    )
  if (stacked)
    return (
      <ul aria-label={tab.label}>
        {rows.map(o => {
          const d = dateText(o)
          return (
            <li key={o.id} className={styles.stackItem}>
              <div className="flex items-start justify-between gap-3">
                <AppLink to={tab.hrefFor(o)}>{o.topic}</AppLink>
                <StatusBadge status={o.status} />
              </div>
              <Body1 as="p" className={styles.stackMeta}>
                {customerName(o)} {MIDDOT} {formatCurrency(o.estRevenue)} {MIDDOT}{' '}
                <span className={d.due ? styles.due : undefined}>
                  {tab.date.header.toLowerCase()} {d.text}
                </span>
              </Body1>
            </li>
          )
        })}
      </ul>
    )
  return (
    <Table size="small">
      <caption className="sr-only">{tab.label}</caption>
      <TableHeader>
        <TableRow>
          <TableHeaderCell scope="col" className={styles.head}>
            Topic
          </TableHeaderCell>
          <TableHeaderCell scope="col" className={styles.head}>
            Customer
          </TableHeaderCell>
          <TableHeaderCell scope="col" className={mergeClasses(styles.head, styles.moneyHead)}>
            Estimated revenue
          </TableHeaderCell>
          <TableHeaderCell scope="col" className={styles.head}>
            {tab.date.header}
          </TableHeaderCell>
          <TableHeaderCell scope="col" className={styles.head}>
            Status
          </TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(o => {
          const d = dateText(o)
          return (
            <TableRow key={o.id}>
              <TableCell className={styles.cell}>
                <AppLink to={tab.hrefFor(o)}>{o.topic}</AppLink>
              </TableCell>
              <TableCell className={mergeClasses(styles.cell, styles.muted)}>{customerName(o)}</TableCell>
              <TableCell className={mergeClasses(styles.cell, styles.money)}>{formatCurrency(o.estRevenue)}</TableCell>
              <TableCell className={mergeClasses(styles.cell, styles.date, d.due && styles.due)}>{d.text}</TableCell>
              <TableCell className={styles.cell}>
                <StatusBadge status={o.status} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
