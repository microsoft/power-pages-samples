import { useState, type FormEvent } from 'react'
import { Card, Persona, makeStyles, tokens } from '@fluentui/react-components'
import { Save20Regular } from '@fluentui/react-icons'
import type { Contact } from '../../data/types'
import { Container } from '../../components/Layout'
import { useFormGuard } from '../../components/UnsavedChanges'
import { Alert, AppLink, Button, PageHeader, Panel, RoleText } from '../../components/ui'
import { Checkbox, FieldList, FormField, FormSection, PHONE_HINT, ReadOnlyField, TextInput, requiredFieldErrors, type FormError } from '../../components/forms'
import { ROLE_LABELS } from '../../lib/access'
import { fullName } from '../../lib/format'
import { useApp } from '../../store/AppStore'
import { PageSkeleton } from '../../components/skeletons'
import * as actions from '../../services/actions'
import { loadOwnContact } from '../../services/profile'
import { SecurityNav } from '../account/authShared'
import { errorFor, FormErrorSummary } from './partnerAdmin'
import { InlineFeedback } from '../../components/InlineFeedback'
import { useInlineFeedback } from '../../hooks/useInlineFeedback'
import { usePendingAction } from '../../hooks/usePendingAction'

const useStyles = makeStyles({
  summary: { padding: tokens.spacingHorizontalXL },
  summaryList: { marginTop: tokens.spacingVerticalM },
  fields: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', maxWidth: '40rem', rowGap: tokens.spacingVerticalL, marginBottom: tokens.spacingVerticalXXL },
  email: { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: tokens.spacingHorizontalM, rowGap: tokens.spacingVerticalXXS },
  prefsHint: { margin: `0 0 ${tokens.spacingVerticalM}`, color: tokens.colorNeutralForeground2 },
  footer: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    paddingTop: tokens.spacingVerticalL,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
})

const PREFS = [
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['fax', 'Fax'],
  ['mail', 'Mail'],
] as const

export default function Profile() {
  const { db, session, mode, sessionReady } = useApp()
  const contact = session.contact
  const org = contact?.parentAccountId ? db.accounts.find(a => a.id === contact.parentAccountId) : undefined
  const roleLabel = contact?.partnerRole ?? ROLE_LABELS[session.role]
  const styles = useStyles()
  if (mode === 'live' && !sessionReady) return <PageSkeleton variant="settings" />

  return (
    <Container>
      <PageHeader title="Profile" description="Manage your personal information and how we contact you." breadcrumbs={[{ label: 'Profile' }]} />
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        <div className="space-y-4">
          <Card role="region" aria-label="Your account summary" className={styles.summary}>
            <Persona
              name={fullName(contact)}
              secondaryText={contact?.jobTitle ?? '—'}
              size="large"
              avatar={{ color: 'brand', 'aria-hidden': true }}
              textAlignment="center"
            />
            <FieldList
              className={styles.summaryList}
              items={[
                { label: 'Role', value: <RoleText role={roleLabel} /> },
                { label: 'Partner organization', value: org ? org.name : 'Not a partner organization yet' },
              ]}
            />
          </Card>
          <SecurityNav />
        </div>
        {contact ? <ProfileForm key={contact.id} contact={contact} /> : <Alert tone="error">Your contact record could not be found.</Alert>}
      </div>
    </Container>
  )
}

function ProfileForm({ contact }: { contact: Contact }) {
  const { perform, applyPatch } = useApp()
  const styles = useStyles()
  const [f, setF] = useState({
    firstName: contact.firstName,
    lastName: contact.lastName,
    jobTitle: contact.jobTitle ?? '',
    phone: contact.phone ?? '',
    mobile: contact.mobile ?? '',
  })
  const [prefs, setPrefs] = useState(contact.preferences ?? { email: false, phone: false, fax: false, mail: false })
  const [errors, setErrors] = useState<FormError[]>([])
  const guard = useFormGuard({ f, prefs }, 'Profile')
  const saved = useInlineFeedback({ f, prefs })
  const saving = usePendingAction()
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(s => ({ ...s, [k]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = requiredFieldErrors([['Last name', f.lastName, 'pf-last']])
    setErrors(errs)
    if (errs.length) return
    const ok = await perform({
      mock: d => {
        const c = d.contacts.find(x => x.id === contact.id)
        if (!c) return
        c.firstName = f.firstName.trim()
        c.lastName = f.lastName.trim()
        c.jobTitle = f.jobTitle.trim() || undefined
        c.phone = f.phone.trim() || undefined
        c.mobile = f.mobile.trim() || undefined
        c.preferences = prefs
      },
      live: () => actions.updateContact(contact.id, { ...f, preferences: prefs }),
      refresh: async () => applyPatch(await loadOwnContact(contact.id)),
    })
    if (!ok) return
    saved.show('Your profile has been saved.')
    guard.markSaved()
  }

  return (
    <form onSubmit={e => { e.preventDefault(); void saving.run(() => onSubmit(e)) }} noValidate className="max-w-3xl">
      <FormErrorSummary errors={errors} />
      <Panel title="Your details">
        <div className={styles.fields}>
          <FormField id="pf-first" label="First name" optional>
            <TextInput id="pf-first" autoComplete="given-name" value={f.firstName} onChange={set('firstName')} />
          </FormField>
          <FormField id="pf-last" label="Last name" required error={errorFor(errors, 'pf-last')}>
            <TextInput id="pf-last" autoComplete="family-name" value={f.lastName} onChange={set('lastName')} />
          </FormField>
          <FormField id="pf-title" label="Job title" optional>
            <TextInput id="pf-title" autoComplete="organization-title" value={f.jobTitle} onChange={set('jobTitle')} />
          </FormField>
          <FormField id="pf-phone" label="Business phone" optional hint={PHONE_HINT}>
            <TextInput id="pf-phone" type="tel" autoComplete="tel-national" value={f.phone} onChange={set('phone')} />
          </FormField>
          <FormField id="pf-mobile" label="Mobile phone" optional hint={PHONE_HINT}>
            <TextInput id="pf-mobile" type="tel" autoComplete="tel-national" value={f.mobile} onChange={set('mobile')} />
          </FormField>
          <ReadOnlyField
            label="Email"
            value={
              <span className={styles.email}>
                <span>{contact.email ?? 'No email address'}</span>
                <AppLink to="/Account/Manage/ChangeEmail">Change email</AppLink>
              </span>
            }
          />
        </div>
        <FormSection title="How we can contact you">
          <p className={styles.prefsHint}>Choose how we may send you marketing information.</p>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            {PREFS.map(([k, label]) => (
              <Checkbox key={k} id={`pref-${k}`} label={label} checked={prefs[k]} onChange={v => setPrefs(p => ({ ...p, [k]: v }))} />
            ))}
          </div>
        </FormSection>
        <div className={styles.footer}>
          <Button type="submit" variant="primary" icon={<Save20Regular />} pending={saving.pending} pendingLabel="Saving…">
            Save profile
          </Button>
          <InlineFeedback feedback={saved.feedback} className="self-center" />
        </div>
      </Panel>
      {guard.dialog}
    </form>
  )
}
