import { Link as FluentLink } from '@fluentui/react-components'
import { Add20Regular } from '@fluentui/react-icons'
import { Container } from '../../components/Layout'
import { AppLink, ButtonLink, PageHeader, StatusBadge } from '../../components/ui'
import { DataTable, type Column } from '../../components/DataTable'
import { createdOnColumn } from '../../components/createdOnColumn'
import { useApp } from '../../store/AppStore'
import { can, customerAccounts, customerContacts } from '../../lib/access'
import { fullName } from '../../lib/format'
import type { Contact } from '../../data/types'
import { createContactUrl, editAccountUrl, editContactUrl } from './shared'
import { ListToolbar, matchesQuery, matchesStatus, noMatches, useCustomerListFilters } from './ListToolbar'
import { LoadError } from './LoadError'
import { PageSkeleton } from '../../components/skeletons'
import { asLoad, useLiveLoad } from '../../services/useLiveLoad'
import { loadCustomerLists } from '../../services/customers'

export default function CustomerContacts() {
  const { db, session, sessionReady } = useApp()
  const load = useLiveLoad(sessionReady ? `customers:lists:${session.partnerId ?? ''}` : null, asLoad(signal => loadCustomerLists(session.partnerId, signal)))
  const { query, setQuery, status, setStatus, showAll } = useCustomerListFilters()
  const accounts = new Map(customerAccounts(db, session).map(a => [a.id, a]))
  const accountName = (c: Contact) => (c.parentAccountId ? accounts.get(c.parentAccountId)?.name ?? '' : '')
  const all = customerContacts(db, session)
  const rows = all.filter(c => matchesStatus(c.active, status) && matchesQuery(query, fullName(c), c.email))
  const canCreate = can(session.role, 'customer-contact:create')

  const columns: Column<Contact>[] = [
    {
      key: 'name',
      header: 'Full name',
      sortValue: c => fullName(c),
      render: c => <AppLink to={editContactUrl(c.id)}>{fullName(c)}</AppLink>,
    },
    {
      key: 'account',
      header: 'Account',
      sortValue: accountName,
      render: c => (c.parentAccountId && accountName(c) ? <AppLink to={editAccountUrl(c.parentAccountId)}>{accountName(c)}</AppLink> : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: c => (c.active ? 'Active' : 'Inactive'),
      render: c => <StatusBadge status={c.active ? 'Active' : 'Inactive'} tone={c.active ? 'green' : 'slate'} />,
    },
    { key: 'title', header: 'Job title', sortValue: c => c.jobTitle ?? '', render: c => c.jobTitle || '—' },
    {
      key: 'email',
      header: 'Email',
      sortValue: c => c.email ?? '',
      render: c => (c.email ? <FluentLink href={`mailto:${c.email}`}>{c.email}</FluentLink> : '—'),
    },
    { key: 'phone', header: 'Phone', sortValue: c => c.phone ?? '', render: c => c.phone || '—', className: 'whitespace-nowrap' },
    createdOnColumn<Contact>(),
  ]

  const createButton = (
    <ButtonLink to={createContactUrl()} variant="primary" icon={<Add20Regular />}>
      Create contact
    </ButtonLink>
  )

  const crumbs = [{ label: 'Customers', to: '/customers/' }, { label: 'Customer contacts' }]
  if (load.status === 'loading') return <PageSkeleton variant="list" />
  if (load.status === 'error') return <LoadError title="Customer contacts" breadcrumbs={crumbs} error={load.error} onRetry={load.reload} />

  return (
    <Container>
      <PageHeader
        title="Customer contacts"
        breadcrumbs={crumbs}
        description="Contacts at the customer accounts managed by your partner organization."
        actions={canCreate && createButton}
      />
      <DataTable
        caption="Customer contacts"
        columns={columns}
        rows={rows}
        rowKey={c => c.id}
        pageSize={10}
        initialSort={{ key: 'name', dir: 'asc' }}
        toolbar={
          all.length > 0 && (
            <ListToolbar idPrefix="contacts" searchLabel="Search by name or email" query={query} onQuery={setQuery} status={status} onStatus={setStatus} />
          )
        }
        empty={
          all.length === 0
            ? {
                title: 'No customer contacts yet',
                body: canCreate
                  ? 'Add the people you work with at each customer account.'
                  : 'Contacts at your customer accounts will appear here.',
                action: canCreate ? <ButtonLink to={createContactUrl()} icon={<Add20Regular />}>Create contact</ButtonLink> : undefined,
              }
            : noMatches('contacts', showAll)
        }
      />
    </Container>
  )
}
