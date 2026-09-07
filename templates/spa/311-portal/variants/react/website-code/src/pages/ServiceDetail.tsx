import { useParams, Link } from 'react-router-dom'
import { Search, ClipboardList, Info, Clock } from 'lucide-react'
import { useServiceTypeBySlug } from '../shared/hooks/useServiceTypes'
import { useRelatedArticles } from '../shared/hooks/useArticles'
import { useI18n } from '../i18n'
import Breadcrumbs from '../components/Breadcrumbs'
import EmptyState from '../components/EmptyState'
import { SkeletonDetail } from '../components/Skeleton'
import Icon, { BookOpen } from '../components/Icon'

export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { serviceType: service, isLoading, error } = useServiceTypeBySlug(slug)
  const { t } = useI18n()
  const { articles: relatedArticles } = useRelatedArticles(service?.slug)

  if (isLoading) {
    return <SkeletonDetail />
  }

  if (error) {
    return (
      <div className="page">
        <div className="container">
          <div className="card" style={{ padding: 32, textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 12 }}>{t('serviceDetail.error')}</h1>
            <p style={{ color: 'var(--color-error)' }}>{t('serviceDetail.error')} {error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!service) {
    return (
      <div className="page">
        <div className="container">
          <EmptyState
            headingLevel={1}
            icon={<Search size={32} />}
            title={t('serviceDetail.notFound')}
            description={t('serviceDetail.notFoundDesc')}
            action={<Link to="/services" className="btn btn-primary">{t('common.browseServices')}</Link>}
          />
        </div>
      </div>
    )
  }

  const category = service.category

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <Breadcrumbs items={[
          { label: t('common.home'), to: '/' },
          { label: t('common.services'), to: '/services' },
          { label: category?.name || '', to: '/services' },
          { label: service.name },
        ]} />

        <div className="animate-in animate-in-1">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(27, 73, 101, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
              <Icon name={service.slug} size={28} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.875rem', marginBottom: 4 }}>{service.name}</h1>
              {category && (
                <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name={category.slug} type="category" size={14} /> {category.name}</span>
              )}
            </div>
          </div>
        </div>

        <div className="card animate-in animate-in-2" style={{ marginTop: 24, padding: 32 }}>
          <p style={{ fontSize: '1.0625rem', color: 'var(--color-text)', lineHeight: 1.7, marginBottom: 24 }}>
            {service.details}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
            <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', padding: 20 }}>
              <h2 style={{ fontSize: '0.9375rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={20} /> {t('serviceDetail.whatYouNeed')}
              </h2>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {service.whatYouNeed.map((item, i) => (
                  <li key={i} style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', display: 'flex', gap: 8, lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--color-success)', fontWeight: 600, flexShrink: 0 }}>&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', padding: 20 }}>
                <h2 style={{ fontSize: '0.9375rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Info size={20} /> {t('serviceDetail.eligibility')}
                </h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  {service.eligibility}
                </p>
              </div>

              <div style={{ background: 'var(--color-info-bg)', borderRadius: 'var(--radius-md)', padding: 20 }}>
                <h2 style={{ fontSize: '0.9375rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={20} /> {t('serviceDetail.targetResolution')}
                </h2>
                <span style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'var(--color-info)',
                }}>
                  {service.targetSLA}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="animate-in animate-in-3" style={{ marginTop: 32, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Link to={`/request/new/${service.slug}`} className="btn btn-accent btn-lg" style={{ flexShrink: 0 }}>
            {t('serviceDetail.createRequest')}
          </Link>

          {relatedArticles.length > 0 && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <h2 style={{ fontSize: '0.875rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-muted)' }}>
                <BookOpen size={16} /> {t('serviceDetail.relatedArticles')}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {relatedArticles.map(article => (
                  <Link
                    key={article.id}
                    to={`/knowledge/${article.slug}`}
                    style={{ fontSize: '0.875rem', color: 'var(--color-primary)', textDecoration: 'none' }}
                  >
                    {article.title} &rarr;
                  </Link>
                ))}
              </div>
              <Link to="/knowledge" style={{ fontSize: '0.8125rem', color: 'var(--color-text-light)', textDecoration: 'none', marginTop: 6, display: 'inline-block' }}>
                {t('serviceDetail.browseAllArticles')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
