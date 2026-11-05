import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Body1, makeStyles, tokens } from '@fluentui/react-components'
import { Add20Regular, Save20Regular } from '@fluentui/react-icons'
import { Container } from '../../components/Layout'
import { useFormGuard } from '../../components/UnsavedChanges'
import { Alert, AppLink, Button, ButtonLink, PageHeader, Panel } from '../../components/ui'
import {
  AddressField,
  FormField,
  FormSection,
  PHONE_HINT,
  RequiredNote,
  TextArea,
  TextInput,
  ValidationSummary,
  fieldErrorFor,
  requiredFieldErrors,
  type FormError,
} from '../../components/forms'
import { useApp } from '../../store/AppStore'
import { InlineFeedback } from '../../components/InlineFeedback'
import { useInlineFeedback } from '../../hooks/useInlineFeedback'
import { can, customerAccounts, customerContacts } from '../../lib/access'
import { fullName, newId, todayIso } from '../../lib/format'
import type { Address, Contact } from '../../data/types'
import { CONTACTS_URL, EMAIL_FORMAT_MESSAGE, editAccountUrl, editContactUrl, isValidEmail } from './shared'
import { useSummaryStyles } from './formStyles'
import { CustomerAccountPicker } from './CustomerAccountPicker'
import { LoadError } from './LoadError'
import { PageSkeleton } from '../../components/skeletons'
import { useLiveLoad } from '../../services/useLiveLoad'
import { loadCustomerContactForm } from '../../services/customers'
import { createContact, updateCustomerContact } from '../../services/actions'
import { PERMISSION_MESSAGE } from '../../services/http'
import { KEEP_NOTICE } from '../../lib/notice'

const CRUMBS = [
  { label: 'Customers', to: '/customers/' },
  { label: 'Customer contacts', to: CONTACTS_URL },
]

const ACCOUNT_REQUIRED = 'Select the customer account this contact works for'

const useStyles = makeStyles({
  footer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalL,
    paddingTop: tokens.spacingVerticalL,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
})

export default function CustomerContactForm({ mode }: { mode: 'create' | 'edit' }) {
  const { db, session, sessionReady } = useApp()
  const [params] = useSearchParams()
  const editId = mode === 'edit' ? params.get('id') ?? '' : null
  const load = useLiveLoad(
    sessionReady && editId !== '' ? `customers:contact-form:${session.partnerId ?? ''}:${editId ?? 'new'}` : null,
    signal => loadCustomerContactForm(session.partnerId, editId, signal),
  )
  const crumbs = [...CRUMBS, { label: mode === 'create' ? 'Create customer contact' : 'Customer contact' }]
  const cached = editId ? customerContacts(db, session).find(c => c.id === editId) : undefined

  if (load.status === 'loading' && editId !== '' && (mode === 'create' || !cached)) return <PageSkeleton variant="form" />
  if (load.status === 'error') {
    return <LoadError title={mode === 'create' ? 'Create customer contact' : 'Customer contact'} breadcrumbs={crumbs} error={load.error} onRetry={load.reload} />
  }

  if (mode === 'create') {
    const accountId = params.get('accountid') ?? ''
    const preset = customerAccounts(db, session).some(a => a.id === accountId) ? accountId : ''
    return <ContactEditor key={`create-${preset}`} mode="create" presetAccountId={preset} />
  }

  const contact = load.result?.found === false ? undefined : cached
  if (!contact) {
    return (
      <Container>
        <PageHeader title="Customer contact" breadcrumbs={[...CRUMBS, { label: 'Customer contact' }]} />
        <Alert tone="error">This customer contact doesn't exist, or you don't have permission to view it.</Alert>
        <Body1 as="p" className="mt-4">
          <AppLink to={CONTACTS_URL}>Back to customer contacts</AppLink>
        </Body1>
      </Container>
    )
  }
  return <ContactEditor key={contact.id} mode="edit" contact={contact} reload={load.reload} />
}

interface FormState {
  firstName: string
  lastName: string
  jobTitle: string
  email: string
  phone: string
  mobile: string
  parentAccountId: string
  address: Address
  notes: string
}

function ContactEditor({ mode, contact, presetAccountId = '', reload }: { mode: 'create' | 'edit'; contact?: Contact; presetAccountId?: string; reload?: () => Promise<void> }) {
  const { db, session, perform, notify } = useApp()
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const styles = useStyles()
  const summaryStyles = useSummaryStyles()
  const [form, setForm] = useState<FormState>(() => ({
    firstName: contact?.firstName ?? '',
    lastName: contact?.lastName ?? '',
    jobTitle: contact?.jobTitle ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    mobile: contact?.mobile ?? '',
    parentAccountId: contact?.parentAccountId ?? presetAccountId,
    address: contact?.address ?? {},
    notes: contact?.notes ?? '',
  }))
  const [errors, setErrors] = useState<FormError[]>([])
  const editable = mode === 'create' ? can(session.role, 'customer-contact:create') : can(session.role, 'customer-contact:edit')
  const guard = useFormGuard(form, contact ? `Customer contact: ${fullName(contact)}` : 'New customer contact', editable)
  const saved = useInlineFeedback(form)
  const accounts = customerAccounts(db, session)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }))
  const err = (label: string, id: string) => fieldErrorFor(errors, label, id)
  const company = accounts.find(a => a.id === (contact?.parentAccountId ?? presetAccountId))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editable || saving) return
    const errs: FormError[] = requiredFieldErrors([
      ['First name', form.firstName, 'ct-first'],
      ['Last name', form.lastName, 'ct-last'],
    ])
    if (!form.parentAccountId) errs.push({ id: 'ct-company', message: ACCOUNT_REQUIRED })
    if (form.email.trim() && !isValidEmail(form.email)) errs.push({ id: 'ct-email', message: EMAIL_FORMAT_MESSAGE })
    setErrors(errs)
    if (errs.length) return
    const values = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      jobTitle: form.jobTitle.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      mobile: form.mobile.trim() || undefined,
      parentAccountId: form.parentAccountId,
      address: form.address,
      notes: form.notes.trim() || undefined,
    }
    setSaving(true)
    if (mode === 'create') {
      let id = newId('c')
      const ok = await perform({
        mock: d => {
          d.contacts.push({ id, ...values, managingPartnerId: session.partnerId, active: true, createdOn: todayIso() })
        },
        live: async () => {
          if (!session.contact) throw new Error(PERMISSION_MESSAGE)
          id = await createContact(values, values.parentAccountId, session.contact.id)
        },
      })
      setSaving(false)
      if (!ok) return
      notify(`${fullName(values)} created.`)
      guard.markSaved()
      navigate(editContactUrl(id), KEEP_NOTICE)
    } else {
      const ok = await perform({
        mock: d => {
          const c = d.contacts.find(x => x.id === contact!.id)
          if (c) Object.assign(c, values)
        },
        live: () => updateCustomerContact(contact!.id, values),
        refresh: reload,
      })
      setSaving(false)
      if (!ok) return
      saved.show('Contact saved.')
      guard.markSaved()
    }
  }

  return (
    <Container>
      <PageHeader
        title={mode === 'create' ? 'Create customer contact' : fullName(contact)}
        eyebrow={mode === 'edit' ? 'Customer contact' : undefined}
        breadcrumbs={[...CRUMBS, { label: mode === 'create' ? 'Create customer contact' : fullName(contact) }]}
        description={
          company ? (
            <>
              Contact at{' '}
              <AppLink to={editAccountUrl(company.id)} inline>
                {company.name}
              </AppLink>
            </>
          ) : undefined
        }
      />
      <form noValidate onSubmit={submit} className="max-w-3xl">
        <Panel title="Contact details">
          <div className={summaryStyles.summary}>
            <ValidationSummary errors={errors} />
          </div>
          <RequiredNote className="mb-4" />
          <FormSection title="Contact information">
            <FormField id="ct-first" label="First name" required error={err('First name', 'ct-first')}>
              <TextInput id="ct-first" value={form.firstName} maxLength={50} onChange={e => set('firstName', e.target.value)} />
            </FormField>
            <FormField id="ct-last" label="Last name" required error={err('Last name', 'ct-last')}>
              <TextInput id="ct-last" value={form.lastName} maxLength={50} onChange={e => set('lastName', e.target.value)} />
            </FormField>
            <CustomerAccountPicker id="ct-company" label="Customer account" value={form.parentAccountId}
              onChange={accountId => set('parentAccountId', accountId)} error={err('Customer account', 'ct-company')} />
            <FormField id="ct-title" label="Job title" optional>
              <TextInput id="ct-title" value={form.jobTitle} maxLength={100} onChange={e => set('jobTitle', e.target.value)} />
            </FormField>
          </FormSection>
          <FormSection title="How to reach them" className="mt-6">
            <FormField id="ct-email" label="Email" optional error={err('Email', 'ct-email')}>
              <TextInput id="ct-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </FormField>
            <FormField id="ct-phone" label="Phone" optional hint={PHONE_HINT}>
              <TextInput id="ct-phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </FormField>
            <FormField id="ct-mobile" label="Mobile phone" optional hint={PHONE_HINT}>
              <TextInput id="ct-mobile" type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)} />
            </FormField>
            <FormField id="ct-address" label="Address" optional>
              <AddressField id="ct-address" value={form.address} onChange={a => set('address', a)} />
            </FormField>
            <FormField id="ct-notes" label="Notes" optional>
              <TextArea id="ct-notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </FormField>
          </FormSection>
          <div className={styles.footer}>
            <Button
              type="submit"
              variant="primary"
              icon={mode === 'create' ? <Add20Regular /> : <Save20Regular />}
              pending={saving}
              pendingLabel={mode === 'create' ? 'Creating…' : 'Saving…'}
            >
              {mode === 'create' ? 'Create contact' : 'Save contact'}
            </Button>
            <ButtonLink to={company && mode === 'create' ? editAccountUrl(company.id) : CONTACTS_URL}>Cancel</ButtonLink>
            <InlineFeedback feedback={saved.feedback} className="self-center" />
          </div>
        </Panel>
      </form>
      {guard.dialog}
    </Container>
  )
}
