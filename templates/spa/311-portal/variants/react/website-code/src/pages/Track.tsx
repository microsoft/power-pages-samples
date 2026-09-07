import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useCategories } from '../shared/hooks/useCategories'
import { useServiceTypes } from '../shared/hooks/useServiceTypes'
import { useServiceRequestByNumber } from '../shared/hooks/useServiceRequests'
import { useStatusUpdates } from '../shared/hooks/useStatusUpdates'
import { getRecentRequests, type RecentRequest } from '../shared/recentRequests'
import { useI18n } from '../i18n'
import StatusTimeline from '../components/StatusTimeline'
import Icon from '../components/Icon'
import type { RequestStatus } from '../types/serviceRequest'
import type { StatusUpdate } from '../types/statusUpdate'
import './Track.css'

export default function Track() {
  const { categories } = useCategories()
  const { serviceTypes } = useServiceTypes()
  const {
    serviceRequest: result,
    isLoading: requestLoading,
    notFound,
    lookup: lookupRequest,
  } = useServiceRequestByNumber()
  const { t, language } = useI18n()

  const [requestId, setRequestId] = useState('')
  const [searched, setSearched] = useState(false)
  const [recent] = useState<RecentRequest[]>(() => getRecentRequests())

  const {
    items: statusUpdates,
    isLoading: updatesLoading,
    refetch: refetchUpdates,
  } = useStatusUpdates(result?.id)

  const categoryById = useMemo(
    () => new Map(categories.map(c => [c.id, c])),
    [categories]
  )

  const serviceTypeById = useMemo(
    () => new Map(serviceTypes.map(st => [st.id, st])),
    [serviceTypes]
  )

  const isSearching = requestLoading
  const dateLocale = language === 'fr' ? 'fr-CA' : 'en-US'

  async function runLookup(num: string) {
    const normalized = num.trim().toUpperCase()
    if (!normalized) return
    setRequestId(normalized)
    setSearched(true)
    await lookupRequest(normalized)
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    await runLookup(requestId)
  }

  useEffect(() => {
    if (result?.id) {
      refetchUpdates()
    }
  }, [result?.id, refetchUpdates])

  const serviceType = result ? serviceTypeById.get(result.serviceTypeId) ?? null : null
  const category = result ? categoryById.get(result.categoryId) ?? null : null

  const timeline: StatusUpdate[] = statusUpdates.length > 0
    ? statusUpdates
    : result
      ? [{ id: 'initial', name: '', status: result.status as RequestStatus, date: result.createdOn, note: 'Current status.', serviceRequestId: result.id, createdOn: result.createdOn }]
      : []

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 700 }}>
        <div className="page-header" style={{ textAlign: 'center' }}>
          <h1 className="page-title animate-in animate-in-1">{t('track.title')}</h1>
          <p className="page-subtitle animate-in animate-in-2">
            {t('track.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSearch} className="card animate-in animate-in-3" style={{ padding: 32 }}>
          <div className="form-group">
            <label htmlFor="track-id" className="form-label">{t('track.requestIdLabel')}</label>
            <input
              id="track-id"
              type="text"
              className="form-input"
              placeholder="SR-20260225-12345"
              value={requestId}
              onChange={e => setRequestId(e.target.value)}
              required
              aria-required="true"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: 20, width: '100%' }} disabled={isSearching}>
            {isSearching ? t('track.lookingUp') : t('track.lookUp')}
          </button>
        </form>

        {/* Recent requests submitted on this device */}
        {recent.length > 0 && !result && (
          <div className="card animate-in animate-in-3" style={{ padding: 24, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
              <div>
                <h2 style={{ fontSize: '1rem', marginBottom: 2 }}>{t('track.recentTitle')}</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{t('track.recentHint')}</p>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => runLookup(recent[0].number)} disabled={isSearching}>
                {t('track.trackLatest')}
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {recent.map(r => (
                <button
                  key={r.number}
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => runLookup(r.number)}
                  disabled={isSearching}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}
                  title={r.serviceTypeName}
                >
                  {r.number}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="track-result animate-in" style={{ marginTop: 32 }}>
            <div className="card" style={{ padding: 32 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    {result.requestNumber}
                  </p>
                  <h2 style={{ fontSize: '1.375rem', marginBottom: 8 }}>
                    {serviceType?.name || result.serviceTypeName || result.department?.split(' > ')[1] || 'Service Request'}
                  </h2>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(category || result.department) && <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>{category ? <><Icon name={category.slug} type="category" size={14} /> {category.name}</> : result.department?.split(' > ')[0]}</span>}
                    <span className={`badge ${result.status === 'resolved' || result.status === 'closed' ? 'badge-success' : result.urgency === 'high' ? 'badge-error' : 'badge-info'}`}>
                      {result.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{t('track.submitted')}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
                    {new Date(result.createdOn).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 24 }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--color-text)' }}>{t('track.location')}</strong> {result.address}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginTop: 4 }}>
                  <strong style={{ color: 'var(--color-text)' }}>{t('track.description')}</strong> {result.description}
                </p>
                {result.department && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginTop: 4 }}>
                    <strong style={{ color: 'var(--color-text)' }}>{t('track.department')}</strong> {result.department}
                  </p>
                )}
              </div>

              <h2 style={{ fontSize: '1.0625rem', marginBottom: 16 }}>{t('track.statusTimeline')}</h2>
              {updatesLoading ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{t('track.loadingTimeline')}</p>
              ) : (
                <StatusTimeline timeline={timeline} currentStatus={result.status as RequestStatus} />
              )}
            </div>
          </div>
        )}

        {/* Not found */}
        {notFound && searched && (
          <div className="card animate-in" style={{ marginTop: 32, padding: 40, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(27, 73, 101, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-light)', margin: '0 auto 16px' }}>
              <Search size={32} />
            </div>
            <h2 style={{ marginBottom: 8 }}>{t('track.notFound')}</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
              {t('track.notFoundDesc')}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/contact" className="btn btn-primary">{t('common.contactUs')}</Link>
              <Link to="/services" className="btn btn-secondary">{t('track.submitNewRequest')}</Link>
            </div>
          </div>
        )}

        {/* Sample requests hint */}
        {!searched && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-light)' }}>
              {t('track.noIdHint')} <Link to="/services">{t('track.submitNew')}</Link> {language === 'fr' ? 'ou' : 'or'} <Link to="/requests/map">{t('track.exploreExisting')}</Link>.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
