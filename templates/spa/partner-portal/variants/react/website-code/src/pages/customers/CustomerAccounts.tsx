import { Button as FluentButton, Link as FluentLink, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, Spinner } from '@fluentui/react-components'
import { Add20Regular, CheckmarkCircle20Regular, MoreHorizontal20Regular, Prohibited20Regular } from '@fluentui/react-icons'
import { Container } from '../../components/Layout'
import { AppLink, ButtonLink, PageHeader, StatusBadge } from '../../components/ui'
import { DataTable, type Column } from '../../components/DataTable'
import { createdOnColumn } from '../../components/createdOnColumn'
import { useApp } from '../../store/AppStore'
import { can, customerAccounts } from '../../lib/access'
import { formatAddress, fullName } from '../../lib/format'
import type { Account } from '../../data/types'
import { CREATE_ACCOUNT_URL, editAccountUrl } from './shared'
import { ListToolbar, matchesQuery, matchesStatus, noMatches, useCustomerListFilters } from './ListToolbar'
import { useAccountStatus } from './useAccountStatus'
import { useBusyIndicator } from '../../hooks/usePendingAction'
import { AccountStatusDialog } from './AccountStatusDialog'
import { LoadError } from './LoadError'
import { PageSkeleton } from '../../components/skeletons'
import { asLoad, useLiveLoad } from '../../services/useLiveLoad'
import { loadCustomerAccountsOnce } from '../../services/customers'

export default function CustomerAccounts() {
  const { db, session, sessionReady } = useApp()
  const load = useLiveLoad(
    sessionReady ? `customers:accounts:${session.partnerId ?? ''}` : null,
    asLoad(signal => loadCustomerAccountsOnce(session.partnerId, signal)),
  )
  const { query, setQuery, status, setStatus, showAll } = useCustomerListFilters()
  const { change, pending, pendingId, confirm, cancel } = useAccountStatus(load.reload)
  const statusBusy = useBusyIndicator(pendingId !== null)
  const all = customerAccounts(db, session)
  const rows = all.filter(a => matchesStatus(a.active, status) && matchesQuery(query, a.name, a.email))
  const canCreate = can(session.role, 'customer-account:create')
  const canManage = can(session.role, 'customer-account:deactivate')
  const primaryName = (a: Account) => {
    const c = db.contacts.find(x => x.id === a.primaryContactId)
    return c ? fullName(c) : ''
  }

  const columns: Column<Account>[] = [
    {
      key: 'name',
      header: 'Account name',
      sortValue: a => a.name,
      render: a => <AppLink to={editAccountUrl(a.id)}>{a.name}</AppLink>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: a => (a.active ? 'Active' : 'Inactive'),
      render: a => <StatusBadge status={a.active ? 'Active' : 'Inactive'} tone={a.active ? 'green' : 'slate'} />,
    },
    { key: 'primary', header: 'Primary contact', sortValue: primaryName, render: a => primaryName(a) || '—' },
    {
      key: 'email',
      header: 'Email',
      sortValue: a => a.email ?? '',
      render: a => (a.email ? <FluentLink href={`mailto:${a.email}`}>{a.email}</FluentLink> : '—'),
    },
    { key: 'phone', header: 'Phone', sortValue: a => a.phone ?? '', render: a => a.phone || '—', className: 'whitespace-nowrap' },
    { key: 'address', header: 'Address', sortValue: a => formatAddress(a.address), render: a => formatAddress(a.address) || '—' },
    createdOnColumn<Account>(),
  ]

  const createButton = (
    <ButtonLink to={CREATE_ACCOUNT_URL} variant="primary" icon={<Add20Regular />}>
      Create account
    </ButtonLink>
  )

  const crumbs = [{ label: 'Customers', to: '/customers/' }, { label: 'Customer accounts' }]
  if (load.status === 'loading') return <PageSkeleton variant="list" />
  if (load.status === 'error') return <LoadError title="Customer accounts" breadcrumbs={crumbs} error={load.error} onRetry={load.reload} />

  return (
    <Container>
      <PageHeader
        title="Customer accounts"
        breadcrumbs={crumbs}
        description="Customer accounts managed by your partner organization."
        actions={canCreate && createButton}
      />
      <DataTable
        caption="Customer accounts"
        columns={columns}
        rows={rows}
        rowKey={a => a.id}
        pageSize={10}
        initialSort={{ key: 'name', dir: 'asc' }}
        toolbar={
          all.length > 0 && (
            <ListToolbar idPrefix="accounts" searchLabel="Search by name or email" query={query} onQuery={setQuery} status={status} onStatus={setStatus} />
          )
        }
        empty={
          all.length === 0
            ? {
                title: 'No customer accounts yet',
                body: canCreate
                  ? 'Add the organizations you sell to, so you can register opportunities and keep their contacts in one place.'
                  : 'Customer accounts your organization manages will appear here.',
                action: canCreate ? (
                  <ButtonLink to={CREATE_ACCOUNT_URL} icon={<Add20Regular />}>
                    Create account
                  </ButtonLink>
                ) : undefined,
              }
            : noMatches('accounts', showAll)
        }
        actions={
          canManage
            ? a => (
                <Menu positioning="below-end">
                  <MenuTrigger disableButtonEnhancement>
                    <FluentButton
                      appearance="subtle"
                      icon={statusBusy && pendingId === a.id ? <Spinner size="tiny" aria-hidden="true" /> : <MoreHorizontal20Regular />}
                      aria-busy={(statusBusy && pendingId === a.id) || undefined}
                      aria-label={`More actions for ${a.name}`}
                      title={`More actions for ${a.name}`}
                    />
                  </MenuTrigger>
                  <MenuPopover>
                    <MenuList>
                      <MenuItem icon={a.active ? <Prohibited20Regular /> : <CheckmarkCircle20Regular />} onClick={() => change(a)}>
                        {a.active ? 'Deactivate account' : 'Activate account'}
                      </MenuItem>
                    </MenuList>
                  </MenuPopover>
                </Menu>
              )
            : undefined
        }
      />
      <AccountStatusDialog accountName={pending?.name ?? null} onConfirm={confirm} onClose={cancel} />
    </Container>
  )
}
