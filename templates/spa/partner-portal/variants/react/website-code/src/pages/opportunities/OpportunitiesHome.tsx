import type { ReactElement } from 'react'
import { Body1, Caption1Strong, Card, CardFooter, CardHeader, Subtitle1, Subtitle2, makeStyles, shorthands, tokens } from '@fluentui/react-components'
import { Add20Regular, ArrowRight16Regular, ArrowRouting20Regular, Briefcase20Regular, MailInboxArrowDown20Regular } from '@fluentui/react-icons'
import type { Opportunity } from '../../data/types'
import { Container } from '../../components/Layout'
import { ButtonLink, PageHeader, useRouterNavigate } from '../../components/ui'
import { can, distributedOpportunities, managedOpportunities } from '../../lib/access'
import { formatCompactCurrency, todayIso } from '../../lib/format'
import { useApp } from '../../store/AppStore'
import { PageSkeleton } from '../../components/skeletons'
import { loadOpportunityRows } from '../../services/opportunities'
import { useLiveLoad } from '../../services/useLiveLoad'
import { useRoutePreload } from '../../hooks/useRoutePreload'
import { OpportunityLoadError } from '../../services/opportunitiesView'
import { FigureStrip, type GlanceFigure } from '../home/PipelineGlance'
import { AttentionPanel, WorkTabs, type AttentionItem, type WorkTab } from '../home/DashboardWork'
import { daysUntil, isClosed, sumRevenue } from '../home/pipeline'
import { ACTIVE_REG_STATUSES, OPP_ROUTES, detailsRoute, managedRoute } from './oppUtils'

const MIDDOT = '\u00B7'
const EM_DASH = '\u2014'
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
  sectionTitle: { display: 'block', margin: 0, marginBottom: tokens.spacingVerticalM, color: tokens.colorNeutralForeground1 },
  cardLink: {
    display: 'block',
    height: '100%',
    color: 'inherit',
    textDecorationLine: 'none',
    borderRadius: tokens.borderRadiusMedium,
    ':focus-visible': { outline: `${tokens.strokeWidthThick} solid ${tokens.colorStrokeFocus2}`, outlineOffset: '2px' },
    ':hover .fui-Card': { backgroundColor: tokens.colorNeutralBackground1Hover, ...shorthands.borderColor(tokens.colorBrandStroke1) },
    ':hover .opp-card-title': { color: tokens.colorBrandForeground1 },
  },
  card: { height: '100%' },
  icon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
  },
  title: { margin: 0, color: tokens.colorNeutralForeground1 },
  body: { flexGrow: 1, color: tokens.colorNeutralForeground2 },
  meta: { color: tokens.colorNeutralForeground2 },
  open: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    color: tokens.colorBrandForeground1,
    textDecorationLine: 'underline',
    textUnderlineOffset: '2px',
  },
})

export default function OpportunitiesHome() {
  const styles = useStyles()
  const go = useRouterNavigate()
  const preload = useRoutePreload()
  const { db, session, mode } = useApp()
  const sellerId = session.role === 'partner-seller' ? session.contact?.id : undefined
  const load = useLiveLoad('opps:home', signal => loadOpportunityRows(sellerId, signal))
  const canDistributed = can(session.role, 'distributed')
  const distributed = distributedOpportunities(db, session)
  const managed = managedOpportunities(db, session)
  const managedIds = new Set(managed.map(o => o.id))
  const regs = db.dealRegistrations.filter(r => managedIds.has(r.opportunityId))
  const activeRegs = regs.filter(r => ACTIVE_REG_STATUSES.has(r.status))
  const expiringRegs = regs.filter(r => r.status === 'Expiring')

  const open = managed.filter(o => !isClosed(o))
  const won = managed.filter(o => o.status === 'Won')
  const lost = managed.filter(o => o.status === 'Lost')
  const wonRevenue = sumRevenue(won)
  const lostRevenue = sumRevenue(lost)
  // Same windows as Home so the two pages agree: respond within 7 days, close within 30.
  const soonDistributed = distributed.filter(o => o.expiryDate && daysUntil(o.expiryDate) <= 7)
  const closingSoon = open.filter(o => daysUntil(o.estCloseDate) <= 30).sort((a, b) => a.estCloseDate.localeCompare(b.estCloseDate))

  const figures: GlanceFigure[] = [
    ...(canDistributed
      ? [{
          label: 'Awaiting your response',
          value: String(distributed.length),
          hint: `${soonDistributed.length} ${soonDistributed.length === 1 ? 'expires' : 'expire'} within 7 days`,
          to: OPP_ROUTES.distributed,
          warn: soonDistributed.length > 0,
        }]
      : []),
    { label: 'Open pipeline', value: formatCompactCurrency(sumRevenue(open)), hint: `${plural(open.length, 'open opportunity', 'open opportunities')}`, to: managedRoute() },
    {
      label: 'Closing in 30 days',
      value: String(closingSoon.length),
      hint: `${formatCompactCurrency(sumRevenue(closingSoon))} estimated revenue`,
      to: managedRoute(),
      warn: closingSoon.length > 0,
    },
    {
      label: 'Win rate',
      value: wonRevenue + lostRevenue > 0 ? `${Math.round((wonRevenue / (wonRevenue + lostRevenue)) * 100)}%` : EM_DASH,
      hint: `${won.length} won ${MIDDOT} ${lost.length} lost, by revenue`,
      to: managedRoute({ status: 'won' }),
    },
    {
      label: 'Active registrations',
      value: String(activeRegs.length),
      hint: expiringRegs.length ? `${expiringRegs.length} expiring ${MIDDOT} extend to keep protection` : 'Protecting your partner-sourced deals',
      to: managedRoute(),
      warn: expiringRegs.length > 0,
    },
  ]

  const attention: AttentionItem[] = [
    ...soonDistributed.map(o => ({
      key: o.id,
      type: 'Distributed opportunity expires',
      headline: o.topic,
      to: OPP_ROUTES.summary(o.id),
      action: 'Review opportunity',
      deadline: o.expiryDate!,
    })),
    ...expiringRegs.map(r => ({
      key: r.id,
      type: 'Deal registration expiring',
      headline: r.name,
      to: OPP_ROUTES.details(r.opportunityId),
      action: 'Extend registration',
      deadline: r.expirationDate ?? todayIso(),
    })),
  ].sort((a, b) => a.deadline.localeCompare(b.deadline))

  const regExpiry = (o: Opportunity) =>
    activeRegs.filter(r => r.opportunityId === o.id).map(r => r.expirationDate).filter(Boolean).sort()[0]
  const registered = open.filter(o => activeRegs.some(r => r.opportunityId === o.id)).sort((a, b) => (regExpiry(a) ?? '9999').localeCompare(regExpiry(b) ?? '9999'))
  const closedOn = (o: Opportunity) => o.actualCloseDate ?? o.estCloseDate

  const tabs: WorkTab[] = [
    {
      id: 'closing',
      label: 'Closing in 30 days',
      rows: closingSoon,
      hrefFor: detailsRoute,
      date: { header: 'Close date', value: o => o.estCloseDate },
      empty: 'None of your open opportunities are due to close in the next 30 days.',
      viewAll: { to: managedRoute(), label: 'View open opportunities' },
    },
    {
      id: 'registered',
      label: 'Registered deals',
      rows: registered,
      hrefFor: detailsRoute,
      date: { header: 'Protected until', value: regExpiry },
      empty: 'No open opportunities have an active deal registration. Register partner-created deals to protect them.',
      viewAll: { to: managedRoute(), label: 'View open opportunities' },
    },
    {
      id: 'collaborative',
      label: 'Collaborative',
      rows: managed.filter(o => o.collaboration),
      hrefFor: detailsRoute,
      date: { header: 'Close date', value: o => o.estCloseDate },
      empty: 'No opportunities are shared with your organization by another partner.',
      viewAll: { to: managedRoute({ view: 'collaborative', status: 'all' }), label: 'View collaborative opportunities' },
    },
    {
      id: 'closed',
      label: 'Recently closed',
      rows: managed.filter(isClosed).sort((a, b) => closedOn(b).localeCompare(closedOn(a))),
      hrefFor: detailsRoute,
      date: { header: 'Closed on', value: closedOn },
      empty: 'You have no won, lost or canceled opportunities yet.',
      viewAll: { to: managedRoute({ status: 'all' }), label: 'View all managed opportunities' },
    },
  ]

  const cards: { to: string; title: string; body: string; meta?: string; cta: string; icon: ReactElement }[] = [
    ...(canDistributed
      ? [{
          to: OPP_ROUTES.distributed,
          title: 'Distributed opportunities',
          body: 'Leads Zava has sent to your organization. Accept or decline them before they expire.',
          meta: `${distributed.length} waiting for a response`,
          cta: 'Review distributed opportunities',
          icon: <MailInboxArrowDown20Regular />,
        }]
      : []),
    {
      to: OPP_ROUTES.managed,
      title: 'Managed opportunities',
      body: 'Work the deals you have accepted, created or share with another partner: update details, add products, register and close.',
      meta: `${open.length} open ${MIDDOT} ${formatCompactCurrency(sumRevenue(open))} estimated revenue`,
      cta: 'Go to managed opportunities',
      icon: <Briefcase20Regular />,
    },
    {
      to: OPP_ROUTES.create,
      title: 'Create an opportunity',
      body: 'Log a deal your team found, then register it with Zava to protect it.',
      cta: 'Create an opportunity',
      icon: <Add20Regular />,
    },
  ]

  if (mode === 'live' && load.status === 'error') return <OpportunityLoadError load={load} />
  if (mode === 'live' && load.status === 'loading') return <PageSkeleton variant="hub" />

  const lead = (
    <>
      {canDistributed && distributed.length > 0 ? (
        <>
          <span className={styles.leadStrong}>{plural(distributed.length, 'distributed opportunity', 'distributed opportunities')}</span>{' '}
          {distributed.length === 1 ? 'is' : 'are'} waiting for your response, and you have{' '}
        </>
      ) : (
        'You have '
      )}
      <span className={styles.leadStrong}>{formatCompactCurrency(sumRevenue(open))}</span> in open pipeline across{' '}
      {plural(open.length, 'opportunity', 'opportunities')}
      {session.role === 'partner-seller' ? ' assigned to you or shared with you.' : '.'}
    </>
  )

  return (
    <Container>
      <PageHeader
        title="Opportunities"
        breadcrumbs={[{ label: 'Opportunities' }]}
        description={lead}
        actions={
          <>
            <ButtonLink to={OPP_ROUTES.create} variant="primary" icon={<Add20Regular />}>
              Create opportunity
            </ButtonLink>
            {canDistributed && (
              <ButtonLink to={OPP_ROUTES.distributed} icon={<ArrowRouting20Regular />}>
                Review distributed opportunities
              </ButtonLink>
            )}
          </>
        }
      />

      <FigureStrip figures={figures} label="Opportunity summary" standalone />

      <div className={styles.work}>
        <AttentionPanel
          items={attention}
          idPrefix="opp-attention"
          empty="Nothing is due. Distributed opportunities and deal registrations that expire within 7 days will show here."
        />
        <WorkTabs tabs={tabs} label="Opportunity lists" idPrefix="opp-work" />
      </div>

      <section aria-labelledby="opp-sections">
        <Subtitle1 as="h2" id="opp-sections" className={styles.sectionTitle}>
          Opportunity areas
        </Subtitle1>
        <ul className={`grid gap-4 ${cards.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {cards.map(c => (
            <li key={c.to}>
              <a {...preload(c.to)} href={c.to} onClick={go(c.to)} aria-label={c.meta ? `${c.title}. ${c.meta}` : c.title} className={styles.cardLink}>
                <Card className={styles.card}>
                  <CardHeader
                    image={
                      <span className={styles.icon} aria-hidden="true">
                        {c.icon}
                      </span>
                    }
                    header={
                      <Subtitle2 as="h3" className={`${styles.title} opp-card-title`}>
                        {c.title}
                      </Subtitle2>
                    }
                  />
                  <Body1 as="p" className={styles.body}>
                    {c.body}
                  </Body1>
                  {c.meta && (
                    <Caption1Strong as="p" className={styles.meta}>
                      {c.meta}
                    </Caption1Strong>
                  )}
                  <CardFooter>
                    <Body1 className={styles.open}>
                      {c.cta} <ArrowRight16Regular aria-hidden="true" />
                    </Body1>
                  </CardFooter>
                </Card>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  )
}
