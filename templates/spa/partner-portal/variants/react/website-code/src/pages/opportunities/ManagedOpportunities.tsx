import { useDeferredValue } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Field, SearchBox, Text, ToggleButton, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components'
import { Add20Regular, ArrowDownload20Regular } from '@fluentui/react-icons'
import { Container } from '../../components/Layout'
import { DataTable, type Column } from '../../components/DataTable'
import { createdOnColumn } from '../../components/createdOnColumn'
import { AppLink, Button, ButtonLink, PageHeader, StatusBadge, Tabs } from '../../components/ui'
import type { Opportunity } from '../../data/types'
import { managedOpportunities } from '../../lib/access'
import { CURRENCY, formatCurrency, formatDate, formatDateNumeric } from '../../lib/format'
import { useApp } from '../../store/AppStore'
import { InlineFeedback } from '../../components/InlineFeedback'
import { useInlineFeedback } from '../../hooks/useInlineFeedback'
import { PageSkeleton } from '../../components/skeletons'
import { loadOpportunityListFresh } from '../../services/opportunities'
import { asLoad, useLiveLoad } from '../../services/useLiveLoad'
import { OpportunityLoadError } from '../../services/opportunitiesView'
import { Numeric } from './OppParts'
import {
  OPP_ROUTES,
  OPP_STATUS_FILTERS,
  accountName,
  contactName,
  detailsRoute,
  downloadCsv,
  isStatusFilter,
  latestOpenRegistrationStatus,
  matchesStatusFilter,
  wildcardMatch,
  type OppStatusFilter,
} from './oppUtils'

type View = 'managed' | 'collaborative'

const useStyles = makeStyles({
  toolbar: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    alignItems: 'start',
    gap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalM,
    '@media (min-width: 1024px)': {
      gridTemplateColumns: 'minmax(0, 24rem) minmax(0, 1fr) auto',
      columnGap: tokens.spacingHorizontalXL,
    },
  },
  searchField: { width: '100%', maxWidth: '24rem', minWidth: 0 },
  searchLabel: { fontWeight: tokens.fontWeightSemibold },
  search: { width: '100%', maxWidth: '100%' },
  filters: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalS },
  filter: { minWidth: 'auto' },
  filterOn: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    ...shorthands.borderColor(tokens.colorBrandStroke1),
    ':hover': { backgroundColor: tokens.colorBrandBackground2Hover, color: tokens.colorBrandForeground2Hover },
  },
  filterLabel: {
    display: 'block',
    paddingTop: tokens.spacingVerticalXXS,
    paddingBottom: tokens.spacingVerticalXXS,
    marginBottom: tokens.spacingVerticalXXS,
    fontWeight: tokens.fontWeightSemibold,
  },
  export: {
    justifySelf: 'start',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: tokens.spacingVerticalXS,
    '@media (min-width: 1024px)': {
      justifySelf: 'end',
      alignItems: 'flex-end',
      maxWidth: '20rem',
      marginTop: `calc(${tokens.lineHeightBase300} + 3 * ${tokens.spacingVerticalXXS})`,
    },
  },
  muted: { color: tokens.colorNeutralForeground2 },
})

export default function ManagedOpportunities() {
  const styles = useStyles()
  const { db, session, mode } = useApp()
  const sellerId = session.role === 'partner-seller' ? session.contact?.id : undefined
  const load = useLiveLoad('opps:managed', asLoad(signal => loadOpportunityListFresh('managed', sellerId, signal)))
  const [params, setParams] = useSearchParams()
  const view: View = params.get('view') === 'collaborative' ? 'collaborative' : 'managed'
  const statusParam = params.get('status')
  const status: OppStatusFilter = isStatusFilter(statusParam) ? statusParam : 'open'
  const query = params.get('q') ?? ''
  const applied = useDeferredValue(query)
  const setQuery = (q: string) => {
    const next = new URLSearchParams(params)
    if (q) next.set('q', q)
    else next.delete('q')
    setParams(next, { replace: true, flushSync: true })
  }

  const updateParams = (next: { view?: View; status?: OppStatusFilter }) => {
    const v = next.view ?? view
    const s = next.status ?? status
    const p = new URLSearchParams(params)
    if (v !== 'managed') p.set('view', v)
    else p.delete('view')
    if (s !== 'open') p.set('status', s)
    else p.delete('status')
    setParams(p, { replace: true, flushSync: true })
  }

  const clearSearch = () => {
    setQuery('')
  }

  const all = managedOpportunities(db, session).filter(o => wildcardMatch(o.topic, applied))
  const inView = (v: View) => all.filter(o => (v === 'collaborative' ? o.collaboration : !o.collaboration))
  const managed = inView('managed').filter(o => matchesStatusFilter(o, status))
  const collaborative = inView('collaborative').filter(o => matchesStatusFilter(o, status))
  const rows = view === 'managed' ? managed : collaborative
  const statusCount = (f: OppStatusFilter) => inView(view).filter(o => matchesStatusFilter(o, f)).length
  const statusLabel = OPP_STATUS_FILTERS.find(f => f.id === status)?.label ?? 'All'
  // An export result describes the current view and filters; it clears when they change.
  const exported = useInlineFeedback({ view, status, applied })

  const topic: Column<Opportunity> = {
    key: 'topic',
    header: 'Topic',
    sortValue: o => o.topic,
    render: o => (
      <AppLink to={detailsRoute(o)} inline>
        {o.topic}
      </AppLink>
    ),
  }
  const statusColumn: Column<Opportunity> = { key: 'status', header: 'Status', sortValue: o => o.status, render: o => <StatusBadge status={o.status} /> }
  const base: Column<Opportunity>[] = [
    topic,
    { key: 'customer', header: 'Potential customer', sortValue: o => accountName(db, o.customerId), render: o => accountName(db, o.customerId) },
    { key: 'revenue', header: 'Estimated revenue', sortValue: o => o.estRevenue, render: o => <Numeric>{formatCurrency(o.estRevenue)}</Numeric>, className: 'text-right' },
    { key: 'close', header: 'Estimated close date', sortValue: o => o.estCloseDate, render: o => formatDate(o.estCloseDate) },
    statusColumn,
  ]
  const managedColumns: Column<Opportunity>[] = [
    ...base,
    {
      key: 'registration',
      header: 'Registration status',
      sortValue: o => latestOpenRegistrationStatus(db, o.id),
      render: o => {
        const s = latestOpenRegistrationStatus(db, o.id)
        return s === '—' ? <Text className={styles.muted}>—</Text> : <StatusBadge status={s} />
      },
    },
    { key: 'contact', header: 'Partner contact', sortValue: o => contactName(db, o.partnerContactId), render: o => contactName(db, o.partnerContactId) },
    createdOnColumn<Opportunity>(),
  ]
  const columns = view === 'managed' ? managedColumns : [...base, createdOnColumn<Opportunity>()]
  const viewName = view === 'managed' ? 'managed' : 'collaborative'

  const exportCsv = () => {
    if (rows.length === 0) {
      exported.show('Nothing to export. Clear your search or choose another status filter.', 'info')
      return
    }
    const header = ['Topic', 'Potential customer', `Estimated revenue (${CURRENCY.code})`, 'Estimated close date', 'Status']
    if (view === 'managed') header.push('Registration status', 'Partner contact')
    header.push('Created on')
    const blank = (v: string) => (v === '—' ? '' : v)
    const data = rows.map(o => {
      const r = [o.topic, blank(accountName(db, o.customerId)), String(o.estRevenue ?? ''), formatDateNumeric(o.estCloseDate), o.status]
      if (view === 'managed') r.push(blank(latestOpenRegistrationStatus(db, o.id)), blank(contactName(db, o.partnerContactId)))
      r.push(formatDateNumeric(o.createdOn))
      return r
    })
    downloadCsv(view === 'managed' ? 'Managed opportunities.csv' : 'Collaborative opportunities.csv', header, data)
    exported.show(`Exported ${rows.length} ${statusLabel === 'All' ? '' : `${statusLabel.toLowerCase()} `}${viewName} ${rows.length === 1 ? 'opportunity' : 'opportunities'} to CSV.`)
  }

  const empty = applied.trim()
    ? {
        title: `No opportunities match "${applied.trim()}"`,
        body: 'Check the spelling, or use * as a wildcard at the end of a word, for example Cloud*.',
        action: <Button onClick={clearSearch}>Clear search</Button>,
      }
    : status !== 'all'
      ? {
          title: `No ${statusLabel.toLowerCase()} ${viewName} opportunities`,
          body:
            view === 'collaborative'
              ? 'Opportunities another partner shares with you appear on this tab.'
              : 'Try another status, or create an opportunity for a deal your team found.',
          action: <Button onClick={() => updateParams({ status: 'all' })}>Show all statuses</Button>,
        }
      : view === 'collaborative'
        ? { title: 'No collaborative opportunities', body: 'Opportunities another partner shares with you appear here.' }
        : {
            title: 'No managed opportunities yet',
            body: 'Accept a distributed opportunity or create one for a deal your team found.',
            action: (
              <ButtonLink to={OPP_ROUTES.create} icon={<Add20Regular />}>
                Create opportunity
              </ButtonLink>
            ),
          }

  if (mode === 'live' && load.status === 'error') return <OpportunityLoadError load={load} />
  if (mode === 'live' && load.status === 'loading') return <PageSkeleton variant="list" />

  return (
    <Container>
      <PageHeader
        title="Managed opportunities"
        eyebrow="Opportunities"
        breadcrumbs={[{ label: 'Opportunities', to: OPP_ROUTES.home }, { label: 'Managed opportunities' }]}
        description="Opportunities your organization has accepted or created, plus collaborative opportunities shared with you by another partner."
        actions={
          <ButtonLink to={OPP_ROUTES.create} variant="primary" icon={<Add20Regular />}>
            Create opportunity
          </ButtonLink>
        }
      />
      <Tabs<View>
        label="Opportunity views"
        value={view}
        onChange={v => updateParams({ view: v })}
        tabs={[
          { id: 'managed', label: 'Managed', count: managed.length },
          { id: 'collaborative', label: 'Collaborative', count: collaborative.length },
        ]}
      />
      <div className={styles.toolbar}>
        <div role="search" className={styles.searchField}>
          <Field label={{ children: 'Search by topic', htmlFor: 'opp-search', className: styles.searchLabel }} hint="Use * as a wildcard, for example Cloud*">
            <SearchBox id="opp-search" value={query} onChange={(_, data) => setQuery(data.value)} className={styles.search} />
          </Field>
        </div>
        <div role="group" aria-labelledby="opp-status-label">
          <Text id="opp-status-label" className={styles.filterLabel}>
            Status
          </Text>
          <div className={styles.filters}>
            {OPP_STATUS_FILTERS.map(f => (
              <ToggleButton key={f.id} checked={status === f.id} className={mergeClasses(styles.filter, status === f.id && styles.filterOn)} onClick={() => updateParams({ status: f.id })}>
                {f.label} ({statusCount(f.id)})
              </ToggleButton>
            ))}
          </div>
        </div>
        <div className={styles.export}>
          <Button onClick={exportCsv} icon={<ArrowDownload20Regular />}>
            Export to CSV
          </Button>
          <InlineFeedback feedback={exported.feedback} />
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        {rows.length} {rows.length === 1 ? 'opportunity' : 'opportunities'} shown
      </span>
      <DataTable
        key={view}
        caption={`${view === 'managed' ? 'Managed' : 'Collaborative'} opportunities, ${statusLabel.toLowerCase()}`}
        columns={columns}
        rows={rows}
        rowKey={o => o.id}
        initialSort={{ key: 'close', dir: 'asc' }}
        empty={empty}
      />
    </Container>
  )
}
