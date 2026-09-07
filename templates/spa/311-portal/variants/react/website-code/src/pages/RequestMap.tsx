import { useState, useMemo, useCallback } from 'react'
import { useCategories } from '../shared/hooks/useCategories'
import { useServiceTypes } from '../shared/hooks/useServiceTypes'
import { useServiceRequests } from '../shared/hooks/useServiceRequests'
import { useI18n } from '../i18n'
import type { RequestStatus } from '../types/serviceRequest'
import LeafletMap, { type MapMarker } from '../components/LeafletMap'
import Icon from '../components/Icon'
import { SkeletonMap } from '../components/Skeleton'
import './RequestMap.css'

export default function RequestMap() {
  const { categories, isLoading: categoriesLoading } = useCategories()
  const { serviceTypes } = useServiceTypes()
  const { items: requests, totalCount, isLoading: requestsLoading, error } = useServiceRequests({ pageSize: 100 })
  const { t, language } = useI18n()
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [keyword, setKeyword] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const STATUS_OPTIONS: { value: RequestStatus | ''; labelKey: string }[] = [
    { value: '', labelKey: 'requestMap.allStatuses' },
    { value: 'submitted', labelKey: 'status.submitted' },
    { value: 'reviewed', labelKey: 'status.reviewed' },
    { value: 'assigned', labelKey: 'status.assigned' },
    { value: 'in-progress', labelKey: 'status.inProgress' },
    { value: 'resolved', labelKey: 'status.resolved' },
    { value: 'closed', labelKey: 'status.closed' },
  ]

  const dateLocale = language === 'fr' ? 'fr-CA' : 'en-US'

  const categoryById = useMemo(
    () => new Map(categories.map(c => [c.id, c])),
    [categories]
  )

  const serviceTypeById = useMemo(
    () => new Map(serviceTypes.map(st => [st.id, st])),
    [serviceTypes]
  )

  const getServiceTypeByIdFn = useCallback(
    (id: string) => serviceTypeById.get(id),
    [serviceTypeById]
  )

  const filtered = useMemo(() => {
    const filterCategoryName = categoryFilter
      ? categories.find(c => c.id === categoryFilter)?.name?.toLowerCase() ?? ''
      : ''

    return requests.filter(r => {
      if (categoryFilter) {
        const matchById = r.categoryId === categoryFilter
        const matchByDept = filterCategoryName && r.department?.toLowerCase().startsWith(filterCategoryName)
        if (!matchById && !matchByDept) return false
      }
      if (statusFilter && r.status !== statusFilter) return false
      if (keyword) {
        const q = keyword.toLowerCase()
        const serviceType = getServiceTypeByIdFn(r.serviceTypeId)
        if (
          !r.description.toLowerCase().includes(q) &&
          !r.address.toLowerCase().includes(q) &&
          !(serviceType?.name.toLowerCase().includes(q))
        ) return false
      }
      return true
    })
  }, [requests, categories, categoryFilter, statusFilter, keyword, getServiceTypeByIdFn])

  // Find the most recently created request among the filtered set
  const latestRequestId = useMemo(() => {
    if (filtered.length === 0) return null
    let latest = filtered[0]
    for (const r of filtered) {
      if (r.createdOn > latest.createdOn) latest = r
    }
    return latest.id
  }, [filtered])

  const mapMarkers: MapMarker[] = useMemo(() => {
    const hashToOffset = (id: string, range: number) => {
      let h = 0
      for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
      return (Math.abs(h) % 1000) / 1000 * range - range / 2
    }

    return filtered.map(r => {
      const st = getServiceTypeByIdFn(r.serviceTypeId)
      const isLatest = r.id === latestRequestId
      const color = isLatest
        ? '#d4853a'
        : r.status === 'resolved' || r.status === 'closed'
        ? '#3d8b7a'
        : r.urgency === 'high'
        ? '#c0392b'
        : '#1b4965'
      const lat = r.latitude || (40.7128 + hashToOffset(r.id, 0.12))
      const lng = r.longitude || (-74.006 + hashToOffset(r.id + 'x', 0.15))
      return {
        id: r.id,
        lat,
        lng,
        color,
        radius: isLatest ? 10 : 7,
        title: st?.name || r.serviceTypeName || r.department || 'Service Request',
        popup: `<strong>${st?.name || r.serviceTypeName || r.department || 'Request'}</strong><br/>${r.address || 'No address'}<br/><em>${r.status}</em>${isLatest ? '<br/><strong style="color:#d4853a">Latest</strong>' : ''}`,
      }
    })
  }, [filtered, getServiceTypeByIdFn, latestRequestId])

  if (requestsLoading) {
    return <SkeletonMap />
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <h1 className="page-title animate-in animate-in-1">{t('requestMap.title')}</h1>
          <p className="page-subtitle animate-in animate-in-2">
            {totalCount} {language === 'fr' ? 'demandes de service dans la ville' : 'service requests across the city'}. {language === 'fr' ? 'Vie priv\u00e9e prot\u00e9g\u00e9e \u2014 aucune information personnelle n\u2019est affich\u00e9e.' : 'Privacy protected \u2014 no personal information is shown.'}
          </p>
        </div>

        {error && (
          <div className="card" style={{ padding: 16, marginBottom: 16, textAlign: 'center' }}>
            <p style={{ color: 'var(--color-error)', fontSize: '0.875rem' }}>{t('requestMap.error')} {error}</p>
          </div>
        )}

        {/* Map area */}
        <div className="reqmap-map animate-in animate-in-3">
          <LeafletMap
            height={420}
            markers={mapMarkers}
            center={[40.7128, -74.006]}
            zoom={11}
          />
        </div>

        {/* Filters */}
        <div className="reqmap-filters animate-in animate-in-4">
          <div className="form-group" style={{ flex: 1, minWidth: 160 }}>
            <label htmlFor="cat-filter" className="form-label">{t('requestMap.category')}</label>
            <select id="cat-filter" className="form-input" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="">{t('requestMap.allCategories')}</option>
              {categoriesLoading ? (
                <option disabled>{t('requestMap.loadingCategories')}</option>
              ) : (
                categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))
              )}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
            <label htmlFor="status-filter" className="form-label">{t('requestMap.status')}</label>
            <select id="status-filter" className="form-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
            <label htmlFor="keyword-filter" className="form-label">{t('requestMap.keyword')}</label>
            <input
              id="keyword-filter"
              type="search"
              className="form-input"
              placeholder={t('requestMap.searchPlaceholder')}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ minWidth: 80 }}>
            <span className="form-label">{t('requestMap.view')}</span>
            <div className="reqmap-view-toggle" role="group" aria-label={t('requestMap.view')}>
              <button
                type="button"
                className={`reqmap-view-btn ${view === 'grid' ? 'active' : ''}`}
                onClick={() => setView('grid')}
                aria-label="Grid view"
                aria-pressed={view === 'grid'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                </svg>
              </button>
              <button
                type="button"
                className={`reqmap-view-btn ${view === 'list' ? 'active' : ''}`}
                onClick={() => setView('list')}
                aria-label="List view"
                aria-pressed={view === 'list'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="reqmap-results-info">
          <span>{filtered.length} {language === 'fr' ? (filtered.length !== 1 ? 'demandes trouv\u00e9es' : 'demande trouv\u00e9e') : (filtered.length !== 1 ? 'requests found' : 'request found')}</span>
        </div>

        {view === 'grid' ? (
          <div className="reqmap-grid">
            {filtered.map(r => {
              const st = getServiceTypeByIdFn(r.serviceTypeId)
              const cat = categoryById.get(r.categoryId)
              return (
                <div key={r.id} className="card reqmap-card">
                  <div className="reqmap-card-header">
                    <span style={{ color: 'var(--color-primary)' }}><Icon name={st?.slug || ''} size={20} /></span>
                    <span className={`badge ${r.status === 'resolved' || r.status === 'closed' ? 'badge-success' : r.urgency === 'high' ? 'badge-error' : r.status === 'submitted' ? 'badge-neutral' : 'badge-info'}`}>
                      {r.status.replace('-', ' ')}
                    </span>
                  </div>
                  <h2 className="reqmap-card-title">{st?.name || r.serviceTypeName || 'Service Request'}</h2>
                  <p className="reqmap-card-addr">{r.address}</p>
                  <p className="reqmap-card-desc">{r.description}</p>
                  <div className="reqmap-card-footer">
                    {cat && <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name={cat.slug} type="category" size={14} /> {cat.name}</span>}
                    <span className="reqmap-card-date">
                      {new Date(r.createdOn).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="reqmap-list">
            {filtered.map(r => {
              const st = getServiceTypeByIdFn(r.serviceTypeId)
              const cat = categoryById.get(r.categoryId)
              return (
                <div key={r.id} className="card reqmap-list-item">
                  <span style={{ color: 'var(--color-primary)', flexShrink: 0 }}><Icon name={st?.slug || ''} size={20} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.9375rem' }}>{st?.name || r.serviceTypeName}</strong>
                      {cat && <span className="badge badge-primary">{cat.name}</span>}
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{r.address}</p>
                  </div>
                  <span className={`badge ${r.status === 'resolved' || r.status === 'closed' ? 'badge-success' : r.urgency === 'high' ? 'badge-error' : 'badge-info'}`}>
                    {r.status.replace('-', ' ')}
                  </span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-light)', whiteSpace: 'nowrap' }}>
                    {new Date(r.createdOn).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
