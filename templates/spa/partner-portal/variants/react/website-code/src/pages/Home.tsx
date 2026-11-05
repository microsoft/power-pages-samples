import { lazy, useState, type ReactElement } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Body1,
  Body1Strong,
  LargeTitle,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Subtitle2,
  Title1,
  Title2,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components'
import {
  Add20Regular,
  ArrowRight16Regular,
  ArrowRouting20Regular,
  MoreHorizontal20Regular,
  People20Regular,
  PersonAdd20Regular,
  PersonSettings20Regular,
  ShieldCheckmark20Regular,
  ShieldPerson20Regular,
} from '@fluentui/react-icons'
import { useApp } from '../store/AppStore'
import { can, distributedOpportunities, managedOpportunities, PARTNER_ROLES, ROLE_LABELS } from '../lib/access'
import { formatCompactCurrency, formatDate, todayIso } from '../lib/format'
import type { Opportunity } from '../data/types'
import HeroBackdrop from '../components/HeroBackdrop'
import { APPLICATION_REVIEW_TIME } from '../lib/program'
import { Container } from '../components/Layout'
import { Alert, Button, ButtonLink, StatusBadge, useIsNarrow, usePageTitle } from '../components/ui'
import { PageSkeleton } from '../components/skeletons'
import { loadDashboard } from '../services/loaders'
import { useLiveLoad } from '../services/useLiveLoad'
import { useRoutePreload } from '../hooks/useRoutePreload'
import { ON_NAVY_FG, SHELL_TEXT_MUTED, withAlpha } from '../theme/fluentTheme'
import { HERO_NAVY, LinkCard, ON_NAVY_VARS, useOnNavyButtonStyles } from './program/ProgramHero'
import { detailsRoute, managedRoute, OPP_ROUTES } from './opportunities/oppUtils'
import { CLOSE_PERIODS, daysUntil, inPeriod, isClosed, sumRevenue, type ClosePeriod } from './home/pipeline'
import { PipelineGlance, type GlanceFigure } from './home/PipelineGlance'
import { AttentionPanel, WorkTabs, type AttentionItem, type WorkTab } from './home/DashboardWork'
import { PipelineTrends } from './home/PipelineTrends'

export default function Home() {
  usePageTitle()
  const { session, mode, sessionReady } = useApp()
  if (mode === 'live' && !sessionReady) return <PageSkeleton variant="dashboard" />
  if (can(session.role, 'work-orders')) return <TechnicianHome />
  return PARTNER_ROLES.includes(session.role) ? <Dashboard /> : <Landing />
}

// Technicians never load the sales dashboard code (and vice versa).
const TechnicianHome = lazy(() => import('./work-orders/TechnicianHome'))

const MIDDOT = '\u00B7'
const EM_DASH = '\u2014'

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

/* ----------------------------- Public landing ----------------------------- */

const BENEFITS: { title: string; desc: string; icon: ReactElement }[] = [
  {
    title: 'Distributed opportunities',
    desc: 'Qualified opportunities routed by territory and competency. Review and respond before they expire.',
    icon: <ArrowRouting20Regular />,
  },
  {
    title: 'Deal registration protection',
    desc: 'Register partner-sourced deals and secure a 180-day protection window, with renewal before expiry.',
    icon: <ShieldCheckmark20Regular />,
  },
  { title: 'Customer management', desc: 'Keep customer accounts and contacts in one place, scoped to your organization and roles.', icon: <People20Regular /> },
  {
    title: 'Partner administration',
    desc: 'Invite colleagues, assign Partner Admin, Manager or Seller roles and keep your partner account current.',
    icon: <PersonSettings20Regular />,
  },
]

// Mirrors the Program home highlights so the same facts read the same way on both pages.
const STATS = [
  { value: '500+', label: 'Active partners' },
  { value: '4', label: 'Partner tiers' },
  { value: '180 days', label: 'Deal registration protection' },
  { value: APPLICATION_REVIEW_TIME, label: 'Typical application review (example)' },
]

const HOW_IT_WORKS: { title: string; desc: string }[] = [
  { title: 'Apply', desc: 'Sign in or create an account, then submit the partner registration for your organization.' },
  { title: 'Get approved', desc: `Zava reviews your application. Example review time: ${APPLICATION_REVIEW_TIME}.` },
  { title: 'Start selling', desc: 'Receive distributed opportunities, register deals and manage customers in the portal.' },
]

const LINK_CARDS = [
  { title: 'Program details', desc: 'Tiers, benefits and partner responsibilities.', to: '/partner-program/partner-program-details/' },
  { title: 'Become a partner', desc: 'How to apply, and what happens after you submit.', to: '/partner-program/become-a-partner/' },
  { title: 'Frequently asked questions', desc: 'Deal registration, distributed opportunities and roles.', to: '/partner-program/partner-program-FAQs/' },
]

const useLandingStyles = makeStyles({
  hero: { backgroundColor: HERO_NAVY, color: tokens.colorNeutralForegroundStaticInverted },
  heroEyebrow: { display: 'block', margin: 0, marginBottom: tokens.spacingVerticalL, color: SHELL_TEXT_MUTED },
  heroTitle: { display: 'block', margin: 0, maxWidth: '42rem', color: tokens.colorNeutralForegroundStaticInverted },
  heroBody: { display: 'block', margin: 0, marginTop: tokens.spacingVerticalXL, maxWidth: '36rem', color: tokens.colorNeutralBackgroundAlpha2, fontSize: tokens.fontSizeBase400, lineHeight: tokens.lineHeightBase400 },
  statusLine: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacingHorizontalM, marginTop: tokens.spacingVerticalM },
  statItem: {
    display: 'grid',
    gridTemplateRows: 'subgrid',
    gridRow: 'span 2',
    borderInlineStartWidth: tokens.strokeWidthThin,
    borderInlineStartStyle: 'solid',
    borderInlineStartColor: withAlpha(ON_NAVY_FG, 0.3),
    paddingInlineStart: tokens.spacingHorizontalL,
    '@media (max-width: 767.98px)': { paddingBottom: tokens.spacingVerticalL },
  },
  statLabel: { display: 'block', fontSize: tokens.fontSizeBase300, lineHeight: tokens.lineHeightBase300, color: SHELL_TEXT_MUTED },
  statValue: { display: 'block', margin: 0, marginTop: tokens.spacingVerticalXS, fontSize: tokens.fontSizeBase600, lineHeight: tokens.lineHeightBase600, fontWeight: tokens.fontWeightSemibold },
  eyebrow: { display: 'block', margin: 0, marginBottom: tokens.spacingVerticalS, color: tokens.colorNeutralForeground2 },
  h2: { display: 'block', margin: 0, color: tokens.colorNeutralForeground1 },
  section: { ...shorthands.padding(tokens.spacingVerticalXXXL, 0), ':not(:first-child)': { borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}` } },
  ctaSection: { paddingTop: tokens.spacingVerticalXXXL },
  benefit: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalS },
  benefitIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorBrandBackground2,
  },
  stepNumber: {
    display: 'flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: tokens.borderRadiusCircular,
    color: tokens.colorNeutralForegroundOnBrand,
    backgroundColor: tokens.colorBrandBackground,
    fontWeight: tokens.fontWeightSemibold,
  },
  ctaBand: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalXL,
    ...shorthands.padding(tokens.spacingVerticalXXL, tokens.spacingHorizontalXXL),
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: HERO_NAVY,
  },
  ctaTitle: { display: 'block', margin: 0, color: ON_NAVY_FG },
  ctaBody: { display: 'block', margin: 0, marginTop: tokens.spacingVerticalXS, color: SHELL_TEXT_MUTED },
  benefitTitle: { display: 'block', margin: 0, color: tokens.colorNeutralForeground1 },
  benefitDesc: { display: 'block', margin: 0, color: tokens.colorNeutralForeground2 },
  linkCardTitle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
})

function Landing() {
  const { session, mode } = useApp()
  const styles = useLandingStyles()
  const onNavy = useOnNavyButtonStyles()
  const nonPartner = session.role === 'non-partner'
  const app = session.contact?.application
  // The hero and closing banner already link to "Become a partner" for anonymous visitors.
  const resources = LINK_CARDS.filter(c => nonPartner || c.to !== '/partner-program/become-a-partner/').slice(0, 3)
  return (
    <>
      {nonPartner ? (
        <section className={styles.hero} style={ON_NAVY_VARS}>
          <div className="max-w-[1440px] mx-auto px-6 py-10 md:py-12">
            <Body1Strong as="p" className={styles.heroEyebrow}>
              Zava Partner Program
            </Body1Strong>
            <Title1 as="h1" className={styles.heroTitle}>
              {app ? 'Your partner application' : 'Apply to become a Zava partner'}
            </Title1>
            {app ? (
              <div className={styles.statusLine}>
                <StatusBadge status={app.status} />
                <Body1 as="p" className={mergeClasses(styles.heroBody, 'mt-0!')}>
                  Submitted {formatDate(app.submittedOn)} for {app.organizationName}. Example review time: {APPLICATION_REVIEW_TIME}.
                  {mode === 'live' ? '' : ' Status updates are simulated in this prototype.'}
                </Body1>
              </div>
            ) : (
              <Body1 as="p" className={styles.heroBody}>
                Partner features (opportunities, deal registration and customers) unlock once your partner application is approved.
              </Body1>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink to="/profile/register-to-be-a-partner/" variant="primary" icon={app ? undefined : <ArrowRight16Regular />}>
                {app ? 'View your application' : 'Register to be a partner'}
              </ButtonLink>
            </div>
          </div>
        </section>
      ) : (
        <section className={mergeClasses('relative overflow-hidden', styles.hero)} style={ON_NAVY_VARS}>
          <HeroBackdrop />
          <div className="relative max-w-[1440px] mx-auto px-6 py-20 md:py-28">
            <Body1Strong as="p" className={styles.heroEyebrow}>
              Zava Partner Program
            </Body1Strong>
            <LargeTitle as="h1" className={styles.heroTitle}>
              Grow together with the Zava partner network
            </LargeTitle>
            <Body1 as="p" className={styles.heroBody}>
              One portal to receive distributed opportunities, protect your deals with deal registration and manage customers {EM_DASH} built for
              partner admins, managers and sellers.
            </Body1>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/partner-program/become-a-partner/" variant="primary" icon={<ArrowRight16Regular />}>
                Become a partner
              </ButtonLink>
              <ButtonLink to="/login" className={onNavy.outline}>
                Partner sign in
              </ButtonLink>
            </div>
            <dl className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 max-w-3xl">
              {STATS.map(s => (
                <div key={s.label} className={styles.statItem}>
                  <dt className={styles.statLabel}>{s.label}</dt>
                  <dd className={styles.statValue}>{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      <Container>
        <section aria-labelledby="benefits-heading" className={styles.section}>
          <Body1Strong as="p" className={styles.eyebrow}>
            Why partner with Zava
          </Body1Strong>
          <Title2 as="h2" id="benefits-heading" className={styles.h2}>
            Everything your partner team needs in one place
          </Title2>
          <ul className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
            {BENEFITS.map(b => (
              <li key={b.title} className={styles.benefit}>
                <span aria-hidden="true" className={styles.benefitIcon}>
                  {b.icon}
                </span>
                <Subtitle2 as="h3" className={styles.benefitTitle}>
                  {b.title}
                </Subtitle2>
                <Body1 as="p" className={styles.benefitDesc}>
                  {b.desc}
                </Body1>
              </li>
            ))}
          </ul>
        </section>

        {nonPartner ? null : (
          <section aria-labelledby="how-heading" className={styles.section}>
            <Body1Strong as="p" className={styles.eyebrow}>
              How it works
            </Body1Strong>
            <Title2 as="h2" id="how-heading" className={styles.h2}>
              From application to your first opportunity
            </Title2>
            <ol className="mt-8 grid md:grid-cols-3 gap-x-8 gap-y-8">
              {HOW_IT_WORKS.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span aria-hidden="true" className={styles.stepNumber}>
                    {i + 1}
                  </span>
                  <div className={styles.benefit}>
                    <Subtitle2 as="h3" className={styles.benefitTitle}>
                      <span className="sr-only">Step {i + 1}: </span>
                      {s.title}
                    </Subtitle2>
                    <Body1 as="p" className={styles.benefitDesc}>
                      {s.desc}
                    </Body1>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section aria-labelledby="resources-heading" className={styles.section}>
          <Body1Strong as="p" className={styles.eyebrow}>
            Resources
          </Body1Strong>
          <Title2 as="h2" id="resources-heading" className={styles.h2}>
            Explore the partner program
          </Title2>
          <ul className={mergeClasses('mt-8 grid gap-4', resources.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3')}>
            {resources.map(c => (
              <li key={c.title}>
                <LinkCard
                  to={c.to}
                  title={
                    <span className={styles.linkCardTitle}>
                      {c.title} <ArrowRight16Regular aria-hidden="true" />
                    </span>
                  }
                  desc={c.desc}
                />
              </li>
            ))}
          </ul>
        </section>

        {!nonPartner && (
          <section aria-labelledby="cta-heading" className={styles.ctaSection} style={ON_NAVY_VARS}>
            <div className={styles.ctaBand}>
              <div>
                <Title2 as="h2" id="cta-heading" className={styles.ctaTitle}>
                  Ready to grow with Zava?
                </Title2>
                <Body1 as="p" className={styles.ctaBody}>
                  Apply in a few minutes. Already a partner? Sign in to see your opportunities.
                </Body1>
              </div>
              <div className="flex flex-wrap gap-3">
                <ButtonLink to="/partner-program/become-a-partner/" variant="primary" icon={<ArrowRight16Regular />}>
                  Become a partner
                </ButtonLink>
                <ButtonLink to="/login" className={onNavy.outline}>
                  Partner sign in
                </ButtonLink>
              </div>
            </div>
          </section>
        )}
      </Container>
    </>
  )
}

/* ---------------------------- Partner dashboard ---------------------------- */

const useDashStyles = makeStyles({
  header: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalXXL,
    '@media (min-width: 1280px)': { gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'end' },
  },
  eyebrow: { display: 'block', margin: 0, marginBottom: tokens.spacingVerticalXS, color: tokens.colorNeutralForeground2 },
  h1: { display: 'block', margin: 0, color: tokens.colorNeutralForeground1 },
  lead: { display: 'block', margin: 0, marginTop: tokens.spacingVerticalXS, color: tokens.colorNeutralForeground2 },
  leadStrong: { color: tokens.colorNeutralForeground1, fontWeight: tokens.fontWeightSemibold },
  work: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    alignItems: 'start',
    gap: tokens.spacingHorizontalXXL,
    marginBottom: tokens.spacingVerticalXXL,
    '@media (min-width: 1024px)': { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)' },
  },
})

interface QuickAction {
  label: string
  to: string
  icon: ReactElement
}

function Dashboard() {
  const preload = useRoutePreload()
  const { db, session, mode } = useApp()
  const load = useLiveLoad('home:dashboard', signal => loadDashboard('rows', signal))
  const styles = useDashStyles()
  const navigate = useNavigate()
  const isNarrow = useIsNarrow()
  const [period, setPeriod] = useState<ClosePeriod>('all')
  const canDistributed = can(session.role, 'distributed')
  const distributed = distributedOpportunities(db, session)
  const managed = managedOpportunities(db, session)
  const all = [...distributed, ...managed]
  const myRegs = db.dealRegistrations.filter(r => managed.some(o => o.id === r.opportunityId))

  // Close-date period scopes the at-a-glance card and the trends.
  const scoped = inPeriod(all, period)
  const scopedIds = new Set(scoped.map(o => o.id))
  const scopedRegs = myRegs.filter(r => scopedIds.has(r.opportunityId))
  const phrase = CLOSE_PERIODS.find(p => p.id === period)?.phrase ?? ''
  const scopedOpen = scoped.filter(o => !isClosed(o))
  const won = sumRevenue(scoped.filter(o => o.status === 'Won'))
  const lost = sumRevenue(scoped.filter(o => o.status === 'Lost'))

  // Deadlines are always "from today", independent of the period.
  const openAll = all.filter(o => !isClosed(o))
  const soonDistributed = distributed.filter(o => o.expiryDate && daysUntil(o.expiryDate) <= 7)
  const expiringRegs = myRegs.filter(r => r.status === 'Expiring')
  const closingSoon = managed
    .filter(o => !isClosed(o) && daysUntil(o.estCloseDate) <= 30)
    .sort((a, b) => a.estCloseDate.localeCompare(b.estCloseDate))

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
  const dueThisWeek = attention.filter(a => daysUntil(a.deadline) <= 7).length

  const figures: GlanceFigure[] = [
    { label: 'Total pipeline', value: formatCompactCurrency(sumRevenue(scoped)), hint: plural(scoped.length, 'opportunity', 'opportunities'), to: managedRoute({ status: 'all' }) },
    {
      label: 'Open pipeline',
      value: formatCompactCurrency(sumRevenue(scopedOpen)),
      hint: `${scopedOpen.length} open ${MIDDOT} ${scoped.length ? Math.round((sumRevenue(scopedOpen) / Math.max(1, sumRevenue(scoped))) * 100) : 0}% of total`,
      to: managedRoute(),
    },
    {
      label: 'Win rate',
      value: won + lost > 0 ? `${Math.round((won / (won + lost)) * 100)}%` : EM_DASH,
      hint: won + lost > 0 ? 'Won ÷ (won + lost), by revenue' : 'No won or lost opportunities yet',
      to: managedRoute({ status: 'won' }),
    },
    ...(canDistributed
      ? [{
          label: 'Awaiting acceptance',
          value: String(distributed.length),
          hint: `${soonDistributed.length} ${soonDistributed.length === 1 ? 'expires' : 'expire'} within 7 days`,
          to: OPP_ROUTES.distributed,
          warn: distributed.length > 0,
        }]
      : []),
    {
      label: 'Closing in 30 days',
      value: String(closingSoon.length),
      hint: `${formatCompactCurrency(sumRevenue(closingSoon))} in open opportunities`,
      to: managedRoute(),
      warn: closingSoon.length > 0,
    },
  ]

  const tabs: WorkTab[] = [
    ...(canDistributed
      ? [{
          id: 'distributed',
          label: 'Distributed to you',
          rows: [...distributed].sort((a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999')),
          hrefFor: (o: Opportunity) => OPP_ROUTES.summary(o.id),
          date: { header: 'Respond by', value: (o: Opportunity) => o.expiryDate },
          empty: 'There are no distributed opportunities waiting for you.',
          viewAll: { to: OPP_ROUTES.distributed, label: 'View all distributed opportunities' },
        }]
      : []),
    {
      id: 'closing',
      label: 'Closing in 30 days',
      rows: closingSoon,
      hrefFor: detailsRoute,
      date: { header: 'Close date', value: o => o.estCloseDate },
      empty: 'None of your open opportunities are due to close in the next 30 days.',
      viewAll: { to: managedRoute(), label: 'View all managed opportunities' },
    },
    {
      id: 'recent',
      label: 'Recently updated',
      rows: [...managed].sort((a, b) => b.modifiedOn.localeCompare(a.modifiedOn)),
      hrefFor: detailsRoute,
      date: { header: 'Close date', value: o => o.estCloseDate },
      empty: 'You have no managed opportunities yet.',
      viewAll: { to: managedRoute({ status: 'all' }), label: 'View all managed opportunities' },
    },
  ]

  const quickActions: QuickAction[] = [
    { label: 'Create opportunity', to: OPP_ROUTES.create, show: true, icon: <Add20Regular /> },
    { label: 'Review distributed opportunities', to: OPP_ROUTES.distributed, show: canDistributed, icon: <ArrowRouting20Regular /> },
    { label: 'Create customer account', to: '/customers/customer-accounts/create-customer-account/', show: can(session.role, 'customer-account:create'), icon: <PersonAdd20Regular /> },
    { label: 'Manage access', to: '/profile/manage-access/', show: can(session.role, 'manage-access'), icon: <ShieldPerson20Regular /> },
  ].filter(a => a.show)
  const [primaryAction, ...otherActions] = quickActions
  const inlineActions = isNarrow ? [] : otherActions.slice(0, 2)
  const overflowActions = isNarrow ? otherActions : otherActions.slice(2)

  const partnerName = db.accounts.find(a => a.id === session.partnerId)?.name

  if (mode === 'live' && load.status === 'loading') return <PageSkeleton variant="dashboard" />
  if (mode === 'live' && load.status === 'error') {
    return (
      <Container>
        <Alert tone="error">
          <p>{load.error ?? 'The data could not be loaded.'}</p>
          <div className="mt-3">
            <Button onClick={() => void load.reload()}>Try again</Button>
          </div>
        </Alert>
      </Container>
    )
  }

  return (
    <Container>
      <div className={styles.header}>
        <div>
          <Body1Strong as="p" className={styles.eyebrow}>
            {partnerName} {MIDDOT} {ROLE_LABELS[session.role]}
          </Body1Strong>
          <Title2 as="h1" className={styles.h1}>
            Welcome back, {session.contact?.firstName}
          </Title2>
          <Body1 as="p" className={styles.lead}>
            {dueThisWeek > 0 ? (
              <>
                You have <span className={styles.leadStrong}>{plural(dueThisWeek, 'deadline', 'deadlines')} this week</span> and{' '}
              </>
            ) : (
              'No deadlines this week. You have '
            )}
            <span className={styles.leadStrong}>{formatCompactCurrency(sumRevenue(openAll))}</span> in open pipeline
            {session.role === 'partner-seller' ? ', across opportunities assigned to you or shared with your organization.' : '.'}
          </Body1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to={primaryAction.to} variant="primary" icon={primaryAction.icon}>
            {primaryAction.label}
          </ButtonLink>
          {inlineActions.map(a => (
            <ButtonLink key={a.to} to={a.to} icon={a.icon}>
              {a.label}
            </ButtonLink>
          ))}
          {overflowActions.length > 0 && (
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <MenuButton icon={<MoreHorizontal20Regular />}>More actions</MenuButton>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  {overflowActions.map(a => (
                    <MenuItem {...preload(a.to)} key={a.to} icon={a.icon} onClick={() => navigate(a.to)}>
                      {a.label}
                    </MenuItem>
                  ))}
                </MenuList>
              </MenuPopover>
            </Menu>
          )}
        </div>
      </div>

      <PipelineGlance rows={scoped} regs={scopedRegs} period={period} onPeriodChange={setPeriod} figures={figures} canDistributed={canDistributed} />

      <div className={styles.work}>
        <AttentionPanel items={attention} />
        <WorkTabs tabs={tabs} />
      </div>

      <PipelineTrends rows={scoped} phrase={phrase} />
    </Container>
  )
}
