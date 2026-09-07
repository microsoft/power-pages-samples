import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useArticles } from '../shared/hooks/useArticles'
import { useI18n } from '../i18n'
import EmptyState from '../components/EmptyState'
import { SkeletonCards } from '../components/Skeleton'
import './Knowledge.css'

const TAG_LIMIT = 12

export default function Knowledge() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [showAllTags, setShowAllTags] = useState(false)
  const { articles, isLoading, error, filterArticles } = useArticles()
  const { t, language } = useI18n()

  const filtered = useMemo(() => {
    return filterArticles(searchQuery, activeTags)
  }, [filterArticles, searchQuery, activeTags])

  const tagsByFrequency = useMemo(() => {
    const counts = new Map<string, number>()
    articles.forEach(a => a.tags.forEach(t => counts.set(t, (counts.get(t) || 0) + 1)))
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag]) => tag)
  }, [articles])

  const visibleTags = showAllTags ? tagsByFrequency : tagsByFrequency.slice(0, TAG_LIMIT)
  const hasMoreTags = tagsByFrequency.length > TAG_LIMIT
  const dateLocale = language === 'fr' ? 'fr-CA' : 'en-US'

  function toggleTag(tag: string) {
    setActiveTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  if (isLoading) return <SkeletonCards count={6} />
  if (error) return (
    <div className="page">
      <div className="container">
        <h1 className="sr-only">{t('knowledge.title')}</h1>
        <EmptyState
          icon={<FileText size={32} />}
          title={t('knowledge.loadError')}
          description={error}
        />
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="container">
        <div className="page-header" style={{ textAlign: 'center' }}>
          <h1 className="page-title animate-in animate-in-1">{t('knowledge.title')}</h1>
          <p className="page-subtitle animate-in animate-in-2">
            {t('knowledge.subtitle')}
          </p>
        </div>

        {/* Search */}
        <div className="kb-search animate-in animate-in-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            className="kb-search-input"
            placeholder={t('knowledge.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label={t('knowledge.searchPlaceholder')}
          />
        </div>

        {/* Tags */}
        <div className="kb-tags animate-in animate-in-4">
          {visibleTags.map(tag => (
            <button
              type="button"
              key={tag}
              className={`kb-tag ${activeTags.includes(tag) ? 'active' : ''}`}
              onClick={() => toggleTag(tag)}
              aria-pressed={activeTags.includes(tag)}
            >
              {tag}
            </button>
          ))}
          {hasMoreTags && (
            <button
              type="button"
              className="kb-tag kb-tag-toggle"
              onClick={() => setShowAllTags(prev => !prev)}
            >
              {showAllTags ? t('knowledge.showLess') : `+${tagsByFrequency.length - TAG_LIMIT} more`}
            </button>
          )}
          {activeTags.length > 0 && (
            <button type="button" className="kb-tag kb-tag-clear" onClick={() => setActiveTags([])}>
              {t('knowledge.clearFilters')}
            </button>
          )}
        </div>

        {/* Results */}
        <p className="kb-results-count" aria-live="polite">{filtered.length} article{filtered.length !== 1 ? 's' : ''}{articles.length > 0 && filtered.length !== articles.length ? ` / ${articles.length}` : ''}</p>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<FileText size={32} />}
            title={t('knowledge.noArticles')}
            description={t('knowledge.noArticlesDesc')}
            action={<button className="btn btn-secondary" onClick={() => { setSearchQuery(''); setActiveTags([]) }}>{t('knowledge.clearAllFilters')}</button>}
          />
        ) : (
          <div className="kb-grid">
            {filtered.map(article => (
              <Link
                key={article.id}
                to={`/knowledge/${article.slug}`}
                className="card card-interactive kb-article-card"
              >
                <div className="kb-article-tags">
                  {article.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="badge badge-neutral">{tag}</span>
                  ))}
                </div>
                <h2 className="kb-article-title">{article.title}</h2>
                <p className="kb-article-summary">{article.summary}</p>
                <span className="kb-article-date">
                  {new Date(article.publishedAt).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
