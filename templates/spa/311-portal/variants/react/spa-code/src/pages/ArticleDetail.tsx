import { useParams, Link } from 'react-router-dom'
import { useMemo, type ReactNode } from 'react'
import { FileText } from 'lucide-react'
import { useArticleBySlug } from '../shared/hooks/useArticles'
import { knowledgeArticles as localArticles } from '../data/articles'
import { serviceTypes } from '../data/categories'
import { useI18n } from '../i18n'
import Breadcrumbs from '../components/Breadcrumbs'
import EmptyState from '../components/EmptyState'
import { SkeletonDetail } from '../components/Skeleton'

export default function ArticleDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { article, isLoading, error } = useArticleBySlug(slug)
  const { t, language } = useI18n()

  const dateLocale = language === 'fr' ? 'fr-CA' : 'en-US'

  // Find the primary related service slug for the "Create Service Request" CTA
  // Article relatedServiceTypeIds use the service ID (e.g. 'streetlight'),
  // but the route needs the service slug (e.g. 'streetlight-outage').
  const relatedServiceSlug = useMemo(() => {
    if (!slug) return null
    const local = localArticles.find(a => a.slug === slug)
    const serviceId = local?.relatedServiceTypeIds?.[0]
    if (!serviceId) return null
    const service = serviceTypes.find(s => s.id === serviceId)
    return service?.slug ?? null
  }, [slug])

  if (isLoading) {
    return <SkeletonDetail />
  }

  if (error) {
    return (
      <div className="page">
        <div className="container">
          <EmptyState
            headingLevel={1}
            icon={<FileText size={32} />}
            title={t('articleDetail.loadError')}
            description={error}
            action={<Link to="/knowledge" className="btn btn-primary">{t('articleDetail.browseKnowledgeBase')}</Link>}
          />
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="page">
        <div className="container">
          <EmptyState
            headingLevel={1}
            icon={<FileText size={32} />}
            title={t('articleDetail.notFound')}
            description={t('articleDetail.notFoundDesc')}
            action={<Link to="/knowledge" className="btn btn-primary">{t('articleDetail.browseKnowledgeBase')}</Link>}
          />
        </div>
      </div>
    )
  }

  function renderInline(text: string) {
    return text.split(/\*\*(.*?)\*\*/).map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    )
  }

  // Article content is stored as simple line-oriented Markdown.
  function renderContent(content: string) {
    const lines = content.split('\n')
    const blocks: ReactNode[] = []

    for (let i = 0; i < lines.length;) {
      const line = lines[i]
      if (line.startsWith('## ')) {
        blocks.push(<h2 key={i} style={{ fontSize: '1.375rem', marginTop: 32, marginBottom: 12 }}>{line.slice(3)}</h2>)
        i += 1
        continue
      }
      if (line.startsWith('### ')) {
        blocks.push(<h3 key={i} style={{ fontSize: '1.125rem', marginTop: 24, marginBottom: 8 }}>{line.slice(4)}</h3>)
        i += 1
        continue
      }
      if (line.startsWith('- ')) {
        const items: ReactNode[] = []
        const start = i
        while (i < lines.length && lines[i].startsWith('- ')) {
          items.push(<li key={i}>{renderInline(lines[i].slice(2))}</li>)
          i += 1
        }
        blocks.push(<ul key={start} style={{ margin: '0 0 12px 20px', lineHeight: 1.6 }}>{items}</ul>)
        continue
      }
      if (/^\d+\.\s*/.test(line)) {
        const items: ReactNode[] = []
        const start = i
        while (i < lines.length && /^\d+\.\s*/.test(lines[i])) {
          items.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\.\s*/, ''))}</li>)
          i += 1
        }
        blocks.push(<ol key={start} style={{ margin: '0 0 12px 20px', lineHeight: 1.6 }}>{items}</ol>)
        continue
      }
      if (line.trim()) {
        blocks.push(<p key={i} style={{ lineHeight: 1.7, marginBottom: 8 }}>{renderInline(line)}</p>)
      }
      i += 1
    }

    return blocks
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 800 }}>
        <Breadcrumbs items={[
          { label: t('common.home'), to: '/' },
          { label: t('common.knowledgeBase'), to: '/knowledge' },
          { label: article.title },
        ]} />

        <article>
          <header className="animate-in animate-in-1" style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {article.tags.map(tag => (
                <span key={tag} className="badge badge-neutral">{tag}</span>
              ))}
            </div>
            <h1 style={{ fontSize: '2rem', lineHeight: 1.3, marginBottom: 8 }}>{article.title}</h1>
            <p style={{ fontSize: '1.0625rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>{article.summary}</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-light)', fontFamily: 'var(--font-mono)', marginTop: 8 }}>
              {t('articleDetail.published')} {new Date(article.publishedAt).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </header>

          <div className="card animate-in animate-in-2" style={{ padding: 40 }}>
            <div style={{ fontSize: '0.9375rem', color: 'var(--color-text)' }}>
              {renderContent(article.content)}
            </div>
          </div>

          <div className="animate-in animate-in-3" style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to={relatedServiceSlug ? `/request/new/${relatedServiceSlug}` : '/services'} className="btn btn-accent">
              {t('serviceDetail.createRequest')}
            </Link>
            <Link to="/knowledge" className="btn btn-secondary">
              {t('articleDetail.backToKnowledgeBase')}
            </Link>
          </div>
        </article>
      </div>
    </div>
  )
}
