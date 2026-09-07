import { useState, useMemo, useCallback } from 'react'
import { Lock } from 'lucide-react'
import { useCategories } from '../shared/hooks/useCategories'
import { useServiceTypes } from '../shared/hooks/useServiceTypes'
import { useServiceRequests, useUpdateServiceRequest } from '../shared/hooks/useServiceRequests'
import { useCreateStatusUpdate } from '../shared/hooks/useStatusUpdates'
import type { ServiceRequest, RequestStatus } from '../types/serviceRequest'
import type { ServiceType } from '../types/serviceType'
import Icon from '../components/Icon'
import { SkeletonTable } from '../components/Skeleton'
import './Admin.css'

const STATUS_OPTIONS: RequestStatus[] = ['submitted', 'reviewed', 'assigned', 'in-progress', 'resolved', 'closed']

function getSLAStatus(request: ServiceRequest, serviceType: ServiceType | undefined): 'on-time' | 'at-risk' | 'breached' {
  if (!serviceType) return 'on-time'
  if (request.status === 'resolved' || request.status === 'closed') return 'on-time'

  const created = new Date(request.createdOn)
  const now = new Date()
  const daysPassed = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
  const slaDays = serviceType.slaDays

  if (daysPassed > slaDays) return 'breached'
  if (daysPassed > slaDays * 0.7) return 'at-risk'
  return 'on-time'
}

export default function Admin() {
  const { categories } = useCategories()
  const { serviceTypes } = useServiceTypes()
  const { items: requests, isLoading, error, refetch } = useServiceRequests({ pageSize: 100 })
  const { update: updateRequest } = useUpdateServiceRequest()
  const { create: createStatusUpdateRecord } = useCreateStatusUpdate()

  const [isAdmin, setIsAdmin] = useState(false)
  const [sortField, setSortField] = useState<'createdOn' | 'status' | 'urgency'>('createdOn')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [statusFilter, setStatusFilter] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [updateNote, setUpdateNote] = useState('')

  // Build an id-to-category lookup
  const categoryById = useMemo(
    () => new Map(categories.map(c => [c.id, c])),
    [categories]
  )

  // Build an id-to-serviceType lookup from the API data
  const serviceTypeById = useMemo(
    () => new Map(serviceTypes.map(st => [st.id, st])),
    [serviceTypes]
  )

  const getServiceTypeByIdFn = useCallback(
    (id: string) => serviceTypeById.get(id),
    [serviceTypeById]
  )

  if (!isAdmin) {
    return (
      <div className="page">
        <div className="container" style={{ maxWidth: 500 }}>
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(27, 73, 101, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', margin: '0 auto 16px' }}><Lock size={32} /></div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Admin Access</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
              This is a dev-only admin panel for managing service requests.
            </p>
            <button className="btn btn-primary btn-lg" onClick={() => setIsAdmin(true)}>
              Enter Admin Panel
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <SkeletonTable rows={8} />
  }

  if (error) {
    return (
      <div className="page">
        <div className="container">
          <div className="card" style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ color: 'var(--color-error)' }}>Failed to load requests: {error}</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={refetch}>Retry</button>
          </div>
        </div>
      </div>
    )
  }

  const sorted = [...requests]
    .filter(r => !statusFilter || r.status === statusFilter)
    .sort((a, b) => {
      let compare = 0
      if (sortField === 'createdOn') compare = new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime()
      if (sortField === 'status') compare = STATUS_OPTIONS.indexOf(a.status) - STATUS_OPTIONS.indexOf(b.status)
      if (sortField === 'urgency') {
        const order = { high: 3, medium: 2, low: 1 }
        compare = order[a.urgency] - order[b.urgency]
      }
      return sortDir === 'desc' ? -compare : compare
    })

  function handleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  async function updateStatus(id: string, newStatus: RequestStatus) {
    await updateRequest(id, { status: newStatus })

    // Log the status change in the spa311_statusupdate timeline table.
    const statusLabel = newStatus.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
    await createStatusUpdateRecord({
      name: `Status changed to ${statusLabel}`,
      status: newStatus,
      updateDate: new Date().toISOString(),
      note: updateNote || `Status updated to ${statusLabel}.`,
      serviceRequestId: id,
    })

    setEditingId(null)
    setUpdateNote('')
    refetch()
  }

  async function updateDepartment(id: string, dept: string) {
    await updateRequest(id, { department: dept })
    refetch()
  }

  const statusCounts = STATUS_OPTIONS.map(s => ({
    status: s,
    count: requests.filter(r => r.status === s).length,
  }))

  return (
    <div className="page">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 className="page-title">Admin Dashboard</h1>
            <p className="page-subtitle">Manage incoming service requests</p>
          </div>
          <button className="btn btn-ghost" onClick={() => setIsAdmin(false)}>
            Lock Admin
          </button>
        </div>

        {/* Status summary */}
        <div className="admin-status-bar">
          {statusCounts.map(({ status, count }) => (
            <button
              type="button"
              key={status}
              className={`admin-status-chip ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
              aria-pressed={statusFilter === status}
            >
              <span className="admin-chip-count">{count}</span>
              <span className="admin-chip-label">{status.replace('-', ' ')}</span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="admin-table-wrap card" style={{ padding: 0, overflow: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Service</th>
                <th aria-sort={sortField === 'status' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="admin-sort-button" onClick={() => handleSort('status')}>
                    Status {sortField === 'status' ? (sortDir === 'asc' ? '\u2191' : '\u2193') : ''}
                  </button>
                </th>
                <th aria-sort={sortField === 'urgency' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="admin-sort-button" onClick={() => handleSort('urgency')}>
                    Urgency {sortField === 'urgency' ? (sortDir === 'asc' ? '\u2191' : '\u2193') : ''}
                  </button>
                </th>
                <th>SLA</th>
                <th>Department</th>
                <th aria-sort={sortField === 'createdOn' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="admin-sort-button" onClick={() => handleSort('createdOn')}>
                    Created {sortField === 'createdOn' ? (sortDir === 'asc' ? '\u2191' : '\u2193') : ''}
                  </button>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => {
                const st = getServiceTypeByIdFn(r.serviceTypeId)
                const cat = categoryById.get(r.categoryId)
                const sla = getSLAStatus(r, st)
                const isEditing = editingId === r.id

                return (
                  <tr key={r.id} className={isEditing ? 'editing' : ''}>
                    <td>
                      <span className="admin-id">{r.requestNumber || r.id}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: 'var(--color-primary)' }}><Icon name={st?.slug || ''} size={18} /></span>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '0.8125rem' }}>{st?.name || r.serviceTypeName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>{cat?.name || r.categoryName}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {isEditing ? (
                        <select
                          className="form-input"
                          style={{ padding: '6px 8px', fontSize: '0.8125rem', minHeight: 32 }}
                          value={r.status}
                          onChange={e => updateStatus(r.id, e.target.value as RequestStatus)}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s.replace('-', ' ')}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`badge ${r.status === 'resolved' || r.status === 'closed' ? 'badge-success' : r.status === 'submitted' ? 'badge-neutral' : 'badge-info'}`}>
                          {r.status.replace('-', ' ')}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${r.urgency === 'high' ? 'badge-error' : r.urgency === 'medium' ? 'badge-warning' : 'badge-neutral'}`}>
                        {r.urgency}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-sla admin-sla-${sla}`}>
                        {sla === 'on-time' ? '\u2713' : sla === 'at-risk' ? '\u26A0' : '\u2717'} {sla.replace('-', ' ')}
                      </span>
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '6px 8px', fontSize: '0.8125rem', minHeight: 32, minWidth: 140 }}
                          value={r.department}
                          onChange={e => updateDepartment(r.id, e.target.value)}
                          placeholder="Assign department"
                        />
                      ) : (
                        <span style={{ fontSize: '0.8125rem', color: r.department ? 'var(--color-text)' : 'var(--color-text-light)' }}>
                          {r.department || 'Unassigned'}
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {new Date(r.createdOn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <input
                            type="text"
                            className="form-input"
                            style={{ padding: '6px 8px', fontSize: '0.75rem', minHeight: 32, minWidth: 120 }}
                            value={updateNote}
                            onChange={e => setUpdateNote(e.target.value)}
                            placeholder="Update note..."
                          />
                          <button className="btn btn-sm btn-ghost" onClick={() => { setEditingId(null); setUpdateNote('') }}>
                            Done
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => setEditingId(r.id)}
                          style={{ fontSize: '0.8125rem' }}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
