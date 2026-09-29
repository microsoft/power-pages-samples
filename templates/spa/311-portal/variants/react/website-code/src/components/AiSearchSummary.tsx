// src/components/AiSearchSummary.tsx
// Compact presentation for a Search Summary API result.
//
// Sized for a sidebar column or an inline hint panel rather than the full Copilot treatment in
// AiSummaryCard: the surfaces that use this are replacing a short list of article links, so the
// summary has to stay about as tall as the list it stands in for. Font size is inherited from
// the wrapper `style` so each page keeps its own scale.

import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useI18n } from '../i18n'
import { renderInline } from '../shared/markdown'
import {
  extractKnowledgeArticleId,
  parseSummaryWithCitations,
  type SummaryPart,
} from '../services/aiSummaryService'

interface CitationLinkProps {
  url: string
  /** Accessible name. The visible text is just a bracketed number, which says nothing on its own. */
  ariaLabel: string
  title: string
  style?: CSSProperties
  children: ReactNode
}

/**
 * Link to a cited source, routing through this app when the citation points at a knowledge
 * article.
 *
 * Anything that is not a rewritable article URL opens in a new tab. That is not only about
 * external origins: a citation can point at a server-rendered Power Pages page on this same
 * host, and following it would be a full page load. On the request wizard that would discard a
 * partly filled form, so leaving the current document alone is the safe default for every URL
 * this app cannot route itself.
 */
function CitationLink({ url, ariaLabel, title, style, children }: CitationLinkProps) {
  const articleId = extractKnowledgeArticleId(url)

  if (articleId) {
    return (
      <Link to={`/knowledge/${articleId}`} aria-label={ariaLabel} title={title} style={style}>
        {children}
      </Link>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      title={title}
      style={style}
    >
      {children}
    </a>
  )
}

interface AiSearchSummaryProps {
  /** Summary prose, including its inline `[[N]](url)` citation tokens. */
  summary: string
  /** Citation token (`"[1]"`) to source title, as returned by the API. */
  citationTitleMapping: Record<string, string>
  /** Applied to the wrapper. Set `fontSize` here to scale the whole block. */
  style?: CSSProperties
}

export default function AiSearchSummary({
  summary,
  citationTitleMapping,
  style,
}: AiSearchSummaryProps) {
  const { t } = useI18n()

  const parts = useMemo(() => parseSummaryWithCitations(summary), [summary])

  // The source list is derived from the tokens actually present in the prose rather than from
  // the response's Citations map, so it can never list a source the summary does not cite or
  // order them differently from the text. First mention wins, which keeps reading order.
  const sources = useMemo(() => {
    const byToken = new Map<string, string>()
    for (const part of parts) {
      if (part.kind === 'citation' && !byToken.has(part.token)) {
        byToken.set(part.token, part.url)
      }
    }
    return Array.from(byToken, ([token, url]) => ({ token, url }))
  }, [parts])

  const labelFor = (part: { token: string; url: string }) =>
    citationTitleMapping[part.token] ?? part.url

  const citationStyle: CSSProperties = {
    color: 'var(--color-primary)',
    fontSize: 'inherit',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  }

  const renderPart = (part: SummaryPart, index: number) => {
    if (part.kind === 'text') {
      return <span key={index}>{renderInline(part.text)}</span>
    }

    const label = labelFor(part)
    return (
      <CitationLink
        key={index}
        url={part.url}
        title={label}
        ariaLabel={t('aiSummary.citationAria', { number: part.token, title: label })}
        style={citationStyle}
      >
        {part.token}
      </CitationLink>
    )
  }

  return (
    <div style={style}>
      <p
        style={{
          margin: 0,
          lineHeight: 1.6,
          color: 'var(--color-text)',
          // The summary separates sentences with newlines and paragraphs with blank lines, which
          // HTML would otherwise collapse into one run-on block. pre-line honours both without
          // having to split the text around the citation tokens threaded through it.
          whiteSpace: 'pre-line',
          overflowWrap: 'anywhere',
        }}
      >
        {parts.map(renderPart)}
      </p>

      {sources.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <p
            style={{
              margin: '0 0 4px',
              fontSize: '0.6875rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--color-text-light)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {t('aiSummary.sources')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sources.map(source => {
              const label = labelFor(source)
              return (
                <CitationLink
                  key={source.token}
                  url={source.url}
                  title={label}
                  ariaLabel={label}
                  style={{
                    color: 'var(--color-primary)',
                    fontSize: 'inherit',
                    textDecoration: 'none',
                    // A source with no title falls back to its raw URL, which has no spaces to
                    // wrap at and would otherwise run past the edge of these narrow panels.
                    overflowWrap: 'anywhere',
                  }}
                >
                  {label} &rarr;
                </CitationLink>
              )
            })}
          </div>
        </div>
      )}

      {/* Lives in this component rather than in each page so an AI summary can never reach a
          surface without it. */}
      <p
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          margin: '10px 0 0',
          fontSize: '0.6875rem',
          color: 'var(--color-text-light)',
        }}
      >
        <Sparkles size={11} aria-hidden="true" style={{ flexShrink: 0 }} />
        {t('aiSummary.disclaimer')}
      </p>
    </div>
  )
}
