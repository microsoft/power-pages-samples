import { Link } from 'react-router-dom'
import SearchBar from '../components/SearchBar'
import { useServiceRequestStats } from '../shared/hooks/useServiceRequests'
import { useI18n } from '../i18n'
import Icon from '../components/Icon'
import { FileText, Clock, Grid3X3 } from '../components/Icon'
import './Home.css'

const popularTopics = [
  { id: 'pothole', labelKey: 'home.topicPotholes', slug: 'pothole-repair' },
  { id: 'graffiti-removal', labelKey: 'home.topicGraffiti', slug: 'graffiti-removal' },
  { id: 'missed-pickup', labelKey: 'home.topicMissedPickup', slug: 'missed-waste-pickup' },
  { id: 'noise-complaint', labelKey: 'home.topicNoise', slug: 'noise-complaint' },
  { id: 'streetlight', labelKey: 'home.topicStreetlight', slug: 'streetlight-outage' },
  { id: 'water-leak', labelKey: 'home.topicWaterLeak', slug: 'water-leak' },
]

export default function Home() {
  const { totalCount, resolvedCount, isLoading: statsLoading } = useServiceRequestStats()
  const { t } = useI18n()

  const stats = [
    { value: statsLoading ? '...' : String(totalCount), label: t('home.statActiveRequests') },
    { value: statsLoading ? '...' : String(resolvedCount), label: t('home.statResolvedThisMonth') },
    { value: '34', label: t('home.statServiceTypes') },
    { value: '< 5 days', label: t('home.statAvgResolution') },
  ]

  return (
    <div className="home">
      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-bg" />
        <div className="container home-hero-content">
          <p className="home-hero-eyebrow animate-in animate-in-1">{t('home.eyebrow')}</p>
          <h1 className="home-hero-title animate-in animate-in-2">
            {t('home.title')}
          </h1>
          <p className="home-hero-subtitle animate-in animate-in-3">
            {t('home.subtitle')}
          </p>
          <div className="home-hero-search animate-in animate-in-4">
            <SearchBar large />
          </div>
        </div>
      </section>

      {/* Popular Topics */}
      <section className="home-section">
        <div className="container">
          <h2 className="home-section-title">{t('home.popularTopics')}</h2>
          <div className="home-topics-grid">
            {popularTopics.map(topic => (
              <Link
                key={topic.slug}
                to={`/services/${topic.slug}`}
                className="home-topic-card card card-interactive"
              >
                <div className="home-topic-icon" style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(27, 73, 101, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                  <Icon name={topic.id} size={24} />
                </div>
                <span className="home-topic-label">{t(topic.labelKey)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTAs */}
      <section className="home-section home-cta-section">
        <div className="container">
          <div className="home-cta-grid">
            <Link to="/services" className="home-cta-card">
              <div className="home-cta-icon-wrap" style={{ background: 'rgba(27, 73, 101, 0.1)', color: 'var(--color-primary)' }}>
                <FileText size={28} />
              </div>
              <h3 className="home-cta-title">{t('home.ctaSubmitTitle')}</h3>
              <p className="home-cta-desc">{t('home.ctaSubmitDesc')}</p>
            </Link>

            <Link to="/track" className="home-cta-card">
              <div className="home-cta-icon-wrap" style={{ background: 'rgba(61, 139, 122, 0.1)', color: 'var(--color-secondary)' }}>
                <Clock size={28} />
              </div>
              <h3 className="home-cta-title">{t('home.ctaTrackTitle')}</h3>
              <p className="home-cta-desc">{t('home.ctaTrackDesc')}</p>
            </Link>

            <Link to="/services" className="home-cta-card">
              <div className="home-cta-icon-wrap" style={{ background: 'rgba(212, 133, 58, 0.1)', color: 'var(--color-accent)' }}>
                <Grid3X3 size={28} />
              </div>
              <h3 className="home-cta-title">{t('home.ctaBrowseTitle')}</h3>
              <p className="home-cta-desc">{t('home.ctaBrowseDesc')}</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="home-section home-stats-section">
        <div className="container">
          <div className="home-stats-grid">
            {stats.map(stat => (
              <div key={stat.label} className="home-stat">
                <span className="home-stat-value">{stat.value}</span>
                <span className="home-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Knowledge */}
      <section className="home-section">
        <div className="container">
          <div className="home-knowledge-row">
            <div>
              <h2 className="home-section-title">{t('home.knowledgeTitle')}</h2>
              <p style={{ color: 'var(--color-text-muted)', maxWidth: 480, marginBottom: 24 }}>
                {t('home.knowledgeDesc')}
              </p>
              <Link to="/knowledge" className="btn btn-secondary">
                {t('home.browseArticles')}
              </Link>
            </div>
            <div className="home-knowledge-cards">
              <Link to="/knowledge/how-to-report-pothole" className="card card-interactive home-knowledge-card">
                <h3>{t('home.kbCard1Title')}</h3>
                <p>{t('home.kbCard1Desc')}</p>
              </Link>
              <Link to="/knowledge/how-requests-processed" className="card card-interactive home-knowledge-card">
                <h3>{t('home.kbCard2Title')}</h3>
                <p>{t('home.kbCard2Desc')}</p>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
