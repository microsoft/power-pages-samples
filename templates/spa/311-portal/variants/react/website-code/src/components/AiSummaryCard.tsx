// src/components/AiSummaryCard.tsx
// Presentation for a generative-AI summary produced by useAiSummary.

import { useEffect, useState } from 'react'
import { Check, ChevronDown, Copy, ExternalLink, Sparkles } from 'lucide-react'
import { useI18n } from '../i18n'
import { Skeleton } from './Skeleton'
import { SummaryMarkdown } from '../shared/markdown'
import { DataSummaryErrorCode } from '../services/aiSummaryService'
import type { AiSummaryResult } from '../shared/hooks/useAiSummary'

/**
 * Where an admin or maker turns the feature back on. Shown for the `disabled` status, which
 * covers both tenant/environment governance (90041001) and the per-site
 * `Summarization/Data/Enable` site setting (90041003).
 */
const COPILOT_HUB_DOC_URL = 'https://learn.microsoft.com/power-pages/admin/copilot-hub'

/**
 * Copilot's signature gradient. Kept verbatim from the Power Pages Copilot surfaces rather than
 * mapped to the site palette: the point of the accent is that users recognise the card as AI
 * output, and the site's own accent would read as ordinary chrome.
 */
const AI_GRADIENT =
  'linear-gradient(90deg, rgb(70, 79, 235) 35%, rgb(71, 207, 250) 70%, rgb(180, 124, 248) 92%)'

/** Maps a summarization error code to its i18n key; unknown codes fall back to a generic message. */
function errorMessageKey(code: string | undefined): string {
  switch (code) {
    case DataSummaryErrorCode.ContentTooLarge:
      return 'aiSummary.errorTooLarge'
    case DataSummaryErrorCode.TransientFailure:
      return 'aiSummary.errorTransient'
    default:
      return 'aiSummary.errorGeneric'
  }
}

interface AiSummaryCardProps extends AiSummaryResult {
  /** Extra classes for the animation stagger, e.g. "animate-in animate-in-2". */
  className?: string
  /**
   * i18n key for the card heading. Override it whenever the summary's scope is not obvious
   * from where the card sits — a collection summary on a page with client-side filters has to
   * name its scope in the heading, or visitors read it as describing the rows they filtered to.
   */
  titleKey?: string
  /** i18n key for the empty branch, so the copy can name what had nothing to summarize. */
  emptyKey?: string
}

export default function AiSummaryCard({
  status,
  summary,
  recommendations,
  errorCode,
  refresh,
  summarizeWithRecommendation,
  className,
  titleKey = 'aiSummary.title',
  emptyKey = 'aiSummary.empty',
}: AiSummaryCardProps) {
  const { t } = useI18n()
  const [isExpanded, setIsExpanded] = useState(true)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')

  // A fresh summary invalidates the copy confirmation from the previous text.
  useEffect(() => {
    setCopyStatus('idle')
  }, [summary])

  useEffect(() => {
    if (copyStatus === 'idle') return
    const timer = setTimeout(() => setCopyStatus('idle'), 2000)
    return () => clearTimeout(timer)
  }, [copyStatus])

  // The hook is idle only before a record id exists; the page has nothing to summarize yet.
  if (status === 'idle') return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    }
  }

  const iconButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 8px',
    background: 'transparent',
    border: '1px solid var(--color-border-light)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text-muted)',
    font: 'inherit',
    fontSize: '0.75rem',
    cursor: 'pointer',
  }

  return (
    <section
      className={className}
      aria-label={t(titleKey)}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-light)',
        borderRadius: 'var(--radius-lg)',
        // Clips the accent strip below to the card's rounded corners. A `border-image`
        // gradient would be simpler but browsers ignore border-radius whenever border-image
        // is set, which would leave this card square-cornered next to the site's rounded ones.
        overflow: 'hidden',
        marginBottom: 24,
      }}
    >
      <div aria-hidden="true" style={{ height: 3, background: AI_GRADIENT }} />

      <div style={{ padding: '16px 20px' }}>
        <button
          type="button"
          onClick={() => setIsExpanded(prev => !prev)}
          aria-expanded={isExpanded}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: 0,
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text)',
            font: 'inherit',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <Sparkles size={18} style={{ color: 'rgb(70, 79, 235)', flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{t(titleKey)}</span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            style={{
              marginLeft: 'auto',
              color: 'var(--color-text-light)',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          />
        </button>

        {/* The live region wraps every branch, not just the spinner, so screen readers announce
            the finished summary (or the failure) and not only that work started. */}
        {isExpanded && (
          <div
            aria-live="polite"
            aria-busy={status === 'loading'}
            style={{ marginTop: 12, fontSize: '0.9375rem', color: 'var(--color-text)' }}
          >
            {status === 'loading' && (
              <div>
                <span className="sr-only">{t('aiSummary.loading')}</span>
                <Skeleton height={12} borderRadius={6} style={{ marginBottom: 8 }} />
                <Skeleton height={12} borderRadius={6} style={{ marginBottom: 8 }} />
                <Skeleton width="70%" height={12} borderRadius={6} />
              </div>
            )}

            {status === 'empty' && (
              <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>{t(emptyKey)}</p>
            )}

            {status === 'error' && (
              <div>
                <p style={{ margin: '0 0 12px', color: 'var(--color-text-muted)' }}>
                  {t(errorMessageKey(errorCode))}
                </p>
                <button type="button" className="btn btn-secondary" onClick={refresh}>
                  {t('common.retry')}
                </button>
              </div>
            )}

            {/* No retry here: 90041001 and 90041003 both need a governance or site-setting
                change, so retrying can only reproduce the same failure. */}
            {status === 'disabled' && (
              <div>
                <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{t('aiSummary.disabledTitle')}</p>
                <p style={{ margin: '0 0 12px', color: 'var(--color-text-muted)' }}>
                  {t('aiSummary.disabledDesc')}
                </p>
                <a
                  href={COPILOT_HUB_DOC_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.875rem',
                    color: 'var(--color-accent)',
                  }}
                >
                  {t('aiSummary.disabledLink')}
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </div>
            )}

            {status === 'content' && (
              <>
                <SummaryMarkdown text={summary} />

                {recommendations.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <p
                      style={{
                        margin: '0 0 8px',
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--color-text-light)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {t('aiSummary.suggestions')}
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {recommendations.map(recommendation => (
                        <button
                          key={recommendation.Config}
                          type="button"
                          // Config is an opaque hash; it is passed straight back to the service.
                          onClick={() => summarizeWithRecommendation(recommendation.Config)}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--color-surface-alt)',
                            border: '1px solid var(--color-border-light)',
                            borderRadius: 999,
                            color: 'var(--color-text)',
                            font: 'inherit',
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                          }}
                        >
                          {recommendation.Text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexWrap: 'wrap',
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: '1px solid var(--color-border-light)',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleCopy}
                    aria-live="polite"
                    style={iconButtonStyle}
                  >
                    {copyStatus === 'copied'
                      ? <Check size={14} aria-hidden="true" />
                      : <Copy size={14} aria-hidden="true" />}
                    {copyStatus === 'copied'
                      ? t('aiSummary.copied')
                      : copyStatus === 'error'
                        ? t('aiSummary.copyFailed')
                        : t('aiSummary.copy')}
                  </button>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-light)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {t('aiSummary.disclaimer')}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
