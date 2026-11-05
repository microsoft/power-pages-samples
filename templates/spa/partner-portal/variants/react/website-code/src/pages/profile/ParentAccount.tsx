import { useState, type FormEvent } from 'react'
import { Button as FluentButton, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Text, makeStyles, tokens } from '@fluentui/react-components'
import { MoreHorizontal20Regular, PeopleTeam20Regular, PersonAdd20Regular, Prohibited20Regular, Save20Regular } from '@fluentui/react-icons'
import type { Account, Contact } from '../../data/types'
import { Container } from '../../components/Layout'
import { useFormGuard } from '../../components/UnsavedChanges'
import { DataTable, type Column } from '../../components/DataTable'
import { createdOnColumn } from '../../components/createdOnColumn'
import { Alert, AppLink, Button, ButtonLink, PageHeader, Panel } from '../../components/ui'
import {
  AddressField,
  FieldList,
  FormField,
  PHONE_HINT,
  Select,
  TextArea,
  TextInput,
  requiredFieldErrors,
  type FormError,
} from '../../components/forms'
import { can, partnerContacts } from '../../lib/access'
import { formatAddress, fullName } from '../../lib/format'
import { useApp } from '../../store/AppStore'
import { PageSkeleton } from '../../components/skeletons'
import { loadPartnerTeam } from '../../services/loaders'
import { savePartnerAccount } from '../../services/admin'
import { asLoad, useLiveLoad } from '../../services/useLiveLoad'
import { CreatePartnerContactModal, LoadError, editContactPath, errorFor, useContactActivation, FormErrorSummary } from './partnerAdmin'
import { InlineFeedback } from '../../components/InlineFeedback'
import { useInlineFeedback } from '../../hooks/useInlineFeedback'
import { usePendingAction } from '../../hooks/usePendingAction'

const useStyles = makeStyles({
  fields: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', maxWidth: '40rem', rowGap: tokens.spacingVerticalL },
  footer: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalXXL,
    paddingTop: tokens.spacingVerticalL,
    borderTop: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
  },
  note: { margin: `0 0 ${tokens.spacingVerticalL}`, color: tokens.colorNeutralForeground2 },
  menuTrigger: { minWidth: '40px', minHeight: '40px' },
})

export default function ParentAccount() {
  const { db, session, mode } = useApp()
  const load = useLiveLoad('team', asLoad(signal => loadPartnerTeam(undefined, signal)))
  const account = db.accounts.find(a => a.id === session.partnerId)
  if (mode === 'live' && load.status === 'loading') return <PageSkeleton variant="form" />
  return (
    <Container>
      <PageHeader
        title="Parent account"
        description="Your partner organization's company details and active partner contacts."
        breadcrumbs={[{ label: 'Profile', to: '/profile/' }, { label: 'Parent account' }]}
      />
      {mode === 'live' && load.status === 'error' ? (
        <LoadError load={load} />
      ) : account ? (
        <div className="space-y-6">
          {can(session.role, 'parent-account:edit') ? <AccountForm key={account.id} account={account} refresh={load.reload} /> : <AccountView account={account} />}
          <ContactsPanel refresh={load.reload} />
        </div>
      ) : (
        <Alert tone="error">You don&apos;t have permissions to view these records.</Alert>
      )}
    </Container>
  )
}

function AccountView({ account }: { account: Account }) {
  const { db } = useApp()
  const styles = useStyles()
  const primary = account.primaryContactId ? db.contacts.find(c => c.id === account.primaryContactId) : undefined
  return (
    <Panel title="Company details">
      <p className={styles.note}>Only your Partner Admin or Partner Manager can change these details.</p>
      <FieldList
        items={[
          { label: 'Account name', value: account.name },
          { label: 'Main phone', value: account.phone },
          { label: 'Email', value: account.email },
          { label: 'Website', value: account.website },
          { label: 'Address', value: formatAddress(account.address) },
          { label: 'Primary contact', value: primary ? fullName(primary) : undefined },
          { label: 'Description', value: account.description },
        ]}
      />
    </Panel>
  )
}

function AccountForm({ account, refresh }: { account: Account; refresh: () => Promise<void> }) {
  const { db, session, perform } = useApp()
  const styles = useStyles()
  const contacts = partnerContacts(db, session).filter(c => c.active)
  const [f, setF] = useState({
    name: account.name,
    phone: account.phone ?? '',
    email: account.email ?? '',
    website: account.website ?? '',
    description: account.description ?? '',
    primaryContactId: account.primaryContactId ?? '',
  })
  const [address, setAddress] = useState(account.address)
  const [errors, setErrors] = useState<FormError[]>([])
  const guard = useFormGuard({ f, address }, `Company details: ${account.name}`)
  const saved = useInlineFeedback({ f, address })
  const saving = usePendingAction()
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(s => ({ ...s, [k]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = requiredFieldErrors([['Account name', f.name, 'pa-name']])
    setErrors(errs)
    if (errs.length) return
    const fields = {
      name: f.name.trim(),
      phone: f.phone.trim() || undefined,
      email: f.email.trim() || undefined,
      website: f.website.trim() || undefined,
      description: f.description.trim() || undefined,
    }
    const primaryContactId = f.primaryContactId || undefined
    const ok = await perform({
      mock: d => {
        const a = d.accounts.find(x => x.id === account.id)
        if (!a) return
        Object.assign(a, fields)
        a.primaryContactId = primaryContactId
        a.address = address
      },
      live: () =>
        savePartnerAccount(
          account.id,
          { name: fields.name, phone: f.phone, email: f.email, website: f.website, description: f.description, address },
          primaryContactId,
          account.primaryContactId,
        ),
      refresh,
    })
    if (!ok) return
    saved.show('Company details saved.')
    guard.markSaved()
  }

  return (
    <form onSubmit={e => { e.preventDefault(); void saving.run(() => onSubmit(e)) }} noValidate className="max-w-3xl">
      <FormErrorSummary errors={errors} />
      <Panel title="Company details">
        <div className={styles.fields}>
          <FormField id="pa-name" label="Account name" required error={errorFor(errors, 'pa-name')}>
            <TextInput id="pa-name" value={f.name} onChange={set('name')} />
          </FormField>
          <FormField id="pa-phone" label="Main phone" optional hint={PHONE_HINT}>
            <TextInput id="pa-phone" type="tel" value={f.phone} onChange={set('phone')} />
          </FormField>
          <FormField id="pa-email" label="Email" optional>
            <TextInput id="pa-email" type="email" value={f.email} onChange={set('email')} />
          </FormField>
          <FormField id="pa-website" label="Website" optional hint="For example, https://contoso.com">
            <TextInput id="pa-website" type="url" value={f.website} onChange={set('website')} />
          </FormField>
          <FormField id="pa-address" label="Address" optional>
            <AddressField id="pa-address" value={address} onChange={setAddress} />
          </FormField>
          <FormField id="pa-primary" label="Primary contact" optional>
            <Select
              id="pa-primary"
              placeholder="No primary contact"
              options={contacts.map(c => ({ value: c.id, label: fullName(c) }))}
              value={f.primaryContactId}
              onChange={set('primaryContactId')}
            />
          </FormField>
          <FormField id="pa-description" label="Description" optional>
            <TextArea id="pa-description" value={f.description} onChange={set('description')} />
          </FormField>
        </div>
        <div className={styles.footer}>
          <Button type="submit" variant="primary" icon={<Save20Regular />} pending={saving.pending} pendingLabel="Saving…">
            Save company details
          </Button>
          <InlineFeedback feedback={saved.feedback} className="self-center" />
        </div>
      </Panel>
      {guard.dialog}
    </form>
  )
}

function ContactsPanel({ refresh }: { refresh: () => Promise<void> }) {
  const { db, session } = useApp()
  const styles = useStyles()
  const role = session.role
  const isAdmin = can(role, 'manage-access')
  const isManager = role === 'partner-manager'
  const rows = partnerContacts(db, session).filter(c => c.active)
  const activation = useContactActivation(refresh)
  const [creating, setCreating] = useState(false)

  const columns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'Name',
      sortValue: c => fullName(c),
      render: c => (isAdmin ? <AppLink to={editContactPath(c.id)}>{fullName(c)}</AppLink> : <Text>{fullName(c)}</Text>),
    },
    { key: 'title', header: 'Job title', sortValue: c => c.jobTitle ?? '', render: c => c.jobTitle ?? '—' },
    { key: 'email', header: 'Email', sortValue: c => c.email ?? '', render: c => c.email ?? '—' },
    { key: 'phone', header: 'Phone', render: c => c.phone ?? '—' },
    createdOnColumn<Contact>(),
  ]

  return (
    <Panel
      title="Partner contacts"
      actions={
        isAdmin ? (
          <ButtonLink to="/profile/manage-access/" size="sm" icon={<PeopleTeam20Regular />}>
            Manage access
          </ButtonLink>
        ) : isManager ? (
          <Button size="sm" icon={<PersonAdd20Regular />} onClick={() => setCreating(true)}>
            Add contact
          </Button>
        ) : undefined
      }
    >
      {isAdmin && <p className={styles.note}>To invite, change roles or deactivate contacts, go to Manage access.</p>}
      {isManager && <p className={styles.note}>As a Partner Manager you can add and deactivate contacts. Your Partner Admin manages roles and invitations.</p>}
      <DataTable
        caption="Active partner contacts"
        columns={columns}
        rows={rows}
        rowKey={c => c.id}
        initialSort={{ key: 'name', dir: 'asc' }}
        actions={
          isManager
            ? c =>
                c.id === session.contact?.id ? null : (
                  <Menu positioning="below-end">
                    <MenuTrigger disableButtonEnhancement>
                      <FluentButton appearance="subtle" className={styles.menuTrigger} icon={<MoreHorizontal20Regular />} aria-label={`More actions for ${fullName(c)}`} />
                    </MenuTrigger>
                    <MenuPopover>
                      <MenuList>
                        <MenuItem icon={<Prohibited20Regular />} onClick={() => activation.request(c)}>
                          Deactivate contact
                        </MenuItem>
                      </MenuList>
                    </MenuPopover>
                  </Menu>
                )
            : undefined
        }
      />
      {activation.dialog}
      {isManager && <CreatePartnerContactModal open={creating} onClose={() => setCreating(false)} refresh={refresh} />}
    </Panel>
  )
}
