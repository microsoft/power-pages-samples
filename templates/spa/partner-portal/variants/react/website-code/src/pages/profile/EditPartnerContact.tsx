import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Caption1, Text, makeStyles, tokens } from '@fluentui/react-components'
import { CheckmarkCircle20Regular, Prohibited20Regular, Save20Regular, Send20Regular } from '@fluentui/react-icons'
import type { Contact, PartnerContactRole } from '../../data/types'
import { Comments } from '../../components/Comments'
import { Container } from '../../components/Layout'
import { useFormGuard } from '../../components/UnsavedChanges'
import { Alert, AppLink, Button, PageHeader, Panel, StatusBadge } from '../../components/ui'
import { FieldList, FormField, PHONE_HINT, ReadOnlyField, TextInput, fieldErrors, requiredMessage, type FormError } from '../../components/forms'
import { partnerContacts } from '../../lib/access'
import { formatDate, fullName } from '../../lib/format'
import { useApp } from '../../store/AppStore'
import { PageSkeleton } from '../../components/skeletons'
import * as actions from '../../services/actions'
import { loadPartnerTeam } from '../../services/loaders'
import { asLoad, useLiveLoad, type LiveLoad } from '../../services/useLiveLoad'
import { useRoutePreload } from '../../hooks/useRoutePreload'
import type { CachePatch } from '../../services/loaders'
import {
  EMAIL_FORMAT_MESSAGE,
  LoadError,
  PartnerRoleRadios,
  errorFor,
  invitationBlocker,
  isValidEmail,
  latestInvitation,
  useContactActivation,
  useInvitation,
  FormErrorSummary,
} from './partnerAdmin'
import { InlineFeedback } from '../../components/InlineFeedback'
import { useInlineFeedback } from '../../hooks/useInlineFeedback'
import { usePendingAction } from '../../hooks/usePendingAction'

const useStyles = makeStyles({
  fields: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', maxWidth: '40rem', rowGap: tokens.spacingVerticalL },
  footer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalXXL,
    paddingTop: tokens.spacingVerticalL,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  note: { display: 'block', color: tokens.colorNeutralForeground2 },
  invitation: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL, alignItems: 'flex-start' },
})

const MANAGE_ACCESS = '/profile/manage-access/'
const CRUMBS = [
  { label: 'Profile', to: '/profile/' },
  { label: 'Manage access', to: MANAGE_ACCESS },
]

export default function EditPartnerContact() {
  const { db, session, mode } = useApp()
  const [params] = useSearchParams()
  const id = params.get('id') ?? ''
  const load = useLiveLoad(id ? `team:${id}` : null, asLoad(signal => loadPartnerTeam(id, signal)))
  const contact = partnerContacts(db, session).find(c => c.id === id)

  if (mode === 'live' && id && load.status === 'loading') return <PageSkeleton variant="form" />
  if (mode === 'live' && load.status === 'error') {
    return (
      <Container>
        <PageHeader title="Edit partner contact" breadcrumbs={[...CRUMBS, { label: 'Edit partner contact' }]} />
        <LoadError load={load} />
      </Container>
    )
  }
  if (!contact) {
    return (
      <Container>
        <PageHeader title="Edit partner contact" breadcrumbs={[...CRUMBS, { label: 'Edit partner contact' }]} />
        <Alert tone="error">
          We couldn&apos;t find this contact in your organization.{' '}
          <AppLink to={MANAGE_ACCESS} inline>
            Go to Manage access
          </AppLink>
        </Alert>
      </Container>
    )
  }
  return <EditForm key={contact.id} contact={contact} load={load} />
}

function EditForm({ contact, load }: { contact: Contact; load: LiveLoad<{ patch: CachePatch }> }) {
  const { db, session, perform } = useApp()
  const navigate = useNavigate()
  const preload = useRoutePreload()
  const invitation = useInvitation(load.reload)
  const activation = useContactActivation(load.reload)
  const styles = useStyles()
  const account = db.accounts.find(a => a.id === contact.parentAccountId)
  const inv = latestInvitation(db.invitations, contact.id)
  const self = contact.id === session.contact?.id
  const [f, setF] = useState({
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    jobTitle: contact.jobTitle ?? '',
    partnerRole: contact.partnerRole ?? '',
  })
  const [errors, setErrors] = useState<FormError[]>([])
  const guard = useFormGuard(f, `Partner contact: ${fullName(contact)}`)
  const saved = useInlineFeedback(f)
  const saving = usePendingAction()
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(s => ({ ...s, [k]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = fieldErrors({
      'epc-first': !f.firstName.trim() && requiredMessage('First name'),
      'epc-last': !f.lastName.trim() && requiredMessage('Last name'),
      'epc-email': !!f.email.trim() && !isValidEmail(f.email) && EMAIL_FORMAT_MESSAGE,
    })
    setErrors(errs)
    if (errs.length) return
    const fields = {
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      email: f.email.trim() || undefined,
      phone: f.phone.trim() || undefined,
      jobTitle: f.jobTitle.trim() || undefined,
    }
    const partnerRole = (f.partnerRole || undefined) as PartnerContactRole | undefined
    const ok = await perform({
      mock: d => {
        const c = d.contacts.find(x => x.id === contact.id)
        if (!c) return
        Object.assign(c, fields)
        c.partnerRole = partnerRole
      },
      live: async () => {
        await actions.updateContact(contact.id, { ...fields, email: fields.email ?? '', phone: fields.phone ?? '', jobTitle: fields.jobTitle ?? '' })
        if (partnerRole !== contact.partnerRole) await actions.setPartnerRole(contact.id, partnerRole)
      },
      refresh: load.reload,
    })
    if (!ok) return
    saved.show(`${f.firstName.trim()} ${f.lastName.trim()}'s details have been saved.`)
    guard.markSaved()
  }

  const name = fullName(contact)
  const blocker = invitationBlocker(contact)
  const resend = inv && inv.status !== 'Redeemed'
  return (
    <Container>
      <PageHeader
        title={name}
        eyebrow="Partner contact"
        breadcrumbs={[...CRUMBS, { label: name }]}
        actions={
          self ? undefined : contact.active ? (
            <Button variant="danger" icon={<Prohibited20Regular />} onClick={() => activation.request(contact)}>
              Deactivate contact
            </Button>
          ) : (
            <Button icon={<CheckmarkCircle20Regular />} onClick={() => activation.request(contact)}>
              Activate contact
            </Button>
          )
        }
      />
      {!contact.active && (
        <div className="mb-6">
          <Alert tone="warning" title="This contact is inactive">
            They can&apos;t sign in to the portal until you activate them.
          </Alert>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start max-w-[1112px]">
        <form onSubmit={e => { e.preventDefault(); void saving.run(() => onSubmit(e)) }} noValidate>
          <FormErrorSummary errors={errors} />
          <Panel title="Contact details">
            <div className={styles.fields}>
              <FormField id="epc-first" label="First name" required error={errorFor(errors, 'epc-first')}>
                <TextInput id="epc-first" value={f.firstName} onChange={set('firstName')} />
              </FormField>
              <FormField id="epc-last" label="Last name" required error={errorFor(errors, 'epc-last')}>
                <TextInput id="epc-last" value={f.lastName} onChange={set('lastName')} />
              </FormField>
              <FormField id="epc-email" label="Email" optional hint="Needed to send a portal invitation." error={errorFor(errors, 'epc-email')}>
                <TextInput id="epc-email" type="email" value={f.email} onChange={set('email')} />
              </FormField>
              <FormField id="epc-phone" label="Phone" optional hint={PHONE_HINT}>
                <TextInput id="epc-phone" type="tel" value={f.phone} onChange={set('phone')} />
              </FormField>
              <FormField id="epc-title" label="Job title" optional>
                <TextInput id="epc-title" value={f.jobTitle} onChange={set('jobTitle')} />
              </FormField>
              <ReadOnlyField label="Organization" value={account?.name} />
              <PartnerRoleRadios label="Partner role" value={f.partnerRole} onChange={v => setF(s => ({ ...s, partnerRole: v }))} />
              {self && (
                <Caption1 as="p" className={styles.note}>
                  This is your own account. You can&apos;t deactivate yourself. Ask another Partner Admin if you need to.
                </Caption1>
              )}
            </div>
            <div className={styles.footer}>
              <Button type="submit" variant="primary" icon={<Save20Regular />} pending={saving.pending} pendingLabel="Saving…">
                Save contact
              </Button>
              <Button {...preload(MANAGE_ACCESS)} onClick={() => navigate(MANAGE_ACCESS)}>Cancel</Button>
              <InlineFeedback feedback={saved.feedback} className="self-center" />
            </div>
          </Panel>
        </form>
        <Panel title="Invitation">
          <div className={styles.invitation}>
            {inv ? (
              <FieldList
                items={[
                  { label: 'Status', value: <StatusBadge status={inv.status === 'Redeemed' ? 'Accepted' : inv.status} /> },
                  { label: 'Code', value: <Text font="monospace">{inv.code}</Text> },
                  { label: 'Sent', value: formatDate(inv.sentOn) },
                ]}
              />
            ) : (
              <Text>No invitation has been sent yet.</Text>
            )}
            {inv?.status !== 'Redeemed' &&
              (blocker ? (
                <Caption1 as="p" className={styles.note}>
                  {blocker}
                </Caption1>
              ) : (
                <Button icon={<Send20Regular />} pending={invitation.sendingId === contact.id} pendingLabel="Sending…" onClick={() => void invitation.send(contact)}>
                  {resend ? 'Resend invitation' : 'Send invitation'}
                </Button>
              ))}
          </div>
        </Panel>
      </div>
      <div className="mt-6 max-w-[1112px]">
        <Comments regardingType="contact" regardingId={contact.id} onChange={load.reload} />
      </div>
      {activation.dialog}
      {invitation.modal}
      {guard.dialog}
    </Container>
  )
}
