import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Body1,
  Body1Strong,
  Caption1,
  Radio,
  RadioGroup,
  Text,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components'
import {
  ArrowForward20Regular,
  ArrowSwap20Regular,
  ArrowUndo20Regular,
  Checkmark20Regular,
  CheckmarkCircle20Filled,
  Circle20Regular,
  Clock20Filled,
  Dismiss20Regular,
  DismissCircle20Filled,
  Send20Regular,
} from '@fluentui/react-icons'
import type { ApplicationStatus, Contact, PartnerApplication } from '../../data/types'
import { Container } from '../../components/Layout'
import { useFormGuard } from '../../components/UnsavedChanges'
import { Alert, AppLink, Button, PageHeader, Panel, StatusBadge } from '../../components/ui'
import { Checkbox, FieldList, FormField, FormSection, TextArea, TextInput, fieldErrors, requiredMessage, type FormError } from '../../components/forms'
import { formatDate, fullName, newId, todayIso } from '../../lib/format'
import { useApp } from '../../store/AppStore'
import { InlineFeedback } from '../../components/InlineFeedback'
import { useInlineFeedback } from '../../hooks/useInlineFeedback'
import { usePendingAction } from '../../hooks/usePendingAction'
import { PageSkeleton } from '../../components/skeletons'
import * as actions from '../../services/actions'
import { loadOwnContact } from '../../services/profile'
import { APPLICATION_REVIEW_TIME } from '../../lib/program'
import { errorFor, FormErrorSummary } from './partnerAdmin'
import { KEEP_NOTICE } from '../../lib/notice'

const EMPLOYEES = ['1-10', '11-50', '51-200', '201-1000', '1000+']
const GEOGRAPHIES = ['Asia/Pacific', 'Australia', 'North America', 'Europe', 'Middle East', 'Africa', 'South America']
const TITLE = 'Register to be a partner'

const useStyles = makeStyles({
  steps: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    margin: 0,
    padding: 0,
    listStyleType: 'none',
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    '@media (min-width: 640px)': { gridTemplateColumns: 'repeat(3, 1fr)' },
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    ...shorthands.padding(tokens.spacingVerticalL, tokens.spacingHorizontalL),
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    ':last-child': { borderBottom: 'none', borderInlineEndStyle: 'none' },
    '@media (min-width: 640px)': { borderBottom: 'none', borderInlineEndWidth: tokens.strokeWidthThin, borderInlineEndStyle: 'solid', borderInlineEndColor: tokens.colorNeutralStroke2 },
  },
  stepCurrent: { backgroundColor: tokens.colorBrandBackground2 },
  stepIcon: { display: 'inline-flex', flexShrink: 0, fontSize: '28px' },
  iconDone: { color: tokens.colorPaletteGreenForeground1 },
  iconCurrent: { color: tokens.colorBrandForeground1 },
  iconPending: { color: tokens.colorNeutralForeground3 },
  iconRejected: { color: tokens.colorPaletteRedForeground1 },
  stepText: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  stepLabel: { color: tokens.colorNeutralForeground1 },
  stepState: { color: tokens.colorNeutralForeground2 },
  fields: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', maxWidth: '40rem', rowGap: tokens.spacingVerticalL },
  about: { margin: `0 0 ${tokens.spacingVerticalM}`, color: tokens.colorNeutralForeground2 },
  geoFieldset: { border: 'none', margin: 0, padding: 0, minWidth: 0 },
  geoLegend: {
    padding: 0,
    marginBottom: tokens.spacingVerticalXS,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  optional: { fontWeight: tokens.fontWeightRegular, color: tokens.colorNeutralForeground2 },
  geoHint: { display: 'block', marginBottom: tokens.spacingVerticalS, color: tokens.colorNeutralForeground2 },
  footer: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalL,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  sim: {
    border: `${tokens.strokeWidthThin} dashed ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  simText: { display: 'block', margin: `0 0 ${tokens.spacingVerticalM}`, color: tokens.colorNeutralForeground2 },
  simPanel: { paddingBottom: tokens.spacingVerticalL },
})

export default function RegisterToBePartner() {
  const { session, mode, sessionReady } = useApp()
  const contact = session.contact
  if (mode === 'live' && !sessionReady) return <PageSkeleton variant="form" />
  return (
    <Container>
      <PageHeader
        title={TITLE}
        description="Apply to join the Zava partner program. Our partner team reviews every application."
        breadcrumbs={[{ label: 'Profile', to: '/profile/' }, { label: TITLE }]}
      />
      {!contact ? (
        <Alert tone="error">Your contact record could not be found.</Alert>
      ) : contact.application ? (
        <ApplicationTracker contact={contact} application={contact.application} />
      ) : (
        <ApplicationForm contact={contact} />
      )}
    </Container>
  )
}

const STEPS: ApplicationStatus[] = ['Submitted', 'Under Review', 'Approved']

function ApplicationTracker({ contact, application }: { contact: Contact; application: PartnerApplication }) {
  const { db, mode, mutate, signInAs, notify } = useApp()
  const live = mode === 'live'
  const navigate = useNavigate()
  const styles = useStyles()
  const status = application.status
  const finalLabel = status === 'Rejected' ? 'Rejected' : 'Approved'
  const steps = STEPS.map(s => (s === 'Approved' ? finalLabel : s))
  const currentIndex = status === 'Submitted' ? 0 : status === 'Under Review' ? 1 : 2
  const org = contact.parentAccountId ? db.accounts.find(a => a.id === contact.parentAccountId) : undefined
  const simulated = useInlineFeedback()
  const signInFeedback = useInlineFeedback()

  const setStatus = (next: ApplicationStatus) =>
    mutate(d => {
      const c = d.contacts.find(x => x.id === contact.id)
      if (c?.application) c.application.status = next
    })

  const approve = () => {
    mutate(d => {
      const c = d.contacts.find(x => x.id === contact.id)
      if (!c?.application) return
      const accountId = newId('acc')
      d.accounts.push({
        id: accountId,
        name: c.application.organizationName,
        website: c.application.website,
        email: c.email,
        phone: c.phone,
        description: c.application.competencies,
        address: {},
        primaryContactId: c.id,
        classification: 'Partner',
        active: true,
        createdOn: todayIso(),
      })
      c.partnerRole = 'Partner Admin'
      c.parentAccountId = accountId
      c.application.status = 'Approved'
    })
    simulated.show('Simulated: the application has been approved. The status above is updated.')
  }

  const reject = () => {
    setStatus('Rejected')
    simulated.show('Simulated: the application has been rejected. The status above is updated.', 'info')
  }

  const moveToReview = () => {
    setStatus('Under Review')
    simulated.show('Simulated: the application is now under review.', 'info')
  }

  const reapply = () =>
    mutate(d => {
      const c = d.contacts.find(x => x.id === contact.id)
      if (c) delete c.application
    })

  const stepState = (i: number, rejected: boolean) => {
    if (rejected) return 'Not approved'
    if (i < currentIndex || (i === currentIndex && i === 2)) return 'Completed'
    if (i === currentIndex) return 'In progress'
    return 'Not started'
  }

  return (
    <div className="space-y-6">
      {status === 'Approved' && (
        <Alert tone="success" title="Your application has been approved">
          <p>
            You are now a Partner Admin of <Text weight="semibold">{org?.name ?? application.organizationName}</Text>. You can administer your organization, its partner contacts and
            their access.
          </p>
          {!live && (
            <div className="mt-3">
              <Button
                variant="primary"
                icon={<ArrowSwap20Regular />}
                onClick={() => {
                  if (!signInAs(contact.id)) {
                    signInFeedback.show('This contact cannot sign in.', 'error')
                    return
                  }
                  notify(`Signed in as Partner Admin of ${org?.name ?? application.organizationName}.`)
                  navigate('/', KEEP_NOTICE)
                }}
              >
                Sign in as Partner Admin of {org?.name ?? application.organizationName}
              </Button>
              <InlineFeedback feedback={signInFeedback.feedback} className="mt-2" />
            </div>
          )}
        </Alert>
      )}
      {status === 'Rejected' && (
        <Alert tone="error" title="Your application was not approved">
          <p>Your account remains a Non-Partner Portal User account. You can update your details and apply again.</p>
          <div className="mt-3">
            <Button icon={<ArrowUndo20Regular />} onClick={reapply}>
              Apply again
            </Button>
          </div>
        </Alert>
      )}
      {(status === 'Submitted' || status === 'Under Review') && (
        <Alert tone="success" title="Application submitted">
          <p>
            {live ? (
              <>Example review time: {APPLICATION_REVIEW_TIME}. Our partner team reviews your application. Return here to check its status.</>
            ) : (
              <>
                Example review time: {APPLICATION_REVIEW_TIME}. This prototype does not send emails or process applications.
                Use the prototype controls below to explore review and approval, or return here to view your application.
              </>
            )}
          </p>
        </Alert>
      )}

      <Panel title="Application status">
        <ol className={styles.steps} aria-label="Application progress">
          {steps.map((s, i) => {
            const current = i === currentIndex
            const rejected = s === 'Rejected' && current
            const state = stepState(i, rejected)
            const icon = rejected ? (
              <DismissCircle20Filled className={styles.iconRejected} />
            ) : state === 'Completed' ? (
              <CheckmarkCircle20Filled className={styles.iconDone} />
            ) : state === 'In progress' ? (
              <Clock20Filled className={styles.iconCurrent} />
            ) : (
              <Circle20Regular className={styles.iconPending} />
            )
            return (
              <li key={s} aria-current={current ? 'step' : undefined} className={mergeClasses(styles.step, current && styles.stepCurrent)}>
                <span className={styles.stepIcon} aria-hidden="true">
                  {icon}
                </span>
                <span className={styles.stepText}>
                  <Body1Strong className={styles.stepLabel}>{s}</Body1Strong>
                  <Caption1 className={styles.stepState}>{state}</Caption1>
                </span>
              </li>
            )
          })}
        </ol>
      </Panel>

      <Panel title="Your application" actions={<StatusBadge status={status} />}>
        <FieldList
          hideEmpty
          items={[
            { label: 'Submitted on', value: formatDate(application.submittedOn) },
            { label: 'Name', value: fullName(contact) },
            { label: 'Email', value: contact.email },
            { label: 'Organization name', value: application.organizationName },
            { label: 'Website', value: application.website },
            { label: 'Number of employees', value: application.numberOfEmployees },
            { label: 'Competencies', value: application.competencies },
            { label: 'Target markets', value: application.targetMarket },
            { label: 'Technologies you cover', value: application.technologies },
            { label: 'Geographies covered', value: application.geographies.join(', ') },
          ]}
        />
      </Panel>

      {!live && (
        <Accordion collapsible className={styles.sim}>
        <AccordionItem value="sim">
          <AccordionHeader as="h2">Prototype controls</AccordionHeader>
          <AccordionPanel className={styles.simPanel}>
            <Caption1 as="p" className={styles.simText}>
              These controls simulate the back-office review and are not part of the real portal.
            </Caption1>
            <div className="flex flex-wrap gap-2">
              <Button icon={<ArrowForward20Regular />} onClick={moveToReview} disabled={status !== 'Submitted'}>
                Simulate: move to Under Review
              </Button>
              <Button icon={<Checkmark20Regular />} onClick={approve} disabled={status !== 'Submitted' && status !== 'Under Review'}>
                Simulate: approve
              </Button>
              <Button icon={<Dismiss20Regular />} onClick={reject} disabled={status !== 'Submitted' && status !== 'Under Review'}>
                Simulate: reject
              </Button>
            </div>
            <InlineFeedback feedback={simulated.feedback} className="mt-3" />
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
      )}
    </div>
  )
}

function ApplicationForm({ contact }: { contact: Contact }) {
  const { perform, applyPatch } = useApp()
  const styles = useStyles()
  const [f, setF] = useState({ organizationName: '', website: '', numberOfEmployees: '', competencies: '', targetMarket: '', technologies: '' })
  const [geos, setGeos] = useState<string[]>([])
  const guard = useFormGuard({ f, geos }, 'Partner application')
  const [errors, setErrors] = useState<FormError[]>([])
  const submitting = usePendingAction()
  const setField = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(s => ({ ...s, [k]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const website = f.website.trim()
    const errs = fieldErrors({
      'app-org': !f.organizationName.trim() && requiredMessage('Organization name'),
      'app-website': !website ? 'Enter your organization’s website' : !/^\S+\.\S+$/.test(website) && 'Enter a website address, like https://contoso.com',
      'app-competencies': !f.competencies.trim() && 'Enter your competencies',
    })
    setErrors(errs)
    if (errs.length) return
    const opt = (v: string) => v.trim() || undefined
    const application: PartnerApplication = {
      status: 'Submitted',
      submittedOn: todayIso(),
      organizationName: f.organizationName.trim(),
      website,
      numberOfEmployees: opt(f.numberOfEmployees),
      competencies: opt(f.competencies),
      targetMarket: opt(f.targetMarket),
      technologies: opt(f.technologies),
      geographies: geos,
    }
    const ok = await perform({
      mock: d => {
        const t = d.contacts.find(x => x.id === contact.id)
        if (!t) return
        t.application = application
      },
      live: () => actions.submitApplication(contact.id, application),
      refresh: async () => {
        const patch = await loadOwnContact(contact.id)
        // The status is set server-side; until it is readable, show the submitted application.
        for (const c of patch.contacts ?? []) if (!c.application) c.application = application
        applyPatch(patch)
      },
    })
    if (!ok) return
    guard.markSaved()
    window.scrollTo({ top: 0 })
  }

  return (
    <form onSubmit={e => { e.preventDefault(); void submitting.run(() => onSubmit(e)) }} noValidate className="max-w-3xl">
      <FormErrorSummary errors={errors} />
      <Panel title="Partner application">
        <FormSection title="About you">
          <Body1 as="p" className={styles.about}>
            We&apos;ll include these details from your profile.{' '}
            <AppLink to="/profile/" inline>
              Update your profile
            </AppLink>{' '}
            if anything has changed.
          </Body1>
          <FieldList
            items={[
              { label: 'Name', value: fullName(contact) },
              { label: 'Job title', value: contact.jobTitle },
              { label: 'Email', value: contact.email },
              { label: 'Phone', value: contact.phone },
            ]}
          />
        </FormSection>
        <FormSection title="Your organization">
          <div className={styles.fields}>
            <FormField id="app-org" label="Organization name" required error={errorFor(errors, 'app-org')}>
              <TextInput id="app-org" autoComplete="organization" value={f.organizationName} onChange={setField('organizationName')} />
            </FormField>
            <FormField id="app-website" label="Website" required hint="For example, https://contoso.com" error={errorFor(errors, 'app-website')}>
              <TextInput id="app-website" type="url" autoComplete="url" value={f.website} onChange={setField('website')} />
            </FormField>
            <FormField id="app-employees" label="Number of employees" optional>
              <RadioGroup id="app-employees" value={f.numberOfEmployees} onChange={(_, data) => setF(s => ({ ...s, numberOfEmployees: data.value }))}>
                {EMPLOYEES.map(n => (
                  <Radio key={n} value={n} label={n} />
                ))}
              </RadioGroup>
            </FormField>
            <FormField
              id="app-competencies"
              label="Competencies"
              required
              hint="What your organization specializes in, for example cloud migration, security or data analytics."
              error={errorFor(errors, 'app-competencies')}
            >
              <TextArea id="app-competencies" value={f.competencies} onChange={setField('competencies')} />
            </FormField>
            <FormField id="app-target" label="Target markets" optional hint="The industries or types of customer you sell to.">
              <TextInput id="app-target" value={f.targetMarket} onChange={setField('targetMarket')} />
            </FormField>
            <FormField id="app-tech" label="Technologies you cover" optional hint="The products and technologies your team sells or supports.">
              <TextArea id="app-tech" rows={3} value={f.technologies} onChange={setField('technologies')} />
            </FormField>
            <fieldset className={styles.geoFieldset}>
              <legend className={styles.geoLegend}>
                Geographies covered<span className={styles.optional}> (optional)</span>
              </legend>
              <Caption1 className={styles.geoHint}>Select all regions where you sell or deliver services.</Caption1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-4">
                {GEOGRAPHIES.map(g => (
                  <Checkbox
                    key={g}
                    id={`geo-${g.replace(/[^a-z]/gi, '').toLowerCase()}`}
                    label={g}
                    checked={geos.includes(g)}
                    onChange={v => setGeos(list => (v ? [...list, g] : list.filter(x => x !== g)))}
                  />
                ))}
              </div>
            </fieldset>
          </div>
        </FormSection>
        <div className={styles.footer}>
          <Button type="submit" variant="primary" icon={<Send20Regular />} pending={submitting.pending} pendingLabel="Submitting…">
            Submit application
          </Button>
        </div>
      </Panel>
      {guard.dialog}
    </form>
  )
}
