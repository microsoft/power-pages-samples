import { useDeferredValue } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Field, SearchBox, Text, makeStyles, tokens } from '@fluentui/react-components'
import { Container } from '../../components/Layout'
import { DataTable, type Column } from '../../components/DataTable'
import { createdOnColumn } from '../../components/createdOnColumn'
import { AppLink, Button, PageHeader, StatusBadge, Tabs } from '../../components/ui'
import { PageSkeleton } from '../../components/skeletons'
import type { WorkOrder } from '../../data/types'
import { myBooking, technicianWorkOrders } from '../../lib/access'
import { useApp } from '../../store/AppStore'
import { loadTechnicianWorkOrders } from '../../services/technician'
import { asLoad, useLiveLoad } from '../../services/useLiveLoad'
import { LoadError } from '../customers/LoadError'
import { WO_ROUTES, formatVisitWindow, isRecentlyAssigned, visitBooking, workOrderPlace } from './workOrderUtils'

type View = 'mine' | 'team' | 'completed'
const VIEWS: View[] = ['mine', 'team', 'completed']

const useStyles = makeStyles({
  search: { width: '100%', maxWidth: '24rem', marginBottom: tokens.spacingVerticalM },
  searchLabel: { fontWeight: tokens.fontWeightSemibold },
  title: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS },
  muted: { color: tokens.colorNeutralForeground2 },
  badges: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalXS },
})

const matches = (w: WorkOrder, q: string) => {
  const t = q.trim().toLowerCase()
  if (!t) return true
  return [w.number, w.title, w.customerName, w.siteName, w.asset?.name].some(v => v?.toLowerCase().includes(t))
}

export default function WorkOrders() {
  const styles = useStyles()
  const { db, session, mode } = useApp()
  const load = useLiveLoad('wo:list', asLoad(loadTechnicianWorkOrders))
  const [params, setParams] = useSearchParams()
  const viewParam = params.get('view') as View | null
  const view: View = viewParam && VIEWS.includes(viewParam) ? viewParam : 'mine'
  const query = params.get('q') ?? ''
  const applied = useDeferredValue(query)
  const update = (next: { view?: View; q?: string }) => {
    const p = new URLSearchParams(params)
    const v = next.view ?? view
    if (v !== 'mine') p.set('view', v)
    else p.delete('view')
    const q = next.q ?? query
    if (q) p.set('q', q)
    else p.delete('q')
    setParams(p, { replace: true, flushSync: true })
  }

  const visible = technicianWorkOrders(db, session)
  const isOpen = (w: WorkOrder) => !['Completed', 'Posted', 'Canceled'].includes(w.systemStatus)
  // A follow-up visit puts a reported work order back on "Assigned to me" with a new open booking.
  const myOpenVisit = (w: WorkOrder) => {
    const b = myBooking(db, session, w.id)
    return !!b && b.status !== 'Completed'
  }
  const byView: Record<View, WorkOrder[]> = {
    mine: visible.filter(w => isOpen(w) && myOpenVisit(w)),
    team: visible.filter(w => isOpen(w) && !myBooking(db, session, w.id)),
    completed: visible.filter(w => !isOpen(w) || (!!myBooking(db, session, w.id) && !myOpenVisit(w))),
  }
  const rows = byView[view].filter(w => matches(w, applied))
  const booking = (w: WorkOrder) => visitBooking(db, w.id, session.contact?.id)

  const columns: Column<WorkOrder>[] = [
    {
      key: 'title',
      header: 'Work order',
      sortValue: w => w.number,
      render: w => (
        <span className={styles.title}>
          <AppLink to={WO_ROUTES.details(w.id)} inline>
            {w.number} · {w.title}
          </AppLink>
          {view === 'mine' && booking(w) && isRecentlyAssigned(booking(w)!) && (
            <span className={styles.badges}>
              <StatusBadge status="Recently assigned" tone="sky" />
            </span>
          )}
        </span>
      ),
    },
    { key: 'site', header: 'Customer site', sortValue: w => workOrderPlace(w), render: w => workOrderPlace(w) },
    { key: 'visit', header: 'Visit', sortValue: w => booking(w)?.start ?? '', render: w => formatVisitWindow(booking(w)) },
    ...(view === 'team'
      ? [
          {
            key: 'tech',
            header: 'Technician',
            sortValue: (w: WorkOrder) => booking(w)?.resourceName ?? '',
            render: (w: WorkOrder) => booking(w)?.resourceName ?? '—',
          },
        ]
      : []),
    { key: 'priority', header: 'Priority', sortValue: w => w.priority, render: w => w.priority },
    {
      key: 'status',
      header: 'Status',
      sortValue: w => (view === 'completed' ? w.systemStatus : (booking(w)?.status ?? w.systemStatus)),
      render: w => <StatusBadge status={view === 'completed' ? w.systemStatus : (booking(w)?.status ?? w.systemStatus)} />,
    },
    createdOnColumn<WorkOrder>(),
  ]

  const empty = applied.trim()
    ? {
        title: `No work orders match "${applied.trim()}"`,
        body: 'Search by work order number, customer, site or asset.',
        action: <Button onClick={() => update({ q: '' })}>Clear search</Button>,
      }
    : view === 'mine'
      ? { title: 'No open visits assigned to you', body: 'When Zava dispatch books you for a visit, it appears here.' }
      : view === 'team'
        ? { title: 'No other open work orders', body: 'Open work orders booked to other technicians in your organization appear here.' }
        : { title: 'No completed work orders yet', body: 'Work orders appear here after the service report is submitted.' }

  if (mode === 'live' && load.status === 'error')
    return <LoadError title="Work orders" breadcrumbs={[{ label: 'Work orders' }]} error={load.error} onRetry={() => void load.reload()} />
  if (mode === 'live' && load.status === 'loading') return <PageSkeleton variant="list" />

  return (
    <Container>
      <PageHeader
        title="Work orders"
        eyebrow="Technician workspace"
        description={
          <Text className={styles.muted}>
            Field Service visits assigned to you, plus open work orders booked to other technicians in your organization (read-only).
          </Text>
        }
      />
      <Tabs<View>
        label="Work order views"
        value={view}
        onChange={v => update({ view: v })}
        tabs={[
          { id: 'mine', label: 'Assigned to me', count: byView.mine.length },
          { id: 'team', label: 'My organization', count: byView.team.length },
          { id: 'completed', label: 'Completed', count: byView.completed.length },
        ]}
      />
      <div role="search" className={styles.search}>
        <Field
          label={{ children: 'Search work orders', htmlFor: 'wo-search', className: styles.searchLabel }}
          hint="Work order number, customer, site or asset"
        >
          <SearchBox id="wo-search" value={query} onChange={(_, data) => update({ q: data.value })} className="w-full max-w-full" />
        </Field>
      </div>
      <span className="sr-only" aria-live="polite">
        {rows.length} {rows.length === 1 ? 'work order' : 'work orders'} shown
      </span>
      <DataTable
        key={view}
        caption={view === 'mine' ? 'Work orders assigned to me' : view === 'team' ? 'Open work orders in my organization' : 'Completed work orders'}
        columns={columns}
        rows={rows}
        rowKey={w => w.id}
        initialSort={{ key: 'visit', dir: view === 'completed' ? 'desc' : 'asc' }}
        empty={empty}
      />
    </Container>
  )
}
