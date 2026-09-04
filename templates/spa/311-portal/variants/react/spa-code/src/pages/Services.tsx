import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Grid3X3 } from 'lucide-react'
import { useCategories } from '../shared/hooks/useCategories'
import { useServiceTypes } from '../shared/hooks/useServiceTypes'
import { useI18n } from '../i18n'
import SearchBar from '../components/SearchBar'
import Icon from '../components/Icon'
import { SkeletonCards } from '../components/Skeleton'
import './Services.css'

export default function Services() {
  const { categories, isLoading: categoriesLoading, error: categoriesError } = useCategories()
  const { serviceTypes, isLoading: serviceTypesLoading, error: serviceTypesError } = useServiceTypes()
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const { t } = useI18n()

  const isLoading = categoriesLoading || serviceTypesLoading
  const error = categoriesError || serviceTypesError

  const serviceTypesByCategory = useMemo(() => {
    const map = new Map<string, typeof serviceTypes>()
    for (const st of serviceTypes) {
      const list = map.get(st.categoryId) ?? []
      list.push(st)
      map.set(st.categoryId, list)
    }
    return map
  }, [serviceTypes])

  if (isLoading) {
    return <SkeletonCards count={6} />
  }

  if (error) {
    return (
      <div className="page">
        <div className="container">
          <div className="card" style={{ padding: 32, textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: 12 }}>{t('services.title')}</h1>
            <p style={{ color: 'var(--color-error)' }}>{t('services.error')} {error}</p>
          </div>
        </div>
      </div>
    )
  }

  const filteredCategories = activeCategoryId
    ? categories.filter(c => c.id === activeCategoryId)
    : categories

  const getServicesForCategory = (categoryId: string) =>
    serviceTypesByCategory.get(categoryId) ?? []

  return (
    <div className="page">
      <div className="container">
        <div className="page-header" style={{ textAlign: 'center' }}>
          <h1 className="page-title animate-in animate-in-1">{t('services.title')}</h1>
          <p className="page-subtitle animate-in animate-in-2">
            {serviceTypes.length} {t('common.services').toLowerCase()} &middot; {categories.length} {t('services.categories').toLowerCase()}
          </p>
          <div className="animate-in animate-in-3" style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <SearchBar />
          </div>
        </div>

        <div className="services-layout">
          <aside className="services-sidebar">
            <h2 className="services-sidebar-title">{t('services.categories')}</h2>
            <nav aria-label={t('services.categories')}>
              <button
                type="button"
                className={`services-category-btn ${activeCategoryId === null ? 'active' : ''}`}
                onClick={() => setActiveCategoryId(null)}
                aria-pressed={activeCategoryId === null}
              >
                <span className="services-cat-icon"><Grid3X3 size={18} /></span>
                <span>{t('services.allCategories')}</span>
                <span className="services-cat-count">{serviceTypes.length}</span>
              </button>
              {categories.map(cat => (
                <button
                  type="button"
                  key={cat.id}
                  className={`services-category-btn ${activeCategoryId === cat.id ? 'active' : ''}`}
                  onClick={() => setActiveCategoryId(cat.id)}
                  aria-pressed={activeCategoryId === cat.id}
                >
                  <span className="services-cat-icon"><Icon name={cat.slug} type="category" size={18} /></span>
                  <span>{cat.name}</span>
                  <span className="services-cat-count">{getServicesForCategory(cat.id).length}</span>
                </button>
              ))}
            </nav>
          </aside>

          <div className="services-main">
            {filteredCategories.map(cat => {
              const catServices = getServicesForCategory(cat.id)
              return (
                <section key={cat.id} className="services-category-section">
                  <div className="services-category-header">
                    <span className="services-category-icon" style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(27, 73, 101, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}><Icon name={cat.slug} type="category" size={22} /></span>
                    <div>
                      <h2 className="services-category-name">{cat.name}</h2>
                      <p className="services-category-desc">{cat.description}</p>
                    </div>
                  </div>
                  <div className="services-type-grid">
                    {catServices.map(st => (
                      <Link
                        key={st.id}
                        to={`/services/${st.slug}`}
                        className="card card-interactive services-type-card"
                      >
                        <span className="services-type-icon" style={{ color: 'var(--color-primary)' }}><Icon name={st.slug} size={22} /></span>
                        <div>
                          <h3 className="services-type-name">{st.name}</h3>
                          <p className="services-type-desc">{st.description}</p>
                        </div>
                        <div className="services-type-sla">
                          <span className="badge badge-info">{st.targetSLA}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
