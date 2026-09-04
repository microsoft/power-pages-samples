import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, Plus, XCircle, ShoppingCart, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react'
import { usePurchaseOrderList } from '../data/purchaseOrderProvider'
import { formatCurrency, formatDate } from '../data/invoiceProvider'
import { useAuthorization } from '../hooks/useAuthorization'
import StatusBadge from '../components/StatusBadge'
import usePageTitle from '../hooks/usePageTitle'

const allStatuses = ['All', 'Draft', 'Issued', 'Partially Invoiced', 'Fully Invoiced', 'Closed', 'Cancelled']

type SortKey = 'poNumber' | 'totalAmount' | 'status' | 'deliveryDate' | 'createdOn'
type SortDir = 'asc' | 'desc'

export default function PurchaseOrderList() {
  const { isReviewer } = useAuthorization()
  usePageTitle(isReviewer ? 'Purchase Orders' : 'My Purchase Orders')

  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdOn')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const hasActiveFilters = statusFilter !== 'All' || search.trim() !== ''

  function clearFilters() {
    setStatusFilter('All')
    setSearch('')
  }

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

  const { purchaseOrders: filtered, isLoading, error, refetch } = usePurchaseOrderList({
    status: statusFilter === 'All' ? undefined : statusFilter,
    search: search.trim() || undefined,
    sortKey,
    sortDir,
  })

  return (
    <div style={{ maxWidth: 1100 }}>
      <nav aria-label="Breadcrumb" style={{ marginBottom: 16, fontSize: '0.85rem' }}>
        <Link to="/dashboard" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Dashboard</Link>
        <span style={{ margin: '0 8px', color: 'var(--color-border)' }}>/</span>
        <span style={{ color: 'var(--color-text)' }}>{isReviewer ? 'Purchase Orders' : 'My POs'}</span>
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
            {isReviewer ? 'Purchase Orders' : 'My Purchase Orders'}
          </h1>
          <p style={{ fontSize: '0.925rem', color: 'var(--color-text-muted)' }}>
            {isReviewer ? 'Manage purchase orders for all suppliers.' : 'View purchase orders issued to you.'}
          </p>
        </div>
        {isReviewer && (
          <Link to="/purchase-orders/new" className="btn-primary-sm">
            <Plus size={16} aria-hidden="true" /> Create PO
          </Link>
        )}
      </div>

      {/* Filters */}
      <div
        className="animate-in animate-in-2"
        style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}
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
          <label htmlFor="po-status-filter" className="sr-only">
            Filter by status
          </label>
          <select
            id="po-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
            {allStatuses.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All Statuses' : s}
              </option>
            ))}
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
          <label htmlFor="search-pos" className="sr-only">
            Search purchase orders
          </label>
          <input
            id="search-pos"
            type="search"
            placeholder="Search purchase orders..."
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

        {hasActiveFilters && (
          <button onClick={clearFilters} className="btn-clear-filter">
            <XCircle size={14} aria-hidden="true" /> Clear filters
          </button>
        )}
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
                <th className="th-sortable" style={{ padding: '10px 24px', fontWeight: 500 }} onClick={() => handleSort('poNumber')} tabIndex={0} role="columnheader" aria-sort={ariaSortValue('poNumber')} onKeyDown={(e) => handleSortKeyDown(e, 'poNumber')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>PO #<SortIcon col="poNumber" /></span>
                </th>
                <th style={{ padding: '10px 16px', fontWeight: 500 }}>Supplier</th>
                <th className="th-sortable" style={{ padding: '10px 16px', fontWeight: 500 }} onClick={() => handleSort('totalAmount')} tabIndex={0} role="columnheader" aria-sort={ariaSortValue('totalAmount')} onKeyDown={(e) => handleSortKeyDown(e, 'totalAmount')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Total<SortIcon col="totalAmount" /></span>
                </th>
                <th style={{ padding: '10px 16px', fontWeight: 500 }}>Invoiced</th>
                <th style={{ padding: '10px 16px', fontWeight: 500 }}>Remaining</th>
                <th className="th-sortable" style={{ padding: '10px 16px', fontWeight: 500 }} onClick={() => handleSort('status')} tabIndex={0} role="columnheader" aria-sort={ariaSortValue('status')} onKeyDown={(e) => handleSortKeyDown(e, 'status')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Status<SortIcon col="status" /></span>
                </th>
                <th className="th-sortable" style={{ padding: '10px 24px', fontWeight: 500 }} onClick={() => handleSort('deliveryDate')} tabIndex={0} role="columnheader" aria-sort={ariaSortValue('deliveryDate')} onKeyDown={(e) => handleSortKeyDown(e, 'deliveryDate')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>Delivery Date<SortIcon col="deliveryDate" /></span>
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
                      <td style={{ padding: '14px 16px' }}><div className="skeleton" style={{ width: '50%', height: 14 }} /></td>
                      <td style={{ padding: '14px 16px' }}><div className="skeleton" style={{ width: '50%', height: 14 }} /></td>
                      <td style={{ padding: '14px 16px' }}><div className="skeleton skeleton-badge" /></td>
                      <td style={{ padding: '14px 24px' }}><div className="skeleton" style={{ width: '60%', height: 14 }} /></td>
                    </tr>
                  ))}
                </>
              ) : error ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center' }}>
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
                  <td colSpan={7} style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <ShoppingCart size={36} color="var(--color-text-muted)" aria-hidden="true" style={{ marginBottom: 12 }} />
                    {!isReviewer ? (
                      <>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 16 }}>
                          Purchase orders are created by reviewers. Once a PO is issued to you, it will appear here.
                        </p>
                        <Link to="/invoices/new" className="btn-primary-sm">
                          Submit an Invoice
                        </Link>
                      </>
                    ) : (
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.925rem' }}>
                        No purchase orders found.
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((po) => (
                  <tr
                    key={po.id}
                    className="row-interactive"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                  >
                    <td style={{ padding: '14px 24px', fontWeight: 500, fontSize: '0.9rem' }}>
                      <Link className="row-primary-link" to={`/purchase-orders/${po.id}`}>
                        {po.poNumber}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{po.supplierName}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem', fontFamily: 'var(--font-heading)', fontWeight: 500 }}>{formatCurrency(po.totalAmount)}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{formatCurrency(po.invoicedAmount)}</td>
                    <td style={{ padding: '14px 16px', fontSize: '0.9rem', fontFamily: 'var(--font-heading)', fontWeight: 500 }}>{formatCurrency(po.remainingAmount)}</td>
                    <td style={{ padding: '14px 16px' }}><StatusBadge status={po.status} /></td>
                    <td style={{ padding: '14px 24px', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{formatDate(po.deliveryDate)}</td>
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
          {filtered.length} purchase order{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}
