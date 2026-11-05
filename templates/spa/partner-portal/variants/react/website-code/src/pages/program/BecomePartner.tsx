import { Body1, Subtitle2, makeStyles, mergeClasses, tokens } from '@fluentui/react-components'
import { Form20Regular, Person20Regular, PersonAdd20Regular } from '@fluentui/react-icons'
import { APPLICATION_REVIEW_TIME } from '../../lib/program'
import { Container } from '../../components/Layout'
import { Alert, AppLink, ButtonLink, PageHeader, Panel, StatusBadge } from '../../components/ui'
import { useApp } from '../../store/AppStore'
import { isPartnerOrgRole, ROLE_LABELS } from '../../lib/access'
import { formatDate } from '../../lib/format'
import { PROGRAM_CRUMB, SectionTitle } from './ProgramHero'

const STEPS: { title: string; desc: string }[] = [
  {
    title: 'Sign in or create an account',
    desc: 'Sign in with Microsoft Entra ID or a local account, or create a new portal account. New accounts start as a Non-Partner Portal User.',
  },
  {
    title: 'Complete “Register to be a partner”',
    desc: 'Open Register to be a partner from your profile menu. Tell us your organization name, website, number of employees, competencies, target market, technologies and geographies.',
  },
]

const NEXT: { title: string; desc: string }[] = [
  { title: 'Submitted', desc: 'Your application is recorded with the date you sent it. You can review it from your profile at any time.' },
  { title: 'Under review', desc: `Example review time: ${APPLICATION_REVIEW_TIME}. In this prototype, review progress is simulated on your application page; no emails are sent.` },
  {
    title: 'Approved or rejected',
    desc: 'If approved, your organization becomes a partner account and you get the Partner Admin role, so you can invite colleagues. If rejected, you stay a Non-Partner Portal User and can see the decision on your application in your profile.',
  },
]

const useStyles = makeStyles({
  steps: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXL, margin: 0, padding: 0, listStyleType: 'none' },
  step: { display: 'flex', gap: tokens.spacingHorizontalL },
  number: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '32px',
    height: '32px',
    borderRadius: tokens.borderRadiusCircular,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  stepTitle: { display: 'block', margin: 0, paddingTop: '4px', color: tokens.colorNeutralForeground1 },
  stepDesc: { display: 'block', margin: 0, marginTop: tokens.spacingVerticalXS, maxWidth: '65ch', fontSize: tokens.fontSizeBase400, lineHeight: tokens.lineHeightBase400, color: tokens.colorNeutralForeground1 },
  timeline: { margin: 0, padding: 0, listStyleType: 'none' },
  state: {
    position: 'relative',
    paddingInlineStart: tokens.spacingHorizontalXXL,
    paddingBottom: tokens.spacingVerticalL,
    '::before': {
      content: '""',
      position: 'absolute',
      left: '5px',
      top: '6px',
      width: '10px',
      height: '10px',
      borderRadius: tokens.borderRadiusCircular,
      backgroundColor: tokens.colorNeutralForeground3,
    },
    ':not(:last-child)::after': {
      content: '""',
      position: 'absolute',
      left: '9px',
      top: '20px',
      bottom: '0',
      width: tokens.strokeWidthThick,
      backgroundColor: tokens.colorNeutralStroke2,
    },
  },
  stateTitle: { display: 'block', margin: 0, color: tokens.colorNeutralForeground1 },
  muted: { display: 'block', margin: 0, color: tokens.colorNeutralForeground2 },
  list: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalS, listStyleType: 'disc', paddingInlineStart: tokens.spacingHorizontalXL, margin: 0 },
})

function ApplyCta() {
  const { session } = useApp()
  const styles = useStyles()
  const { role, contact } = session

  if (isPartnerOrgRole(role)) {
    return (
      <Alert tone="success" title="You’re already a partner">
        <p>
          You’re signed in as a {ROLE_LABELS[role]}. Visit your{' '}
          <AppLink to="/" inline>
            partner dashboard
          </AppLink>{' '}
          to manage opportunities and customers.
        </p>
      </Alert>
    )
  }

  if (role === 'non-partner') {
    const app = contact?.application
    return (
      <div className="space-y-4">
        {app ? (
          <Alert tone={app.status === 'Rejected' ? 'warning' : 'info'} title="Your partner application">
            <p className="flex flex-wrap items-center gap-2">
              Submitted on {formatDate(app.submittedOn)} for {app.organizationName}. Current status: <StatusBadge status={app.status} />
            </p>
          </Alert>
        ) : (
          <Body1 as="p" className={styles.muted}>
            You’re signed in. Complete the partner registration form to submit your application.
          </Body1>
        )}
        <ButtonLink to="/profile/register-to-be-a-partner/" variant="primary" icon={<Form20Regular />}>
          {app ? 'View your application' : 'Register to be a partner'}
        </ButtonLink>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Body1 as="p" className={styles.muted}>
        Sign in to your portal account, or create one, to start your partner application.
      </Body1>
      <div className="flex flex-wrap gap-2">
        <ButtonLink to={`/login?ReturnUrl=${encodeURIComponent('/profile/register-to-be-a-partner/')}`} variant="primary" icon={<Person20Regular />}>
          Sign in
        </ButtonLink>
        <ButtonLink to="/registration" icon={<PersonAdd20Regular />}>
          Create account
        </ButtonLink>
      </div>
    </div>
  )
}

export default function BecomePartner() {
  const styles = useStyles()
  return (
    <Container>
      <PageHeader
        title="Become a partner"
        description="Apply to the Zava Partner Program. Once approved, you get distributed opportunities, deal registration, co-marketing funds and partner support."
        breadcrumbs={[PROGRAM_CRUMB, { label: 'Become a partner' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="space-y-6 lg:order-last">
          <Panel title="Start your application">
            <ApplyCta />
          </Panel>
          <Panel title="Before you apply">
            <ul className={styles.list}>
              <li>
                <Body1>
                  Review the{' '}
                  <AppLink to="/partner-program/partner-program-details/" inline>
                    tier criteria and benefits
                  </AppLink>
                </Body1>
              </li>
              <li>
                <Body1>
                  Read the{' '}
                  <AppLink to="/partner-program/partner-program-FAQs/" inline>
                    frequently asked questions
                  </AppLink>
                </Body1>
              </li>
            </ul>
          </Panel>
        </div>

        <div className="lg:col-span-2 space-y-10">
          <section aria-labelledby="steps-heading">
            <SectionTitle id="steps-heading" title="How to apply" />
            <ol className={styles.steps}>
              {STEPS.map((s, i) => (
                <li key={s.title} className={styles.step}>
                  <span aria-hidden="true" className={styles.number}>
                    {i + 1}
                  </span>
                  <div>
                    <Subtitle2 as="h3" className={styles.stepTitle}>
                      <span className="sr-only">Step {i + 1}: </span>
                      {s.title}
                    </Subtitle2>
                    <Body1 as="p" className={styles.stepDesc}>
                      {s.desc}
                    </Body1>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="next-heading">
            <SectionTitle id="next-heading" title="What happens next" />
            <ol className={styles.timeline}>
              {NEXT.map(s => (
                <li key={s.title} className={styles.state}>
                  <Subtitle2 as="h3" className={styles.stateTitle}>
                    {s.title}
                  </Subtitle2>
                  <Body1 as="p" className={mergeClasses(styles.stepDesc)}>
                    {s.desc}
                  </Body1>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </Container>
  )
}
