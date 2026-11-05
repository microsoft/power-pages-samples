import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Body1,
  Card,
  Subtitle2,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components'
import { ArrowRight16Regular, DocumentText20Regular, PersonAdd20Regular, QuestionCircle20Regular } from '@fluentui/react-icons'
import type { ReactElement } from 'react'
import { Container } from '../../components/Layout'
import { AppLink, Breadcrumbs, ButtonLink, StatusBadge, usePageTitle } from '../../components/ui'
import { useApp } from '../../store/AppStore'
import { PARTNER_ROLES, ROLE_LABELS, can, distributedOpportunities, isPartnerOrgRole, managedOpportunities } from '../../lib/access'
import { formatCompactCurrency, formatDate } from '../../lib/format'
import { APPLICATION_REVIEW_TIME, CRITERIA, FAQS, TIER_BENEFITS, TIERS, type TierCell } from '../../lib/program'
import { loadDashboard } from '../../services/loaders'
import { useLiveLoad } from '../../services/useLiveLoad'
import { FigureStrip, type GlanceFigure } from '../home/PipelineGlance'
import { isClosed, sumRevenue } from '../home/pipeline'
import { ACTIVE_REG_STATUSES, OPP_ROUTES, managedRoute } from '../opportunities/oppUtils'
import { LinkCard, PROGRAM_STATS, ProgramHero, SectionTitle, useOnNavyButtonStyles } from './ProgramHero'

const DETAILS = '/partner-program/partner-program-details/'
const APPLY = '/partner-program/become-a-partner/'
const FAQS_URL = '/partner-program/partner-program-FAQs/'
const REGISTER = '/profile/register-to-be-a-partner/'
const MIDDOT = '\u00B7'
const FAQ_PREVIEW = 3

const HOW_IT_WORKS: { title: string; desc: string }[] = [
  { title: 'Apply', desc: 'Sign in or create an account, then submit the partner registration for your organization.' },
  { title: 'Get approved', desc: `Zava reviews your application (example review time: ${APPLICATION_REVIEW_TIME}). Approval makes you the Partner Admin.` },
  { title: 'Start selling', desc: 'Receive distributed opportunities, register the deals you source and manage your customers in the portal.' },
]

const useStyles = makeStyles({
  highlights: { margin: 0, marginBottom: tokens.spacingVerticalXXXL, rowGap: tokens.spacingVerticalL },
  label: {
    display: 'block',
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
  },
  value: {
    margin: 0,
    marginTop: tokens.spacingVerticalXXS,
    fontSize: tokens.fontSizeBase600,
    lineHeight: tokens.lineHeightBase600,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  section: { marginBottom: tokens.spacingVerticalXXXL },
  band: { ...shorthands.padding('0'), rowGap: '0', marginBottom: tokens.spacingVerticalXXXL },
  bandHead: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalXL),
    '@media (max-width: 639.98px)': { ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL) },
  },
  bandTitle: { display: 'block', margin: 0, color: tokens.colorNeutralForeground1 },
  muted: { display: 'block', margin: 0, color: tokens.colorNeutralForeground2 },
  application: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalL,
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalXL),
    marginBottom: tokens.spacingVerticalXXXL,
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
  stepTitle: { display: 'block', margin: 0, color: tokens.colorNeutralForeground1 },
  tier: { height: '100%', rowGap: tokens.spacingVerticalS, ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL) },
  tierAccent: { borderTop: `${tokens.strokeWidthThickest} solid ${tokens.colorBrandStroke1}` },
  tierFacts: { display: 'grid', rowGap: tokens.spacingVerticalXS, margin: 0 },
  tierLabel: { display: 'block', fontSize: tokens.fontSizeBase200, lineHeight: tokens.lineHeightBase200, color: tokens.colorNeutralForeground2 },
  tierValue: { display: 'block', margin: 0, fontWeight: tokens.fontWeightSemibold, color: tokens.colorNeutralForeground1 },
  sectionHead: { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', columnGap: tokens.spacingHorizontalL },
  moreLink: { display: 'inline-flex', alignItems: 'center', gap: tokens.spacingHorizontalXS, minHeight: '32px', marginBottom: tokens.spacingVerticalM },
  faqCard: { ...shorthands.padding('0'), rowGap: '0' },
  faqItem: { ':not(:last-child)': { borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}` } },
  faqHeader: { margin: 0 },
  faqButton: { minHeight: '52px', fontWeight: tokens.fontWeightSemibold, color: tokens.colorNeutralForeground1 },
  faqAnswer: { display: 'block', margin: 0, ...shorthands.padding(0, tokens.spacingHorizontalM, tokens.spacingVerticalL), color: tokens.colorNeutralForeground2, maxWidth: '70ch' },
})

const cellText = (v: TierCell | undefined) => (v === true ? 'Included' : v === false || v === undefined ? 'Not included' : v)

export default function ProgramHome() {
  usePageTitle('Partner program')
  const { session } = useApp()
  const styles = useStyles()
  const onNavy = useOnNavyButtonStyles()
  const isPartner = PARTNER_ROLES.includes(session.role)
  const member = isPartnerOrgRole(session.role)
  const nonPartner = session.role === 'non-partner'
  const application = nonPartner ? session.contact?.application : undefined

  // Partners already belong to the program: point them at their benefits instead of the application journey.
  const cards: { to: string; title: string; desc: string; cta: string; icon: ReactElement }[] = [
    {
      to: DETAILS,
      title: 'Program details',
      desc: 'Compare the Registered, Silver, Gold and Specialist tiers, their criteria, benefits and partner responsibilities.',
      cta: 'View program details',
      icon: <DocumentText20Regular />,
    },
    ...(member
      ? []
      : [{
          to: nonPartner ? REGISTER : APPLY,
          title: nonPartner ? (application ? 'Your partner application' : 'Register to be a partner') : 'Become a partner',
          desc: nonPartner
            ? application
              ? 'Check the status of the application you submitted for your organization.'
              : 'Tell us about your organization. Approval makes your company a partner and you its Partner Admin.'
            : 'See how to apply, what happens after you submit your application and how approval assigns your Partner Admin.',
          cta: nonPartner ? (application ? 'View your application' : 'Start your registration') : 'Start your application',
          icon: <PersonAdd20Regular />,
        }]),
    {
      to: FAQS_URL,
      title: 'Frequently asked questions',
      desc: 'Deal registration, distributed opportunities and partner roles explained.',
      cta: 'Read the FAQs',
      icon: <QuestionCircle20Regular />,
    },
  ]

  const heroActions = member ? (
    <>
      <ButtonLink to={DETAILS} variant="primary">
        View tier benefits
      </ButtonLink>
      <ButtonLink to={FAQS_URL} className={onNavy.outline}>
        Read the FAQs
      </ButtonLink>
    </>
  ) : (
    <>
      <ButtonLink to={nonPartner ? REGISTER : APPLY} variant="primary">
        {application ? 'View your application' : nonPartner ? 'Register to be a partner' : 'Become a partner'}
      </ButtonLink>
      <ButtonLink to={FAQS_URL} className={onNavy.outline}>
        Read the FAQs
      </ButtonLink>
    </>
  )

  return (
    <Container>
      <div className="mb-4">
        <Breadcrumbs items={[{ label: 'Partner program' }]} />
      </div>

      <ProgramHero
        headingLevel="h1"
        eyebrow="Zava Partner Program"
        title="Grow your business with Zava."
        imageId="1522071820081-009f0129c71c"
        alt="A team of colleagues collaborating around laptops"
        actions={heroActions}
      >
        <p>
          Receive qualified opportunities distributed by Zava, protect the deals you source with registration, and unlock co-marketing funds, technical enablement and partner support as you
          grow through the program tiers.
        </p>
      </ProgramHero>

      <dl className={`grid grid-cols-2 md:grid-cols-4 gap-x-6 ${styles.highlights}`}>
        {PROGRAM_STATS.map(h => (
          <div key={h.label} className="flex flex-col-reverse justify-end">
            <dt className={styles.label}>{h.label}</dt>
            <dd className={styles.value}>{h.value}</dd>
          </div>
        ))}
      </dl>

      {isPartner && <PartnershipBand />}

      {application && (
        <section aria-labelledby="application-heading">
          <Card className={styles.application}>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <Subtitle2 as="h2" id="application-heading" className={styles.bandTitle}>
                  Your partner application
                </Subtitle2>
                <StatusBadge status={application.status} />
              </div>
              <Body1 as="p" className={styles.muted}>
                Submitted {formatDate(application.submittedOn)} for {application.organizationName}. Example review time: {APPLICATION_REVIEW_TIME}.
              </Body1>
            </div>
            <ButtonLink to={REGISTER}>View your application</ButtonLink>
          </Card>
        </section>
      )}

      {!member && !application && (
        <section aria-labelledby="how-heading" className={styles.section}>
          <SectionTitle eyebrow="How it works" title="From application to your first opportunity" id="how-heading" />
          <ol className="grid md:grid-cols-3 gap-x-8 gap-y-6">
            {HOW_IT_WORKS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span aria-hidden="true" className={styles.stepNumber}>
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <Subtitle2 as="h3" className={styles.stepTitle}>
                    <span className="sr-only">Step {i + 1}: </span>
                    {s.title}
                  </Subtitle2>
                  <Body1 as="p" className={styles.muted}>
                    {s.desc}
                  </Body1>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <TierPreview />

      <section aria-labelledby="resources-heading" className={styles.section}>
        <SectionTitle title={member ? 'Program resources' : 'Everything you need to join and succeed'} id="resources-heading" />
        <ul className={`grid grid-cols-1 gap-4 ${cards.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {cards.map(c => (
            <li key={c.to}>
              <LinkCard to={c.to} title={c.title} desc={c.desc} cta={c.cta} icon={c.icon} titleSize="lg" />
            </li>
          ))}
        </ul>
      </section>

      <FaqPreview />
    </Container>
  )
}

/** Partner's own program activity: registrations protect deals, distributed leads arrive through the program. */
function PartnershipBand() {
  const { db, session } = useApp()
  const styles = useStyles()
  const load = useLiveLoad('program:partnership', signal => loadDashboard('rows', signal))
  const canDistributed = can(session.role, 'distributed')
  const distributed = distributedOpportunities(db, session)
  const managed = managedOpportunities(db, session)
  const ids = new Set(managed.map(o => o.id))
  const regs = db.dealRegistrations.filter(r => ids.has(r.opportunityId))
  const active = regs.filter(r => ACTIVE_REG_STATUSES.has(r.status))
  const expiring = regs.filter(r => r.status === 'Expiring')
  const won = managed.filter(o => o.status === 'Won')
  const partnerName = db.accounts.find(a => a.id === session.partnerId)?.name

  if (load.status !== 'ready') return null

  const figures: GlanceFigure[] = [
    {
      label: 'Protected deals',
      value: String(active.length),
      hint: expiring.length ? `${expiring.length} registration${expiring.length === 1 ? '' : 's'} expiring` : 'Active deal registrations',
      to: managedRoute(),
      warn: expiring.length > 0,
    },
    ...(canDistributed
      ? [{ label: 'Distributed to you', value: String(distributed.length), hint: 'Leads awaiting your response', to: OPP_ROUTES.distributed }]
      : []),
    { label: 'Open pipeline', value: formatCompactCurrency(sumRevenue(managed.filter(o => !isClosed(o)))), hint: 'Managed opportunities', to: managedRoute() },
    { label: 'Won revenue', value: formatCompactCurrency(sumRevenue(won)), hint: `${won.length} won ${won.length === 1 ? 'opportunity' : 'opportunities'}`, to: managedRoute({ status: 'won' }) },
  ]

  return (
    <section aria-labelledby="partnership-heading">
      <Card className={styles.band}>
        <div className={styles.bandHead}>
          <div className="min-w-0">
            <Subtitle2 as="h2" id="partnership-heading" className={styles.bandTitle}>
              Your partnership
            </Subtitle2>
            <Body1 as="p" className={styles.muted}>
              {partnerName ?? 'Your organization'} {MIDDOT} signed in as {ROLE_LABELS[session.role]}
            </Body1>
          </div>
          <div className="flex flex-wrap gap-x-4">
            {can(session.role, 'parent-account') && <AppLink to="/profile/parent-account/">Parent account</AppLink>}
            {can(session.role, 'manage-access') && <AppLink to="/profile/manage-access/">Manage access</AppLink>}
          </div>
        </div>
        <FigureStrip figures={figures} label="Partnership summary" />
      </Card>
    </section>
  )
}

function TierPreview() {
  const styles = useStyles()
  const funds = TIER_BENEFITS.find(b => b.label === 'Co-marketing funds')
  const facts = (i: number) => [
    { label: CRITERIA[0].label, value: cellText(CRITERIA[0].values[i]) },
    { label: CRITERIA[1].label, value: cellText(CRITERIA[1].values[i]) },
    { label: 'Co-marketing funds', value: cellText(funds?.values[i]) },
  ]
  return (
    <section aria-labelledby="tiers-heading" className={styles.section}>
      <div className={styles.sectionHead}>
        <SectionTitle eyebrow="Program tiers" title="Grow through four partner tiers" id="tiers-heading" />
        <AppLink to={DETAILS} className={styles.moreLink}>
          Compare all tier benefits <ArrowRight16Regular aria-hidden="true" />
        </AppLink>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TIERS.map((t, i) => (
          <li key={t}>
            <Card className={mergeClasses(styles.tier, styles.tierAccent)}>
              <Subtitle2 as="h3" className={styles.bandTitle}>
                {t}
              </Subtitle2>
              <dl className={styles.tierFacts}>
                {facts(i).map(f => (
                  <div key={f.label}>
                    <dt className={styles.tierLabel}>{f.label}</dt>
                    <dd className={styles.tierValue}>{f.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}

function FaqPreview() {
  const styles = useStyles()
  return (
    <section aria-labelledby="faq-preview-heading" className={styles.section}>
      <div className={styles.sectionHead}>
        <SectionTitle eyebrow="Questions" title="Popular questions" id="faq-preview-heading" />
        <AppLink to={FAQS_URL} className={styles.moreLink}>
          See all {FAQS.length} questions <ArrowRight16Regular aria-hidden="true" />
        </AppLink>
      </div>
      <Card className={styles.faqCard}>
        <Accordion collapsible multiple>
          {FAQS.slice(0, FAQ_PREVIEW).map((f, i) => (
            <AccordionItem key={f.q} value={i} className={styles.faqItem}>
              <AccordionHeader as="h3" expandIconPosition="end" className={styles.faqHeader} button={{ className: styles.faqButton }}>
                {f.q}
              </AccordionHeader>
              <AccordionPanel>
                <Body1 as="p" className={styles.faqAnswer}>
                  {f.a}
                </Body1>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
    </section>
  )
}
