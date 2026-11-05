import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Body1, Caption1, Link as FluentLink, makeStyles, tokens } from '@fluentui/react-components'
import { Add20Regular, CheckmarkCircle20Regular, Prohibited20Regular, Save20Regular } from '@fluentui/react-icons'
import { Container } from '../../components/Layout'
import { useFormGuard } from '../../components/UnsavedChanges'
import { Alert, AppLink, Button, ButtonLink, PageHeader, Panel, StatusBadge } from '../../components/ui'
import { DataTable, type Column } from '../../components/DataTable'
import { createdOnColumn } from '../../components/createdOnColumn'
import {
  AddressField,
  FieldList,
  FormField,
  FormSection,
  PHONE_HINT,
  RequiredNote,
  Select,
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
import type { Account, Address, Contact } from '../../data/types'
import {
  ACCOUNTS_URL,
  EMAIL_FORMAT_MESSAGE,
  WEBSITE_HINT,
  addressLines,
  createContactUrl,
  editAccountUrl,
  editContactUrl,
  isValidEmail,
  websiteHref,
} from './shared'
import { useAccountStatus } from './useAccountStatus'
import { AccountStatusDialog } from './AccountStatusDialog'
import { useSummaryStyles } from './formStyles'
import { LoadError } from './LoadError'
import { PageSkeleton } from '../../components/skeletons'
import { useLiveLoad } from '../../services/useLiveLoad'
import { loadCustomerAccountWorkspace } from '../../services/loaders'
import { createCustomerAccountWithNumber, saveCustomerAccount } from '../../services/customers'
import { PERMISSION_MESSAGE } from '../../services/http'
import { KEEP_NOTICE } from '../../lib/notice'

const CRUMBS = [
  { label: 'Customers', to: '/customers/' },
  { label: 'Customer accounts', to: ACCOUNTS_URL },
]

const useStyles = makeStyles({
  footer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalL,
    paddingTop: tokens.spacingVerticalL,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  contactName: { display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', columnGap: tokens.spacingHorizontalS, rowGap: tokens.spacingVerticalXXS },
  contactMeta: { display: 'block', color: tokens.colorNeutralForeground2 },
  lines: { margin: 0 },
  status: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS },
})

export default function CustomerAccountForm({ mode }: { mode: 'create' | 'edit' }) {
  const { db, session } = useApp()
  const [params] = useSearchParams()
  const id = params.get('id') ?? ''
  const load = useLiveLoad(mode === 'edit' && id ? `customers:account:${id}` : null, signal => loadCustomerAccountWorkspace(id, signal))

  if (mode === 'create') return <AccountEditor key="create" mode="create" />

  const cached = customerAccounts(db, session).find(a => a.id === id)
  if (load.status === 'loading' && id && !cached) return <PageSkeleton variant="form" />
  if (load.status === 'error') {
    return <LoadError title="Customer account" breadcrumbs={[...CRUMBS, { label: 'Customer account' }]} error={load.error} onRetry={load.reload} />
  }
  const account = load.result?.found === false ? undefined : cached
  if (!account) {
    return (
      <Container>
        <PageHeader title="Customer account" breadcrumbs={[...CRUMBS, { label: 'Customer account' }]} />
        <Alert tone="error">This customer account doesn't exist, or you don't have permission to view it.</Alert>
        <Body1 as="p" className="mt-4">
          <AppLink to={ACCOUNTS_URL}>Back to customer accounts</AppLink>
        </Body1>
      </Container>
    )
  }
  return <AccountEditor key={account.id} mode="edit" account={account} reload={load.reload} />
}

interface FormState {
  name: string
  accountNumber: string
  phone: string
  email: string
  fax: string
  website: string
  address: Address
  primaryContactId: string
  description: string
}

function toState(a?: Account): FormState {
  return {
    name: a?.name ?? '',
    accountNumber: a?.accountNumber ?? '',
    phone: a?.phone ?? '',
    email: a?.email ?? '',
    fax: a?.fax ?? '',
    website: a?.website ?? '',
    address: a?.address ?? {},
    primaryContactId: a?.primaryContactId ?? '',
    description: a?.description ?? '',
  }
}

function AccountEditor({ mode, account, reload }: { mode: 'create' | 'edit'; account?: Account; reload?: () => Promise<void> }) {
  const { db, session, perform, notify } = useApp()
  const navigate = useNavigate()
  const styles = useStyles()
  const summaryStyles = useSummaryStyles()
  const [form, setForm] = useState<FormState>(() => toState(account))
  const [errors, setErrors] = useState<FormError[]>([])
  const [saving, setSaving] = useState(false)
  const status = useAccountStatus(reload)

  const editable = mode === 'create' ? can(session.role, 'customer-account:create') : can(session.role, 'customer-account:edit')
  const guard = useFormGuard(form, account ? `Customer account: ${account.name}` : 'New customer account', editable)
  const saved = useInlineFeedback(form)
  const canManage = mode === 'edit' && can(session.role, 'customer-account:deactivate')
  const canCreateContact = can(session.role, 'customer-contact:create')
  const title = mode === 'create' ? 'Create customer account' : account!.name
  const contacts = account ? customerContacts(db, session).filter(c => c.parentAccountId === account.id) : []
  const primary = contacts.find(c => c.id === account?.primaryContactId)

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }))
  const err = (label: string, id: string) => fieldErrorFor(errors, label, id)

  const contactColumns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'Contact',
      sortValue: c => fullName(c),
      render: c => (
        <>
          <span className={styles.contactName}>
            <AppLink to={editContactUrl(c.id)}>{fullName(c)}</AppLink>
            {c.id === account?.primaryContactId && <StatusBadge status="Primary" tone="indigo" />}
          </span>
          {c.jobTitle && <Caption1 className={styles.contactMeta}>{c.jobTitle}</Caption1>}
        </>
      ),
    },
    createdOnColumn<Contact>(),
  ]

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editable || saving) return
    const errs: FormError[] = requiredFieldErrors([['Account name', form.name, 'acc-name']])
    if (form.email.trim() && !isValidEmail(form.email)) errs.push({ id: 'acc-email', message: EMAIL_FORMAT_MESSAGE })
    setErrors(errs)
    if (errs.length) return
    const values = {
      name: form.name.trim(),
      accountNumber: form.accountNumber.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      fax: form.fax.trim() || undefined,
      website: form.website.trim() || undefined,
      address: form.address,
      description: form.description.trim() || undefined,
    }
    setSaving(true)
    if (mode === 'create') {
      let newAccountId = newId('acc')
      const ok = await perform({
        mock: d => {
          d.accounts.push({
            id: newAccountId,
            ...values,
            managingPartnerId: session.partnerId,
            classification: 'Customer',
            active: true,
            createdOn: todayIso(),
          })
        },
        live: async () => {
          if (!session.contact) throw new Error(PERMISSION_MESSAGE)
          newAccountId = await createCustomerAccountWithNumber(values, session.contact.id)
        },
      })
      setSaving(false)
      if (!ok) return
      notify(`${values.name} created.`)
      guard.markSaved()
      navigate(editAccountUrl(newAccountId), KEEP_NOTICE)
    } else {
      const primaryContactId = form.primaryContactId || undefined
      const ok = await perform({
        mock: d => {
          const acc = d.accounts.find(a => a.id === account!.id)
          if (acc) Object.assign(acc, values, { primaryContactId })
        },
        live: () => saveCustomerAccount(account!.id, values, primaryContactId, account!.primaryContactId),
        refresh: reload,
      })
      setSaving(false)
      if (!ok) return
      saved.show('Account saved.')
      guard.markSaved()
    }
  }

  const headerActions =
    canManage && account ? (
      <Button
        icon={account.active ? <Prohibited20Regular /> : <CheckmarkCircle20Regular />}
        pending={status.pendingId === account.id}
        pendingLabel={account.active ? 'Deactivating…' : 'Activating…'}
        onClick={() => status.change(account)}
      >
        {account.active ? 'Deactivate account' : 'Activate account'}
      </Button>
    ) : undefined

  const createContactButton = account && canCreateContact && (
    <ButtonLink to={createContactUrl(account.id)} size="sm" icon={<Add20Regular />}>
      Create contact
    </ButtonLink>
  )

  const details: ReactNode =
    editable || !account ? (
      <form noValidate onSubmit={submit}>
        <Panel title="Account details">
          <div className={summaryStyles.summary}>
            <ValidationSummary errors={errors} />
          </div>
          <RequiredNote className="mb-4" />
          <FormSection title="Account information">
            <FormField id="acc-name" label="Account name" required error={err('Account name', 'acc-name')}>
              <TextInput id="acc-name" value={form.name} maxLength={160} onChange={e => set('name', e.target.value)} />
            </FormField>
            <FormField id="acc-number" label="Account number" optional>
              <TextInput id="acc-number" value={form.accountNumber} maxLength={20} onChange={e => set('accountNumber', e.target.value)} />
            </FormField>
            <FormField id="acc-description" label="Description" optional>
              <TextArea id="acc-description" value={form.description} onChange={e => set('description', e.target.value)} />
            </FormField>
          </FormSection>
          <FormSection title="Contact information" className="mt-6">
            <FormField id="acc-phone" label="Phone" optional hint={PHONE_HINT}>
              <TextInput id="acc-phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </FormField>
            <FormField id="acc-email" label="Email" optional error={err('Email', 'acc-email')}>
              <TextInput id="acc-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </FormField>
            <FormField id="acc-fax" label="Fax" optional hint={PHONE_HINT}>
              <TextInput id="acc-fax" type="tel" value={form.fax} onChange={e => set('fax', e.target.value)} />
            </FormField>
            <FormField id="acc-website" label="Website" optional hint={WEBSITE_HINT}>
              <TextInput id="acc-website" type="url" value={form.website} onChange={e => set('website', e.target.value)} />
            </FormField>
            <FormField id="acc-address" label="Address" optional>
              <AddressField id="acc-address" value={form.address} onChange={a => set('address', a)} />
            </FormField>
            {mode === 'edit' && (
              <FormField id="acc-primary" label="Primary contact" optional>
                <Select
                  id="acc-primary"
                  value={form.primaryContactId}
                  placeholder={contacts.length ? 'Choose a contact' : 'No contacts at this account yet'}
                  disabled={contacts.length === 0}
                  options={contacts.map(c => ({ value: c.id, label: fullName(c) }))}
                  onChange={e => set('primaryContactId', e.target.value)}
                />
              </FormField>
            )}
          </FormSection>
          <div className={styles.footer}>
            <Button
              type="submit"
              variant="primary"
              icon={mode === 'create' ? <Add20Regular /> : <Save20Regular />}
              pending={saving}
              pendingLabel={mode === 'create' ? 'Creating…' : 'Saving…'}
            >
              {mode === 'create' ? 'Create account' : 'Save account'}
            </Button>
            <ButtonLink to={ACCOUNTS_URL}>Cancel</ButtonLink>
            <InlineFeedback feedback={saved.feedback} className="self-center" />
          </div>
        </Panel>
      </form>
    ) : (
      <Panel title="Account details">
        <p className="mt-0 mb-4">
          <Caption1>You can view this account. Ask a partner admin if something needs to change.</Caption1>
        </p>
        <FieldList
          hideEmpty
          items={[
            { label: 'Account number', value: account.accountNumber },
            { label: 'Phone', value: account.phone && <FluentLink href={`tel:${account.phone}`}>{account.phone}</FluentLink> },
            { label: 'Email', value: account.email && <FluentLink href={`mailto:${account.email}`}>{account.email}</FluentLink> },
            { label: 'Fax', value: account.fax },
            { label: 'Website', value: account.website && <FluentLink href={websiteHref(account.website)}>{account.website}</FluentLink> },
            {
              label: 'Address',
              value: addressLines(account.address).length ? (
                <span className={styles.lines}>
                  {addressLines(account.address).map((l, i) => (
                    <span key={i} className="block">
                      {l}
                    </span>
                  ))}
                </span>
              ) : undefined,
            },
            { label: 'Primary contact', value: primary && <AppLink to={editContactUrl(primary.id)}>{fullName(primary)}</AppLink> },
            { label: 'Description', value: account.description },
          ]}
        />
        {!account.accountNumber &&
          !account.phone &&
          !account.email &&
          !account.fax &&
          !account.website &&
          !addressLines(account.address).length &&
          !primary &&
          !account.description && (
            <Body1 as="p" className="m-0">
              No details have been added to this account yet.
            </Body1>
          )}
        <div className={styles.footer}>
          <ButtonLink to={ACCOUNTS_URL}>Back to customer accounts</ButtonLink>
        </div>
      </Panel>
    )

  return (
    <Container>
      <PageHeader
        title={title}
        eyebrow={mode === 'edit' ? 'Customer account' : undefined}
        breadcrumbs={[...CRUMBS, { label: mode === 'create' ? 'Create customer account' : account!.name }]}
        description={
          mode === 'edit' && account ? (
            <span className={styles.status}>
              <StatusBadge status={account.active ? 'Active' : 'Inactive'} tone={account.active ? 'green' : 'slate'} />
              {!account.active && <Body1>Hidden from new opportunities.</Body1>}
            </span>
          ) : undefined
        }
        actions={headerActions}
      />
      {mode === 'edit' && account ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 min-w-0">{details}</div>
          <Panel title="Contacts" className="self-start min-w-0" bodyClassName="p-0" actions={contacts.length > 0 && createContactButton}>
            <DataTable
              bare
              responsive="scroll"
              caption={`Contacts at ${account.name}`}
              columns={contactColumns}
              rows={contacts}
              rowKey={c => c.id}
              pageSize={10}
              initialSort={{ key: 'name', dir: 'asc' }}
              empty={{
                title: 'No contacts yet',
                body: 'Add the people you work with at this account.',
                action: createContactButton || undefined,
              }}
            />
          </Panel>
        </div>
      ) : (
        <div className="max-w-3xl">{details}</div>
      )}
      <AccountStatusDialog accountName={status.pending?.name ?? null} onConfirm={status.confirm} onClose={status.cancel} />
      {guard.dialog}
    </Container>
  )
}
