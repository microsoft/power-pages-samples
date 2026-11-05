import { useState, type ReactElement, type ReactNode } from 'react'
import {
  Body1,
  Body1Strong,
  Button,
  Caption1,
  Caption1Strong,
  Card,
  CardFooter,
  Subtitle1,
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
import { Add20Regular, Building20Regular, ChevronRight20Regular, People20Regular, PersonAdd20Regular, Warning16Regular } from '@fluentui/react-icons'
import type { Account, Contact, Opportunity } from '../../data/types'
import { Container } from '../../components/Layout'
import { AppLink, ButtonLink, PageHeader, StatusBadge, useMediaQuery } from '../../components/ui'
import { useApp } from '../../store/AppStore'
import { can, customerAccounts, customerContacts, distributedOpportunities, managedOpportunities } from '../../lib/access'
import { formatCompactCurrency, formatCurrency, formatDate, fullName } from '../../lib/format'
import { PageSkeleton } from '../../components/skeletons'
import { useLiveLoad } from '../../services/useLiveLoad'
import { loadCustomerLists } from '../../services/customers'
import { loadOpportunityRows } from '../../services/opportunities'
import type { CachePatch } from '../../services/loaders'
import { BADGE_WARNING_FG } from '../../theme/fluentTheme'
import { FigureStrip, type GlanceFigure } from '../home/PipelineGlance'
import { daysUntil, isClosed, sumRevenue } from '../home/pipeline'
import { ACCOUNTS_URL, CONTACTS_URL, CREATE_ACCOUNT_URL, createContactUrl, editAccountUrl, editContactUrl } from './shared'
import { LoadError } from './LoadError'

const MIDDOT = '\u00B7'
const EM_DASH = '\u2014'
const ATTENTION_LIMIT = 4
const ROW_LIMIT = 5
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const useStyles = makeStyles({
  leadStrong: { color: tokens.colorNeutralForeground1, fontWeight: tokens.fontWeightSemibold },
  work: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    alignItems: 'stretch',
    gap: tokens.spacingHorizontalXXL,
    marginBottom: tokens.spacingVerticalXXXL,
    '@media (min-width: 1024px)': { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)' },
  },
  panel: { ...shorthands.padding('0'), rowGap: '0', minWidth: 0, height: '100%' },
  panelHeader: {
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
  itemIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: tokens.borderRadiusCircular,
    color: BADGE_WARNING_FG,
    backgroundColor: tokens.colorPaletteDarkOrangeBackground1,
  },
  issue: { display: 'block', margin: 0, color: BADGE_WARNING_FG },
  headline: { display: 'block', margin: 0, color: tokens.colorNeutralForeground1, overflowWrap: 'anywhere' },
  meta: { display: 'block', margin: 0, color: tokens.colorNeutralForeground2 },
  footer: {
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalXL),
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    '@media (max-width: 639.98px)': { ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalL) },
  },
  footerLink: { display: 'inline-flex', alignItems: 'center', minHeight: '32px' },
  empty: { display: 'block', margin: 0, ...shorthands.padding(tokens.spacingVerticalXL, tokens.spacingHorizontalXL), color: tokens.colorNeutralForeground2 },
  tabs: { ...shorthands.padding(0, tokens.spacingHorizontalS), borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`, overflowX: 'auto' },
  tabCount: { marginInlineStart: tokens.spacingHorizontalXS, color: tokens.colorNeutralForeground3, fontWeight: tokens.fontWeightSemibold },
  tabPanel: { flex: 1, minWidth: 0 },
  cell: {
    verticalAlign: 'top',
    ':first-child': { paddingInlineStart: tokens.spacingHorizontalXL },
    ':last-child': { paddingInlineEnd: tokens.spacingHorizontalXL },
  },
  head: { whiteSpace: 'nowrap', ':first-child': { paddingInlineStart: tokens.spacingHorizontalXL }, ':last-child': { paddingInlineEnd: tokens.spacingHorizontalXL } },
  muted: { color: tokens.colorNeutralForeground2 },
  numeric: { textAlign: 'end', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  numericHead: { textAlign: 'end', '& .fui-TableHeaderCell__button': { justifyContent: 'flex-end' } },
  stackItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalXL),
    ':not(:last-child)': { borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke3}` },
    '@media (max-width: 639.98px)': { ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalL) },
  },
  stackMeta: { display: 'block', margin: 0, color: tokens.colorNeutralForeground2, fontVariantNumeric: 'tabular-nums' },
  sectionTitle: { display: 'block', margin: 0, marginBottom: tokens.spacingVerticalM, color: tokens.colorNeutralForeground1 },
  areaCard: {
    ...shorthands.padding('0'),
    rowGap: '0',
    width: '100%',
    position: 'relative',
    ':hover': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
  areaBody: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalL,
    ...shorthands.padding(tokens.spacingVerticalXL, tokens.spacingHorizontalXL),
    flexGrow: 1,
  },
  areaIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '40px',
    height: '40px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
  },
  areaTitle: { margin: 0 },
  /* The title link covers the whole card so the card is one target. */
  stretched: {
    textDecorationLine: 'none',
    '::after': { content: '""', position: 'absolute', inset: 0, borderRadius: tokens.borderRadiusMedium },
    ':focus-visible': { outlineStyle: 'none' },
    ':focus-visible::after': { outline: `${tokens.strokeWidthThick} solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
  },
  chevron: { flexShrink: 0, alignSelf: 'center', color: tokens.colorNeutralForeground2 },
  areaDescription: { display: 'block', marginTop: tokens.spacingVerticalS, marginBottom: 0, color: tokens.colorNeutralForeground2 },
  areaCount: { display: 'block', marginTop: tokens.spacingVerticalM, marginBottom: 0, color: tokens.colorNeutralForeground1 },
  areaFooter: {
    position: 'relative',
    zIndex: 1,
    ...shorthands.padding(tokens.spacingVerticalM, tokens.spacingHorizontalXL),
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
})

/** Customer lists plus the partner's opportunity rows (pipeline per account); pipeline is optional. */
async function loadCustomersOverview(partnerId: string | undefined, sellerId: string | undefined, signal?: AbortSignal): Promise<{ patch: CachePatch }> {
  const [lists, rows] = await Promise.all([loadCustomerLists(partnerId, signal), loadOpportunityRows(sellerId, signal).catch(() => ({ patch: {} as CachePatch }))])
  const opps = rows.patch
  return {
    patch: {
      ...opps,
      ...lists,
      accountRefs: [...(lists.accountRefs ?? []), ...(opps.accountRefs ?? [])],
      contactRefs: [...(lists.contactRefs ?? []), ...(opps.contactRefs ?? [])],
      replace: { ...opps.replace, ...lists.replace },
    },
  }
}

interface Issue {
  key: string
  issue: string
  headline: string
  detail: string
  to: string
  action: string
}

interface ListColumn {
  header: string
  numeric?: boolean
}

interface ListTab {
  id: string
  label: string
  columns: ListColumn[]
  rows: { key: string; cells: ReactNode[] }[]
  empty: string
  viewAll: { to: string; label: string }
}

export default function CustomersHome() {
  const { db, session, sessionReady } = useApp()
  const styles = useStyles()
  const sellerId = session.role === 'partner-seller' ? session.contact?.id : undefined
  const load = useLiveLoad(sessionReady ? `customers:overview:${session.partnerId ?? ''}` : null, signal => loadCustomersOverview(session.partnerId, sellerId, signal))
  const accounts = customerAccounts(db, session)
  const contacts = customerContacts(db, session)
  const canEditAccount = can(session.role, 'customer-account:edit')
  const activeAccounts = accounts.filter(a => a.active)
  const contactAccounts = new Set(contacts.map(c => c.parentAccountId)).size
  const accountName = (id?: string) => accounts.find(a => a.id === id)?.name ?? EM_DASH
  const contactById = (id?: string) => (id ? db.contacts.find(c => c.id === id) : undefined)

  const openOpps = [...distributedOpportunities(db, session), ...managedOpportunities(db, session)].filter(o => !isClosed(o))
  const openByAccount = new Map<string, Opportunity[]>()
  for (const o of openOpps) if (o.customerId) openByAccount.set(o.customerId, [...(openByAccount.get(o.customerId) ?? []), o])
  const pipelineAccounts = accounts.filter(a => openByAccount.has(a.id))
  const pipelineOf = (a: Account) => sumRevenue(openByAccount.get(a.id) ?? [])
  const recent = (iso: string) => daysUntil(iso) >= -30
  const newRecords = accounts.filter(a => recent(a.createdOn)).length + contacts.filter(c => recent(c.createdOn)).length

  const issues: Issue[] = [
    ...activeAccounts
      .filter(a => !a.primaryContactId)
      .map(a => ({
        key: `primary-${a.id}`,
        issue: 'No primary contact',
        headline: a.name,
        detail: 'Customer account',
        to: editAccountUrl(a.id),
        action: canEditAccount ? 'Set primary contact' : 'View account',
      })),
    ...accounts
      .filter(a => !a.active && openByAccount.has(a.id))
      .map(a => ({
        key: `inactive-${a.id}`,
        issue: 'Inactive with open opportunities',
        headline: a.name,
        detail: `${plural(openByAccount.get(a.id)!.length, 'open opportunity', 'open opportunities')}`,
        to: editAccountUrl(a.id),
        action: 'Review account',
      })),
    ...contacts
      .filter(c => c.active && !c.email && !c.phone && !c.mobile)
      .map(c => ({
        key: `reach-${c.id}`,
        issue: 'No email or phone',
        headline: fullName(c),
        detail: accountName(c.parentAccountId),
        to: editContactUrl(c.id),
        action: 'Add contact details',
      })),
  ]

  const figures: GlanceFigure[] = [
    { label: 'Customer accounts', value: String(accounts.length), hint: `${activeAccounts.length} active ${MIDDOT} ${accounts.length - activeAccounts.length} inactive`, to: ACCOUNTS_URL },
    { label: 'Customer contacts', value: String(contacts.length), hint: `Across ${plural(contactAccounts, 'account', 'accounts')}`, to: CONTACTS_URL },
    {
      label: 'Accounts with open pipeline',
      value: String(pipelineAccounts.length),
      hint: `${formatCompactCurrency(sumRevenue(openOpps.filter(o => accounts.some(a => a.id === o.customerId))))} in open opportunities`,
      to: ACCOUNTS_URL,
    },
    { label: 'Added in the last 30 days', value: String(newRecords), hint: 'New accounts and contacts', to: ACCOUNTS_URL },
  ]

  const byNewest = <T extends { createdOn: string }>(xs: T[]) => [...xs].sort((a, b) => b.createdOn.localeCompare(a.createdOn))
  const tabs: ListTab[] = [
    {
      id: 'pipeline',
      label: 'Top accounts by pipeline',
      columns: [{ header: 'Account' }, { header: 'Primary contact' }, { header: 'Open opportunities', numeric: true }, { header: 'Open pipeline', numeric: true }],
      rows: [...pipelineAccounts]
        .sort((a, b) => pipelineOf(b) - pipelineOf(a) || a.name.localeCompare(b.name))
        .map(a => ({
          key: a.id,
          cells: [
            <AppLink to={editAccountUrl(a.id)}>{a.name}</AppLink>,
            contactById(a.primaryContactId) ? fullName(contactById(a.primaryContactId)) : EM_DASH,
            String(openByAccount.get(a.id)!.length),
            formatCurrency(pipelineOf(a)),
          ],
        })),
      empty: 'None of your customer accounts has an open opportunity.',
      viewAll: { to: ACCOUNTS_URL, label: 'View all customer accounts' },
    },
    {
      id: 'accounts',
      label: 'New accounts',
      columns: [{ header: 'Account' }, { header: 'City' }, { header: 'Status' }, { header: 'Added' }],
      rows: byNewest(accounts).map(a => ({
        key: a.id,
        cells: [
          <AppLink to={editAccountUrl(a.id)}>{a.name}</AppLink>,
          [a.address.city, a.address.country].filter(Boolean).join(', ') || EM_DASH,
          <StatusBadge status={a.active ? 'Active' : 'Inactive'} />,
          formatDate(a.createdOn),
        ],
      })),
      empty: 'Your organization has no customer accounts yet.',
      viewAll: { to: ACCOUNTS_URL, label: 'View all customer accounts' },
    },
    {
      id: 'contacts',
      label: 'New contacts',
      columns: [{ header: 'Name' }, { header: 'Account' }, { header: 'Job title' }, { header: 'Added' }],
      rows: byNewest(contacts).map((c: Contact) => ({
        key: c.id,
        cells: [<AppLink to={editContactUrl(c.id)}>{fullName(c)}</AppLink>, accountName(c.parentAccountId), c.jobTitle || EM_DASH, formatDate(c.createdOn)],
      })),
      empty: 'Your customer accounts have no contacts yet.',
      viewAll: { to: CONTACTS_URL, label: 'View all customer contacts' },
    },
  ]

  const areas: { key: string; title: string; icon: ReactElement; description: string; count: string; to: string; create: { to: string; label: string } | null }[] = [
    {
      key: 'accounts',
      title: 'Customer accounts',
      icon: <Building20Regular />,
      description: 'Organizations your partner company manages, with primary contact, address and related contacts.',
      count: `${plural(accounts.length, 'account', 'accounts')} ${MIDDOT} ${activeAccounts.length} active`,
      to: ACCOUNTS_URL,
      create: can(session.role, 'customer-account:create') ? { to: CREATE_ACCOUNT_URL, label: 'Create account' } : null,
    },
    {
      key: 'contacts',
      title: 'Customer contacts',
      icon: <People20Regular />,
      description: 'People at your customer accounts — decision makers, technical leads and procurement contacts.',
      count: `${plural(contacts.length, 'contact', 'contacts')} ${MIDDOT} across ${plural(contactAccounts, 'account', 'accounts')}`,
      to: CONTACTS_URL,
      create: can(session.role, 'customer-contact:create') ? { to: createContactUrl(), label: 'Create contact' } : null,
    },
  ]

  if (load.status === 'loading') return <PageSkeleton variant="hub" />
  if (load.status === 'error') return <LoadError title="Customers" breadcrumbs={[{ label: 'Customers' }]} error={load.error} onRetry={load.reload} />

  const partnerName = db.accounts.find(a => a.id === session.partnerId)?.name
  return (
    <Container>
      <PageHeader
        title="Customers"
        breadcrumbs={[{ label: 'Customers' }]}
        description={
          <>
            {partnerName ?? 'Your organization'} manages <span className={styles.leadStrong}>{plural(accounts.length, 'customer account', 'customer accounts')}</span> (
            {activeAccounts.length} active) and <span className={styles.leadStrong}>{plural(contacts.length, 'contact', 'contacts')}</span>
            {pipelineAccounts.length > 0 && (
              <>
                , with open pipeline at <span className={styles.leadStrong}>{plural(pipelineAccounts.length, 'account', 'accounts')}</span>
              </>
            )}
            .
          </>
        }
        actions={
          (areas[0].create || areas[1].create) && (
            <>
              {areas[0].create && (
                <ButtonLink to={areas[0].create.to} variant="primary" icon={<Add20Regular />}>
                  {areas[0].create.label}
                </ButtonLink>
              )}
              {areas[1].create && (
                <ButtonLink to={areas[1].create.to} icon={<PersonAdd20Regular />}>
                  {areas[1].create.label}
                </ButtonLink>
              )}
            </>
          )
        }
      />

      <FigureStrip figures={figures} label="Customer summary" standalone />

      <div className={styles.work}>
        <IssuePanel issues={issues} />
        <ListTabs tabs={tabs} />
      </div>

      <section aria-labelledby="customer-areas">
        <Subtitle1 as="h2" id="customer-areas" className={styles.sectionTitle}>
          Customer areas
        </Subtitle1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {areas.map(c => (
            <div key={c.key} className="flex">
              <Card className={styles.areaCard}>
                <div className={styles.areaBody}>
                  <span className={styles.areaIcon} aria-hidden="true">
                    {c.icon}
                  </span>
                  <div className="min-w-0 grow">
                    <Subtitle2 as="h3" className={styles.areaTitle}>
                      <AppLink to={c.to} className={styles.stretched}>
                        {c.title}
                      </AppLink>
                    </Subtitle2>
                    <Body1 as="p" className={styles.areaDescription}>
                      {c.description}
                    </Body1>
                    <Body1Strong as="p" className={styles.areaCount}>
                      {c.count}
                    </Body1Strong>
                  </div>
                  <ChevronRight20Regular className={styles.chevron} aria-hidden="true" />
                </div>
                {c.create && (
                  <CardFooter className={styles.areaFooter}>
                    <ButtonLink to={c.create.to} size="sm" icon={<Add20Regular />}>
                      {c.create.label}
                    </ButtonLink>
                  </CardFooter>
                )}
              </Card>
            </div>
          ))}
        </div>
      </section>
    </Container>
  )
}

/** Data-quality follow-ups: records missing the details partners need to work them. */
function IssuePanel({ issues }: { issues: Issue[] }) {
  const styles = useStyles()
  const [showAll, setShowAll] = useState(false)
  return (
    <section aria-labelledby="customer-attention-heading" className="min-w-0">
      <Card className={styles.panel}>
        <Subtitle2 as="h2" id="customer-attention-heading" className={styles.panelHeader}>
          Needs your attention <span className={styles.count}>({issues.length})</span>
        </Subtitle2>
        {issues.length === 0 ? (
          <Body1 as="p" className={styles.empty}>
            Your customer records are complete. Accounts without a primary contact and contacts you can’t reach will show here.
          </Body1>
        ) : (
          <ul id="customer-attention-list">
            {(showAll ? issues : issues.slice(0, ATTENTION_LIMIT)).map(i => (
              <li key={i.key} className={styles.item}>
                <span aria-hidden="true" className={styles.itemIcon}>
                  <Warning16Regular />
                </span>
                <div className="min-w-0">
                  <Caption1Strong as="p" className={styles.issue}>
                    {i.issue}
                  </Caption1Strong>
                  <Body1Strong as="p" className={styles.headline}>
                    {i.headline}
                  </Body1Strong>
                  <Caption1 as="p" className={styles.meta}>
                    {i.detail} {MIDDOT} <AppLink to={i.to}>{i.action}</AppLink>
                  </Caption1>
                </div>
              </li>
            ))}
          </ul>
        )}
        {issues.length > ATTENTION_LIMIT && (
          <div className={styles.footer}>
            <Button appearance="transparent" aria-controls="customer-attention-list" aria-expanded={showAll} onClick={() => setShowAll(v => !v)}>
              {showAll ? 'Show fewer' : `Show all ${issues.length}`}
            </Button>
          </div>
        )}
      </Card>
    </section>
  )
}

function ListTabs({ tabs }: { tabs: ListTab[] }) {
  const styles = useStyles()
  const stacked = useMediaQuery('(max-width: 1279.98px)')
  const [selected, setSelected] = useState(() => (tabs.find(t => t.rows.length > 0) ?? tabs[0]).id)
  const tab = tabs.find(t => t.id === selected) ?? tabs[0]
  const rows = tab.rows.slice(0, ROW_LIMIT)
  return (
    <section aria-label="Customer lists" className="min-w-0">
      <Card className={mergeClasses(styles.panel, 'flex flex-col')}>
        <TabList className={styles.tabs} selectedValue={tab.id} onTabSelect={(_, d) => setSelected(String(d.value))}>
          {tabs.map(t => (
            <Tab key={t.id} id={`customer-tab-${t.id}`} value={t.id}>
              {t.label}
              <span className={styles.tabCount}>({t.rows.length})</span>
            </Tab>
          ))}
        </TabList>
        <div role="tabpanel" aria-labelledby={`customer-tab-${tab.id}`} className={styles.tabPanel}>
          {rows.length === 0 ? (
            <Body1 as="p" className={styles.empty}>
              {tab.empty}
            </Body1>
          ) : stacked ? (
            <ul aria-label={tab.label}>
              {rows.map(r => (
                <li key={r.key} className={styles.stackItem}>
                  <div>{r.cells[0]}</div>
                  <Body1 as="p" className={styles.stackMeta}>
                    {r.cells.slice(1).map((cell, i) => (
                      <span key={i}>
                        {i > 0 && ` ${MIDDOT} `}
                        {tab.columns[i + 1].numeric ? `${tab.columns[i + 1].header}: ` : null}
                        {cell}
                      </span>
                    ))}
                  </Body1>
                </li>
              ))}
            </ul>
          ) : (
            <Table size="small">
              <caption className="sr-only">{tab.label}</caption>
              <TableHeader>
                <TableRow>
                  {tab.columns.map(c => (
                    <TableHeaderCell key={c.header} scope="col" className={mergeClasses(styles.head, c.numeric && styles.numericHead)}>
                      {c.header}
                    </TableHeaderCell>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.key}>
                    {r.cells.map((cell, i) => (
                      <TableCell key={i} className={mergeClasses(styles.cell, i > 0 && !tab.columns[i].numeric && styles.muted, tab.columns[i].numeric && styles.numeric)}>
                        {cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
