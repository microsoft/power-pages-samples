import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, ClipboardCheck, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react'
import { useInvoiceList, formatCurrency, formatDate } from '../data/invoiceProvider'
import StatusBadge from '../components/StatusBadge'
import usePageTitle from '../hooks/usePageTitle'

type SortKey = 'invoiceNumber' | 'amount' | 'status' | 'submissionDate'
type SortDir = 'asc' | 'desc'

export default function ReviewQueue() {
  usePageTitle('Review Queue')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Submitted'>('All')
  const [sortKey, setSortKey] = useState<SortKey>('submissionDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const filterStatus = statusFilter === 'All' ? undefined : statusFilter

  const { invoices: allInvoices, isLoading, error, refetch } = useInvoiceList({
    status: filterStatus,
    search: search.trim() || undefined,
    sortKey,
    sortDir,
    pageSize: 50,
  })

  // If no specific filter, show only invoices waiting for review.
  const filtered = statusFilter === 'All'
    ? allInvoices.filter(i => i.status === 'Submitted')
    : allInvoices

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function handleSortKeyDown(e: React.KeyboardEvent, key: SortKey) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleSort(key)
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown size={12} style={{ opacity: 0.35, marginLeft: 4 }} aria-hidden="true" />
    if (sortDir === 'asc') return <ArrowUp size={12} style={{ marginLeft: 4 }} aria-hidden="true" />
    return <ArrowDown size={12} style={{ marginLeft: 4 }} aria-hidden="true" />
  }

  function ariaSortValue(key: SortKey): 'ascending' | 'descending' | undefined {
    if (sortKey !== key) return undefined
    return sortDir === 'asc' ? 'ascending' : 'descending'
  }

  const thStyle: React.CSSProperties = {
    padding: '10px 16px',
    fontWeight: 500,
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <nav aria-label="Breadcrumb" style={{ marginBottom: 16, fontSize: '0.85rem' }}>
        <Link to="/dashboard" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ margin: '0 8px', color: 'var(--color-border)' }}>/</span>
        <span style={{ color: 'var(--color-text)' }}>Review Queue</span>
      </nav>
      <div
        className="animate-in"
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.5rem',
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Review Queue
          </h1>
          <p style={{ fontSize: '0.925rem', color: 'var(--color-text-muted)' }}>
            Invoices awaiting your review.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div
        className="animate-in animate-in-2"
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative' }}>
          <Filter
            size={15}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
            }}
          />
          <label htmlFor="queue-status-filter" className="sr-only">
            Filter by status
          </label>
          <select
            id="queue-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Submitted')}
            style={{
              paddingLeft: 34,
              paddingRight: 14,
              height: 40,
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              fontSize: '0.875rem',
              color: 'var(--color-text)',
              cursor: 'pointer',
            }}
          >
            <option value="All">All Queue</option>
            <option value="Submitted">Submitted</option>
          </select>
        </div>

        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 360 }}>
          <Search
            size={15}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
            }}
          />
          <label htmlFor="search-queue" className="sr-only">
            Search invoices
          </label>
          <input
            id="search-queue"
            type="search"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 36,
              height: 40,
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              fontSize: '0.875rem',
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div
        className="animate-in animate-in-3"
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr
                style={{
                  background: 'var(--color-bg)',
                  fontSize: '0.8rem',
                  color: 'var(--color-text-muted)',
                  textAlign: 'left',
                }}
              >
                <th className="th-sortable" style={{ ...thStyle, paddingLeft: 24 }} onClick={() => handleSort('invoiceNumber')} tabIndex={0} role="columnheader" aria-sort={ariaSortValue('invoiceNumber')} onKeyDown={(e) => handleSortKeyDown(e, 'invoiceNumber')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Invoice #<SortIcon col="invoiceNumber" /></span>
                </th>
                <th style={thStyle}>Supplier</th>
                <th className="th-sortable" style={thStyle} onClick={() => handleSort('amount')} tabIndex={0} role="columnheader" aria-sort={ariaSortValue('amount')} onKeyDown={(e) => handleSortKeyDown(e, 'amount')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Amount<SortIcon col="amount" /></span>
                </th>
                <th className="th-sortable" style={thStyle} onClick={() => handleSort('status')} tabIndex={0} role="columnheader" aria-sort={ariaSortValue('status')} onKeyDown={(e) => handleSortKeyDown(e, 'status')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Status<SortIcon col="status" /></span>
                </th>
                <th className="th-sortable" style={{ ...thStyle, paddingRight: 24 }} onClick={() => handleSort('submissionDate')} tabIndex={0} role="columnheader" aria-sort={ariaSortValue('submissionDate')} onKeyDown={(e) => handleSortKeyDown(e, 'submissionDate')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Submitted<SortIcon col="submissionDate" /></span>
                </th>
              </tr>
            </thead>
            <tbody className={isLoading ? 'table-loading' : ''}>
              {isLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map(n => (
                    <tr key={n} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '14px 24px' }}><div className="skeleton" style={{ width: '80%', height: 14 }} /></td>
                      <td style={{ padding: '14px 16px' }}><div className="skeleton" style={{ width: '70%', height: 14 }} /></td>
                      <td style={{ padding: '14px 16px' }}><div className="skeleton" style={{ width: '50%', height: 14 }} /></td>
                      <td style={{ padding: '14px 16px' }}><div className="skeleton skeleton-badge" /></td>
                      <td style={{ padding: '14px 24px' }}><div className="skeleton" style={{ width: '60%', height: 14 }} /></td>
                    </tr>
                  ))}
                </>
              ) : error ? (
                <tr>
                  <td colSpan={5} style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <AlertTriangle size={40} color="var(--color-error)" aria-hidden="true" style={{ marginBottom: 12 }} />
                    <p style={{ color: 'var(--color-text)', fontSize: '0.95rem', fontWeight: 500, marginBottom: 8 }}>
                      Something went wrong
                    </p>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: 16 }}>
                      We couldn&apos;t load the data. Check your connection and try again.
                    </p>
                    <button onClick={() => refetch()} className="btn-primary-sm">
                      Try Again
                    </button>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: '48px 24px',
                      textAlign: 'center',
                    }}
                  >
                    <ClipboardCheck size={36} color="var(--color-text-muted)" aria-hidden="true" style={{ marginBottom: 12 }} />
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.925rem' }}>
                      No invoices awaiting review. You&apos;re all caught up!
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    className="row-interactive"
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <td
                      style={{
                        padding: '14px 24px',
                        fontWeight: 500,
                        fontSize: '0.9rem',
                      }}
                    >
                      <Link className="row-primary-link" to={`/invoices/${inv.id}`}>
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                      {inv.company}
                    </td>
                    <td
                      style={{
                        padding: '14px 16px',
                        fontSize: '0.9rem',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 500,
                      }}
                    >
                      {formatCurrency(inv.amount)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={inv.status} />
                    </td>
                    <td
                      style={{
                        padding: '14px 24px',
                        fontSize: '0.875rem',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {formatDate(inv.submissionDate)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            padding: '12px 24px',
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {filtered.length} invoice{filtered.length !== 1 ? 's' : ''} in queue
        </div>
      </div>
    </div>
  )
}
