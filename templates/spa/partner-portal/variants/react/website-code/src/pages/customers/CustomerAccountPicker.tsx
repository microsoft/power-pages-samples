import { useState } from 'react'
import { Add20Regular } from '@fluentui/react-icons'
import { FormField, Select, TextInput, ValidationSummary } from '../../components/forms'
import { FormPanel } from '../../components/FormPanel'
import { Alert, Button } from '../../components/ui'
import { can, customerAccounts } from '../../lib/access'
import { newId, todayIso } from '../../lib/format'
import { useApp } from '../../store/AppStore'
import { InlineFeedback } from '../../components/InlineFeedback'
import { useInlineFeedback } from '../../hooks/useInlineFeedback'
import type { Account } from '../../data/types'
import { asLoad, useLiveLoad } from '../../services/useLiveLoad'
import { loadCustomerAccountsOnce } from '../../services/customers'
import { createCustomerAccount } from '../../services/actions'
import { PERMISSION_MESSAGE } from '../../services/http'

/** Create the prerequisite record without navigating away from an opportunity/contact draft. */
export function CustomerAccountPicker({
  id,
  label,
  value,
  onChange,
  error,
  activeOnly = false,
}: {
  id: string
  label: string
  value: string
  onChange: (id: string) => void
  error?: string
  activeOnly?: boolean
}) {
  const { db, session, sessionReady, perform, applyPatch } = useApp()
  const load = useLiveLoad(
    sessionReady ? `customers:accounts:${session.partnerId ?? ''}` : null,
    asLoad(signal => loadCustomerAccountsOnce(session.partnerId, signal)),
  )
  const loading = load.status === 'loading'
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  // Describes the current selection, so it clears when the user picks a different account.
  const created = useInlineFeedback(value)
  const canCreate = can(session.role, 'customer-account:create')
  const accounts = customerAccounts(db, session)
    .filter(a => !activeOnly || a.active)
    .sort((a, b) => a.name.localeCompare(b.name))
  const nameId = `${id}-new-name`

  const create = async () => {
    if (!canCreate) {
      created.show("You don't have permission to create customer accounts.", 'error')
      return
    }
    if (!name.trim()) {
      setNameError('Enter an account name')
      return
    }
    let accountId = newId('acc')
    const account = (newAccountId: string): Account => ({
      id: newAccountId,
      name: name.trim(),
      managingPartnerId: session.partnerId,
      classification: 'Customer',
      active: true,
      address: {},
      createdOn: todayIso(),
    })
    const ok = await perform({
      mock: d => d.accounts.push(account(accountId)),
      live: async () => {
        if (!session.contact) throw new Error(PERMISSION_MESSAGE)
        accountId = await createCustomerAccount({ name: name.trim() }, session.contact.id)
        applyPatch({ accounts: [account(accountId)] })
      },
    })
    if (!ok) return
    onChange(accountId)
    setOpen(false)
    created.show(`${name.trim()} created and selected. You can add its contact details in Customers later.`, 'success', { watch: accountId })
  }

  return (
    <div className="space-y-2">
      <FormField
        id={id}
        label={label}
        required
        error={error}
        hint={
          loading
            ? 'Loading customer accounts...'
            : accounts.length === 0
              ? canCreate
                ? 'No customer accounts yet. Create one below to continue.'
                : 'Ask your partner admin to add a customer account before continuing.'
              : undefined
        }
      >
        <Select
          id={id}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={loading}
          aria-required="true"
          aria-invalid={!!error}
          placeholder="Choose a customer account"
          options={accounts.map(a => ({ value: a.id, label: a.active ? a.name : `${a.name} (inactive)` }))}
        />
      </FormField>
      {load.status === 'error' && (
        <Alert tone="error">
          {load.error || 'The customer accounts could not be loaded.'}{' '}
          <Button size="sm" onClick={() => void load.reload()}>
            Try again
          </Button>
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {canCreate && (
          <Button
            size="sm"
            icon={<Add20Regular />}
            onClick={() => {
              setName('')
              setNameError('')
              setOpen(true)
            }}
          >
            Create customer account
          </Button>
        )}
        <InlineFeedback feedback={created.feedback} />
      </div>
      <FormPanel
        open={open}
        title="Create customer account"
        dirty={name !== ''}
        onClose={() => setOpen(false)}
        submitLabel="Create and select account"
        submitIcon={<Add20Regular />}
        submitPendingLabel="Creating…"
        onSubmit={create}
      >
        <p className="mb-4">Add the organization you sell to. Your current form will stay here, and the new account will be selected automatically.</p>
        <div>
          <ValidationSummary errors={nameError ? [{ id: nameId, message: nameError }] : []} />
          <FormField id={nameId} label="Account name" required error={nameError}>
            <TextInput id={nameId} value={name} maxLength={160} onChange={e => setName(e.target.value)} />
          </FormField>
        </div>
      </FormPanel>
    </div>
  )
}
