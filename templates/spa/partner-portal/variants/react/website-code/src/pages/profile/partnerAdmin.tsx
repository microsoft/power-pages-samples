import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Contact, Invitation, PartnerContactRole } from '../../data/types'
import { Body1, Caption1, Field, Radio, RadioGroup, Text, makeStyles, tokens } from '@fluentui/react-components'
import { Checkmark20Regular, Copy20Regular, PersonAdd20Regular } from '@fluentui/react-icons'
import { ConfirmDialog, Modal, useConfirmationButtonStyles } from '../../components/Modal'
import { FormPanel } from '../../components/FormPanel'
import { Alert, Button } from '../../components/ui'
import { FormField, PHONE_HINT, TextInput, ValidationSummary, fieldErrors, requiredMessage, type FormError } from '../../components/forms'
import { fullName, newId, todayIso } from '../../lib/format'
import { useApp } from '../../store/AppStore'
import { InlineFeedback } from '../../components/InlineFeedback'
import { useInlineFeedback } from '../../hooks/useInlineFeedback'
import { usePendingAction } from '../../hooks/usePendingAction'
import * as actions from '../../services/actions'
import { createPartnerContact } from '../../services/admin'
import type { LiveLoad } from '../../services/useLiveLoad'

/** Partner contact roles with a one-line summary of what each can do ('' = no partner role). */
export const PARTNER_ROLE_OPTIONS: { value: '' | PartnerContactRole; label: string; description: string }[] = [
  { value: 'Partner Admin', label: 'Partner Admin', description: 'Manages the organization, its contacts and who can access the portal.' },
  { value: 'Partner Manager', label: 'Partner Manager', description: 'Manages all opportunities, customers and company details.' },
  { value: 'Partner Seller', label: 'Partner Seller', description: 'Works on assigned opportunities and customers.' },
  { value: '', label: 'No partner role', description: 'Can sign in, but has no access to partner features.' },
]

export const SAVED = 'Changes saved.'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const EMAIL_FORMAT_MESSAGE = 'Enter an email address in the correct format, like name@example.com'
export const isValidEmail = (v: string) => EMAIL_PATTERN.test(v.trim())

const useStyles = makeStyles({
  muted: { color: tokens.colorNeutralForeground2 },
  strong: { color: tokens.colorNeutralForeground1 },
  roleLabel: { display: 'flex', flexDirection: 'column' },
  roleDescription: { color: tokens.colorNeutralForeground2 },
  fieldLabel: { fontWeight: tokens.fontWeightSemibold },
  codeBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXXS,
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  codeLabel: { color: tokens.colorNeutralForeground2, fontWeight: tokens.fontWeightSemibold },
  code: { color: tokens.colorNeutralForeground1 },
  urlRow: { display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'center', flexWrap: 'wrap' },
  urlInput: { flex: '1 1 16rem', minWidth: 0, minHeight: '48px' },
  copyButton: { minHeight: '48px' },
  // Linked summary items stack closely; give each link a 24px target (WCAG 2.5.8).
  summary: { '& .fui-MessageBar a': { display: 'inline-block', minHeight: '24px', lineHeight: '24px' } },
})

/** ValidationSummary whose linked errors meet the 24px target size. */
export function FormErrorSummary({ errors }: { errors: FormError[] }) {
  const styles = useStyles()
  if (errors.length === 0) return null
  return (
    <div className={styles.summary}>
      <ValidationSummary errors={errors} />
    </div>
  )
}

export function latestInvitation(invitations: Invitation[], contactId: string): Invitation | undefined {
  return invitations.filter(i => i.contactId === contactId).sort((a, b) => b.sentOn.localeCompare(a.sentOn))[0]
}

/** Why an invitation can't be created for this contact right now, or null when it can. */
export function invitationBlocker(contact: Contact): string | null {
  if (!contact.active) return 'Activate this contact before creating an invitation.'
  if (!contact.email) return 'Add an email address before creating an invitation.'
  return null
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function block() {
  return Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('')
}
export function generateInvitationCode() {
  return `NWP-${block()}-${block()}`
}

export function redeemUrl(code: string) {
  return `${window.location.origin}/redeem-invitation?invitation=${encodeURIComponent(code)}`
}

/** Inline message for the field with this id (summary errors are { id, message }). */
export function errorFor(errors: FormError[], id: string): string | undefined {
  const e = errors.find(x => typeof x !== 'string' && x.id === id)
  return e && typeof e !== 'string' ? e.message : undefined
}

export const editContactPath = (id: string) => `/profile/manage-access/edit-partner-contact/?id=${id}`

/** Live-mode load failure with a retry. */
export function LoadError({ load }: { load: Pick<LiveLoad<never>, 'error' | 'reload'> }) {
  return (
    <Alert tone="error">
      <p>{load.error ?? 'The data could not be loaded.'}</p>
      <div className="mt-3">
        <Button onClick={() => void load.reload()}>Try again</Button>
      </div>
    </Alert>
  )
}

/** Radio list of partner roles with descriptions. */
export function PartnerRoleRadios({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const styles = useStyles()
  return (
    <Field label={{ children: label, className: styles.fieldLabel }} hint={hint}>
      <RadioGroup value={value || 'none'} onChange={(_, data) => onChange(data.value === 'none' ? '' : data.value)}>
        {PARTNER_ROLE_OPTIONS.map(o => (
          <Radio
            key={o.value || 'none'}
            value={o.value || 'none'}
            label={
              <span className={styles.roleLabel}>
                <Text weight="semibold">{o.label}</Text>
                <Caption1 className={styles.roleDescription}>{o.description}</Caption1>
              </span>
            }
          />
        ))}
      </RadioGroup>
    </Field>
  )
}

/**
 * Mock: creates the prototype invitation record and presents its code and redeem link; no email is sent.
 * Live: runs the "Send invitation" flow (code and email are created server-side).
 */
export function useInvitation(refresh?: () => Promise<void>) {
  const { mode, perform, notify } = useApp()
  const styles = useStyles()
  const buttonStyles = useConfirmationButtonStyles()
  const navigate = useNavigate()
  const createdDescriptionId = useId()
  const blockedDescriptionId = useId()
  const [sent, setSent] = useState<{ name: string; email: string; code: string } | null>(null)
  const [blocked, setBlocked] = useState<{ contact: Contact; reason: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const copyFeedback = useInlineFeedback()
  const sending = usePendingAction()

  const send = (contact: Contact) => sending.run(async () => {
    const reason = invitationBlocker(contact)
    if (reason) {
      setBlocked({ contact, reason })
      return
    }
    const code = generateInvitationCode()
    const ok = await perform({
      mock: d => {
        const open = d.invitations.filter(i => i.contactId === contact.id && i.status !== 'Redeemed').sort((a, b) => b.sentOn.localeCompare(a.sentOn))[0]
        if (open) {
          open.code = code
          open.status = 'Sent'
          open.sentOn = todayIso()
        } else {
          d.invitations.push({ id: newId('inv'), contactId: contact.id, code, status: 'Sent', sentOn: todayIso() })
        }
      },
      live: () => actions.sendInvitation(contact.id),
      refresh,
    })
    if (!ok) return
    if (mode === 'live') {
      notify('The workflow has been initiated.')
      return
    }
    setCopied(false)
    copyFeedback.clear()
    setSent({ name: fullName(contact), email: contact.email ?? '', code })
  }, contact.id)

  const copy = async () => {
    if (!sent) return
    try {
      await navigator.clipboard.writeText(redeemUrl(sent.code))
      copyFeedback.clear()
      setCopied(true)
    } catch {
      copyFeedback.show('Copy failed. Select the link and copy it manually.', 'error')
    }
  }

  const modal = (
    <>
      <Modal
        open={sent !== null}
        title="Invitation created"
        descriptionId={createdDescriptionId}
        onClose={() => setSent(null)}
        footer={
          <Button className={buttonStyles.secondary} onClick={() => setSent(null)}>
            Close
          </Button>
        }
      >
        {sent && (
          <div className="space-y-4">
            <Body1 as="p" id={createdDescriptionId} className={styles.muted}>
              An invitation for <Text weight="semibold" className={styles.strong}>{sent.name}</Text>
              {sent.email && <> ({sent.email})</>} is ready. This prototype does not send emails. Share the link or code so they can join.
            </Body1>
            <div className={styles.codeBlock}>
              <Caption1 className={styles.codeLabel}>Invitation code</Caption1>
              <Text size={500} font="monospace" weight="semibold" className={styles.code}>
                {sent.code}
              </Text>
            </div>
            <FormField id="invite-url" label="Invitation link" hint="Copy and share this link with the invited contact.">
              <div className={styles.urlRow}>
                <TextInput id="invite-url" readOnly value={redeemUrl(sent.code)} className={styles.urlInput} onFocus={e => e.currentTarget.select()} />
                <Button variant="primary" className={styles.copyButton} icon={copied ? <Checkmark20Regular /> : <Copy20Regular />} onClick={copy}>
                  {copied ? 'Link copied' : 'Copy invitation link'}
                </Button>
              </div>
            </FormField>
            <InlineFeedback feedback={copyFeedback.feedback} />
            <span role="status" className="sr-only">
              {copied ? 'Invitation link copied to the clipboard.' : ''}
            </span>
          </div>
        )}
      </Modal>
      <Modal
        open={blocked !== null}
        title="Can't create invitation"
        descriptionId={blockedDescriptionId}
        size="sm"
        onClose={() => setBlocked(null)}
        footer={
          <>
            <Button className={buttonStyles.secondary} onClick={() => setBlocked(null)}>Close</Button>
            {blocked && (
              <Button variant="primary" onClick={() => {
                const path = editContactPath(blocked.contact.id)
                setBlocked(null)
                navigate(path)
              }}>
                {blocked.contact.active ? 'Add email address' : 'Review contact'}
              </Button>
            )}
          </>
        }
      >
        {blocked && (
          <Body1 as="p" id={blockedDescriptionId} className={styles.muted}>
            {fullName(blocked.contact)} can&apos;t be invited yet. {blocked.reason}
          </Body1>
        )}
      </Modal>
    </>
  )

  return { send, sendingId: sending.pendingKey, modal }
}

/** Shared confirm flow for deactivating/activating a partner contact (lists and the edit page). */
export function useContactActivation(refresh?: () => Promise<void>) {
  const { db, perform, notify } = useApp()
  const [target, setTarget] = useState<Contact | null>(null)
  const organization = db.accounts.find(account => account.id === target?.parentAccountId)

  const apply = async (c: Contact) => {
    const ok = await perform({
      mock: d => {
        const t = d.contacts.find(x => x.id === c.id)
        if (t) t.active = !c.active
      },
      live: () => actions.setContactActive(c.id, !c.active),
      refresh,
    })
    if (ok) notify(`${fullName(c)} has been ${c.active ? 'deactivated' : 'activated'}.`)
  }

  const dialog = (
    <ConfirmDialog
      open={target !== null}
      title={target?.active ? 'Deactivate contact?' : 'Activate contact?'}
      message={target && (
        <>
          <p><strong>{fullName(target)}</strong>{target.email && ` (${target.email})`}</p>
          <p className="mt-2">
            {target.active
              ? 'This contact will no longer be able to sign in. Their record will be kept, and you can activate them again later.'
              : target.partnerRole
                ? `Allow this contact to sign in again as ${target.partnerRole}${organization ? ` for ${organization.name}` : ''}.`
                : 'Allow this contact to sign in as a Non-Partner Portal User. No partner role is assigned, so they will not have access to partner features.'}
          </p>
        </>
      )}
      confirmLabel={target?.active ? 'Deactivate contact' : 'Activate contact'}
      cancelLabel={target?.active ? 'Keep active' : 'Keep inactive'}
      tone={target?.active ? 'danger' : 'primary'}
      pendingLabel={target?.active ? 'Deactivating…' : 'Activating…'}
      onConfirm={() => (target ? apply(target) : undefined)}
      onClose={() => setTarget(null)}
    />
  )

  return { request: setTarget, dialog }
}

const EMPTY = { firstName: '', lastName: '', email: '', jobTitle: '', phone: '', partnerRole: '' }

/** Contextual form: adds a contact under the signed-in partner organization. */
export function CreatePartnerContactModal({ open, onClose, refresh }: { open: boolean; onClose: () => void; refresh?: () => Promise<void> }) {
  const { session, perform, notify } = useApp()
  const [f, setF] = useState(EMPTY)
  const [errors, setErrors] = useState<FormError[]>([])
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setF(s => ({ ...s, [k]: e.target.value }))

  const close = () => {
    setF(EMPTY)
    setErrors([])
    onClose()
  }

  const save = async () => {
    const email = f.email.trim()
    const errs = fieldErrors({
      'pc-first': !f.firstName.trim() && requiredMessage('First name'),
      'pc-last': !f.lastName.trim() && requiredMessage('Last name'),
      'pc-email': !email ? 'Enter an email address, so you can invite this contact' : !isValidEmail(email) && EMAIL_FORMAT_MESSAGE,
    })
    setErrors(errs)
    if (errs.length) return
    const fields = {
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      email,
      jobTitle: f.jobTitle.trim() || undefined,
      phone: f.phone.trim() || undefined,
    }
    const partnerRole = (f.partnerRole || undefined) as PartnerContactRole | undefined
    const ok = await perform({
      mock: d => {
        d.contacts.push({
          id: newId('c'),
          ...fields,
          partnerRole,
          parentAccountId: session.partnerId,
          managingPartnerId: session.partnerId,
          address: {},
          active: true,
          createdOn: todayIso(),
          preferences: { email: true, phone: true, fax: false, mail: false },
        })
      },
      live: async () => {
        if (!session.partnerId || !session.contact) throw new Error("You don't have the appropriate permissions.")
        await createPartnerContact(fields, partnerRole, session.partnerId, session.contact.id)
      },
      refresh,
    })
    if (!ok) return
    notify(`${f.firstName.trim()} ${f.lastName.trim()} has been added. Send them an invitation from the list.`)
    close()
  }

  return (
    <FormPanel
      open={open}
      title="Create partner contact"
      dirty={JSON.stringify(f) !== JSON.stringify(EMPTY)}
      onClose={close}
      submitLabel="Create contact"
      submitIcon={<PersonAdd20Regular />}
      submitPendingLabel="Creating…"
      onSubmit={save}
    >
      <FormErrorSummary errors={errors} />
      <div className="grid grid-cols-1 gap-4">
        <FormField id="pc-first" label="First name" required error={errorFor(errors, 'pc-first')}>
          <TextInput id="pc-first" autoComplete="off" value={f.firstName} onChange={set('firstName')} />
        </FormField>
        <FormField id="pc-last" label="Last name" required error={errorFor(errors, 'pc-last')}>
          <TextInput id="pc-last" autoComplete="off" value={f.lastName} onChange={set('lastName')} />
        </FormField>
        <FormField id="pc-email" label="Email" required hint="Identifies the contact receiving the portal invitation." error={errorFor(errors, 'pc-email')}>
          <TextInput id="pc-email" type="email" autoComplete="off" value={f.email} onChange={set('email')} />
        </FormField>
        <FormField id="pc-title" label="Job title" optional>
          <TextInput id="pc-title" value={f.jobTitle} onChange={set('jobTitle')} />
        </FormField>
        <FormField id="pc-phone" label="Phone" optional hint={PHONE_HINT}>
          <TextInput id="pc-phone" type="tel" value={f.phone} onChange={set('phone')} />
        </FormField>
        <PartnerRoleRadios label="Partner role" value={f.partnerRole} onChange={v => setF(s => ({ ...s, partnerRole: v }))} />
      </div>
    </FormPanel>
  )
}
