import { useMemo, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Sparkles, AlertTriangle, BookOpen, Info } from 'lucide-react'
import { useAuthorization } from '../hooks/useAuthorization'
import { useReviewerPolicySearch } from '../hooks/useReviewerPolicySearch'
import { extractKnowledgeArticleId } from '../services/aiSummaryService'
import usePageTitle from '../hooks/usePageTitle'

// Render a summary string with inline `[[N]](url)` citation tokens as clickable
// anchors. Citation URLs that point at Power Pages' built-in `/page-not-found`
// (the default behaviour for KB articles on a code site) are rewritten to the
// SPA's `/knowledge/<id>` route so the reviewer lands on real content.
function renderSummaryWithCitations(summary: string): ReactNode[] {
  if (!summary) return []
  const parts: ReactNode[] = []
  const regex = /\[\[(\d+)\]\]\(([^)]+)\)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = regex.exec(summary)) !== null) {
    if (match.index > lastIndex) {
      parts.push(summary.slice(lastIndex, match.index))
    }
    const [, n, rawUrl] = match
    const kbId = extractKnowledgeArticleId(rawUrl)
    const href = kbId ? `/knowledge/${kbId}` : rawUrl
    parts.push(
      <a
        key={`cite-${key++}`}
        href={href}
        target={href.startsWith('/') ? undefined : '_blank'}
        rel={href.startsWith('/') ? undefined : 'noreferrer'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 18,
          height: 18,
          padding: '0 5px',
          marginLeft: 2,
          borderRadius: 9,
          background: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          fontSize: '0.72rem',
          fontWeight: 600,
          textDecoration: 'none',
          verticalAlign: 'baseline',
        }}
        title={rawUrl}
      >
        {n}
      </a>,
    )
    lastIndex = regex.lastIndex
  }
  if (lastIndex < summary.length) parts.push(summary.slice(lastIndex))
  return parts
}

const SAMPLE_QUESTIONS = [
  'What are the approval thresholds for invoices over $10,000?',
  'When should I mark an invoice as Needs Revision vs Rejected?',
  'What are the Net 60 payment-term rules?',
  'How do I escalate a dispute with a supplier?',
]

export default function ReviewerHelp() {
  const { isReviewer, isAuthenticated } = useAuthorization()
  const navigate = useNavigate()
  usePageTitle('Policy Search')
  const search = useReviewerPolicySearch()

  const renderedSummary = useMemo(
    () => renderSummaryWithCitations(search.summary ?? ''),
    [search.summary],
  )

  // Redirect non-reviewers. Render nothing during the redirect tick.
  if (isAuthenticated && !isReviewer) {
    navigate('/dashboard', { replace: true })
    return null
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    search.submit()
  }

  return (
    <div style={{ maxWidth: 880 }}>
      <nav aria-label="Breadcrumb" style={{ marginBottom: 16, fontSize: '0.85rem' }}>
        <Link to="/dashboard" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>
          Dashboard
        </Link>
        <span style={{ margin: '0 8px', color: 'var(--color-border)' }}>/</span>
        <span style={{ color: 'var(--color-text)' }}>Policy Search</span>
      </nav>

      <div className="animate-in" style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Sparkles size={22} color="var(--color-primary)" aria-hidden="true" />
          Policy &amp; SOP Search
        </h1>
        <p style={{ fontSize: '0.925rem', color: 'var(--color-text-muted)' }}>
          Ask a question about review policy, SOPs, or approval thresholds. Answers are
          AI-generated from the site&apos;s indexed policy content and include links to the
          source documents.
        </p>
      </div>

      {/* Search form */}
      <form
        onSubmit={onSubmit}
        className="animate-in animate-in-1"
        style={{
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          padding: 20,
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-border)',
          marginBottom: 20,
          borderTop: '2px solid transparent',
          borderImage:
            'linear-gradient(90deg, rgb(70,79,235) 35%, rgb(71,207,250) 70%, rgb(180,124,248) 92%) 1',
        }}
      >
        <label htmlFor="policy-search-input" className="sr-only">
          Ask a policy question
        </label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={16}
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }}
            />
            <input
              id="policy-search-input"
              type="search"
              value={search.query}
              onChange={(e) => search.setQuery(e.target.value)}
              placeholder="e.g. When can I approve an invoice without a PO?"
              style={{
                width: '100%',
                paddingLeft: 40,
                paddingRight: 14,
                height: 44,
                borderRadius: 'var(--radius)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                fontSize: '0.95rem',
              }}
              disabled={search.isLoading}
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={search.isLoading || !search.query.trim()}
            style={{ paddingLeft: 20, paddingRight: 20 }}
          >
            {search.isLoading ? 'Searching...' : 'Ask'}
          </button>
        </div>

        {/* Sample questions */}
        {!search.summary && !search.isLoading && !search.error && (
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                marginBottom: 8,
              }}
            >
              Try one of these:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    search.setQuery(q)
                    // Fire on next tick so state has flushed.
                    setTimeout(() => search.submit(), 0)
                  }}
                  className="btn-outline-sm"
                  style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>

      {/* Loading */}
      {search.isLoading && (
        <div
          role="status"
          aria-live="polite"
          className="animate-in"
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
            fontSize: '0.9rem',
          }}
        >
          Searching the policy index and composing an answer...
        </div>
      )}

      {/* Disabled-state card — admin governance or the site toggle is off */}
      {!search.isLoading && search.isDisabled && (
        <div
          role="alert"
          className="animate-in"
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start',
          }}
        >
          <Info size={22} color="var(--color-primary)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 600, marginBottom: 6 }}>
              AI search summary is turned off for this site
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.6, marginBottom: 10 }}>
              Someone with admin access needs to enable <strong>Site search with generative AI (preview)</strong>{' '}
              in the Power Pages Copilot workspace. If that toggle is greyed out, the tenant or environment
              governance is also blocking AI — a Power Platform admin needs to unblock it first.
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              Set up workspace → Copilot → Site search (preview) → <em>Enable Site search with generative AI
              (preview)</em>.
            </p>
          </div>
        </div>
      )}

      {/* Generic error */}
      {!search.isLoading && search.error && !search.isDisabled && (
        <div
          role="alert"
          className="animate-in"
          style={{
            background: 'var(--color-error-light)',
            borderRadius: 'var(--radius-lg)',
            padding: 16,
            border: '1px solid var(--color-error)',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <AlertTriangle size={18} color="var(--color-error)" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, fontSize: '0.875rem', color: '#991B1B', lineHeight: 1.6 }}>
            {search.error}
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                onClick={search.submit}
                className="btn-outline-sm"
                style={{
                  fontSize: '0.78rem',
                  padding: '4px 10px',
                  borderColor: 'var(--color-error)',
                  color: '#991B1B',
                }}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {!search.isLoading && !search.error && !search.isDisabled && search.summary && (
        <div
          className="animate-in"
          style={{
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            padding: 24,
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              fontSize: '0.72rem',
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            AI Answer
          </div>
          <p
            style={{
              fontSize: '0.95rem',
              lineHeight: 1.7,
              color: 'var(--color-text)',
              whiteSpace: 'pre-wrap',
              marginBottom: 20,
            }}
          >
            {renderedSummary}
          </p>

          {search.citations.length > 0 && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 10,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <BookOpen size={12} aria-hidden="true" />
                Sources
              </div>
              <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {search.citations.map((c) => {
                  const kbId = extractKnowledgeArticleId(c.url)
                  const href = kbId ? `/knowledge/${kbId}` : c.url
                  const label = c.title?.trim() || c.url
                  return (
                    <li key={`${c.index}-${c.url}`} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 22,
                          height: 22,
                          padding: '0 6px',
                          borderRadius: 11,
                          background: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {c.index}
                      </span>
                      <a
                        href={href}
                        target={href.startsWith('/') ? undefined : '_blank'}
                        rel={href.startsWith('/') ? undefined : 'noreferrer'}
                        style={{
                          fontSize: '0.88rem',
                          color: 'var(--color-primary)',
                          textDecoration: 'none',
                          wordBreak: 'break-word',
                        }}
                      >
                        {label}
                      </a>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}

          <div
            style={{
              fontSize: '0.72rem',
              color: 'var(--color-text-muted)',
              marginTop: 16,
              fontStyle: 'italic',
            }}
          >
            AI-generated content may be incorrect. Always verify against the source policy documents.
          </div>
        </div>
      )}
    </div>
  )
}
