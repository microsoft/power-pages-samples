import { useState } from 'react'
import { Body1, Caption1, Subtitle1, Text, makeStyles, tokens } from '@fluentui/react-components'
import { ArrowRight20Regular, ClipboardTaskListLtr20Regular } from '@fluentui/react-icons'
import { Container } from '../../components/Layout'
import { PageSkeleton } from '../../components/skeletons'
import { AppLink, ButtonLink, EmptyState, PageHeader, Panel, Stat, StatusBadge } from '../../components/ui'
import type { Booking, WorkOrder } from '../../data/types'
import { myBooking, technicianWorkOrders } from '../../lib/access'
import { loadTechnicianWorkOrders } from '../../services/technician'
import { asLoad, useLiveLoad } from '../../services/useLiveLoad'
import { useApp } from '../../store/AppStore'
import { LoadError } from '../customers/LoadError'
import { WO_ROUTES, formatVisitWindow, isRecentlyAssigned, isToday, workOrderPlace } from './workOrderUtils'

const useStyles = makeStyles({
  muted: { color: tokens.colorNeutralForeground2 },
  next: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS },
  nextTitle: { margin: 0, color: tokens.colorNeutralForeground1 },
  badges: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalS },
  list: { listStyleType: 'none', margin: 0, padding: 0 },
  item: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    ':last-child': { borderBottom: 'none' },
  },
  itemText: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXXS },
})

const OPEN_BOOKING = new Set(['Scheduled', 'Traveling', 'In Progress', 'On Break'])

/** Home for the Partner Technician role: today's visits and the next one to work on. No sales content. */
export default function TechnicianHome() {
  const styles = useStyles()
  const { db, session, mode } = useApp()
  const load = useLiveLoad('wo:list', asLoad(loadTechnicianWorkOrders))
  // Read the clock once per mount; render must stay pure.
  const [now] = useState(() => Date.now())
  const organization = db.accounts.find(a => a.id === session.partnerId)?.name

  if (mode === 'live' && load.status === 'error')
    return <LoadError title="Technician workspace" breadcrumbs={[{ label: 'Home' }]} error={load.error} onRetry={() => void load.reload()} />
  if (mode === 'live' && load.status === 'loading') return <PageSkeleton variant="hub" />

  const visits = technicianWorkOrders(db, session)
    .map(wo => ({ wo, booking: myBooking(db, session, wo.id) }))
    .filter((v): v is { wo: WorkOrder; booking: Booking } => !!v.booking)
    .sort((a, b) => a.booking.start.localeCompare(b.booking.start))
  const open = visits.filter(v => OPEN_BOOKING.has(v.booking.status))
  const today = visits.filter(v => isToday(v.booking.start))
  const awaitingReport = open.filter(v => v.booking.status === 'In Progress' || v.booking.status === 'On Break')
  const next = open.find(v => v.booking.status !== 'Scheduled') ?? open[0]
  const weekAhead = open.filter(v => new Date(v.booking.start).getTime() - now < 7 * 24 * 60 * 60 * 1000)

  return (
    <Container>
      <PageHeader
        title={`Welcome back, ${session.contact?.firstName ?? 'technician'}`}
        eyebrow="Technician workspace"
        description={<Text className={styles.muted}>{organization ? `${organization} · ` : ''}Your Field Service visits for Zava customers.</Text>}
        actions={
          <ButtonLink to={WO_ROUTES.home} icon={<ClipboardTaskListLtr20Regular />}>
            All work orders
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 mb-6">
        <Stat label="Today's visits" value={today.length} hint={today.length === 1 ? '1 visit booked today' : `${today.length} visits booked today`} />
        <Stat label="Open this week" value={weekAhead.length} hint="Scheduled or in progress" />
        <Stat label="Awaiting service report" value={awaitingReport.length} hint="On site, report not submitted" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Next visit">
          {next ? (
            <div className={styles.next}>
              <Subtitle1 as="h3" className={styles.nextTitle}>
                {next.wo.number} · {next.wo.title}
              </Subtitle1>
              <Body1 as="p">
                {workOrderPlace(next.wo)} · {formatVisitWindow(next.booking)}
              </Body1>
              <div className={styles.badges}>
                <StatusBadge status={next.booking.status} />
                <StatusBadge status={next.wo.priority} tone={/4-hour|urgent|high/i.test(next.wo.priority) ? 'amber' : 'slate'} />
                {isRecentlyAssigned(next.booking) && <StatusBadge status="Recently assigned" tone="sky" />}
              </div>
              {next.wo.asset && (
                <Caption1 as="p" className={styles.muted}>
                  Asset: {next.wo.asset.name}
                </Caption1>
              )}
              <div className="mt-2">
                <ButtonLink to={WO_ROUTES.details(next.wo.id)} variant="primary" icon={<ArrowRight20Regular />}>
                  Open work order
                </ButtonLink>
              </div>
            </div>
          ) : (
            <EmptyState bare title="No open visits" body="When Zava dispatch books you for a visit, it appears here." />
          )}
        </Panel>

        <Panel title="Today's visits">
          {today.length === 0 ? (
            <EmptyState bare title="Nothing booked today" body="Upcoming visits are listed on the Work orders page." />
          ) : (
            <ul className={styles.list}>
              {today.map(({ wo, booking }) => (
                <li key={booking.id} className={styles.item}>
                  <span className={styles.itemText}>
                    <AppLink to={WO_ROUTES.details(wo.id)} inline>
                      {wo.number} · {wo.title}
                    </AppLink>
                    <Caption1 className={styles.muted}>
                      {workOrderPlace(wo)} · {formatVisitWindow(booking)}
                    </Caption1>
                  </span>
                  <StatusBadge status={booking.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </Container>
  )
}
