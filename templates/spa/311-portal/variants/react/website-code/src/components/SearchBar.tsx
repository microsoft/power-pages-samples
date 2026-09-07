import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useServiceTypes } from '../shared/hooks/useServiceTypes'
import { useArticles } from '../shared/hooks/useArticles'
import { useI18n } from '../i18n'
import Icon from './Icon'

interface SearchResult {
  type: 'service' | 'article'
  title: string
  description: string
  url: string
  serviceSlug?: string
}

export default function SearchBar({ large = false }: { large?: boolean }) {
  const { serviceTypes } = useServiceTypes()
  const { articles } = useArticles()
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function search(q: string) {
    setQuery(q)
    if (q.length < 2) { setResults([]); setOpen(false); return }
    const lower = q.toLowerCase()
    const serviceResults: SearchResult[] = serviceTypes
      .filter(s => s.name.toLowerCase().includes(lower) || s.description.toLowerCase().includes(lower))
      .slice(0, 5)
      .map(s => ({ type: 'service', title: s.name, description: s.description, url: `/services/${s.slug}`, serviceSlug: s.slug }))
    const articleResults: SearchResult[] = articles
      .filter(a => a.title.toLowerCase().includes(lower) || a.summary.toLowerCase().includes(lower))
      .slice(0, 5)
      .map(a => ({ type: 'article', title: a.title, description: a.summary, url: `/knowledge/${a.slug}` }))
    setResults([...serviceResults, ...articleResults])
    setOpen(true)
    setActiveIndex(-1)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, -1)) }
    if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); navigate(results[activeIndex].url); setOpen(false); setQuery('') }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', maxWidth: large ? 640 : 480 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: '#fff',
        border: '2px solid var(--color-border)',
        borderRadius: large ? 14 : 10,
        padding: large ? '4px 4px 4px 20px' : '2px 2px 2px 16px',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
        ...(open ? { borderColor: 'var(--color-primary)', boxShadow: '0 0 0 3px rgba(27, 73, 101, 0.1)' } : {}),
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={e => search(e.target.value)}
          onFocus={() => { if (results.length) setOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder={t('search.placeholder')}
          aria-label={t('search.aria')}
          aria-expanded={open}
          role="combobox"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-activedescendant={activeIndex >= 0 ? `search-result-${activeIndex}` : undefined}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-body)',
            fontSize: large ? '1.0625rem' : '0.9375rem',
            padding: large ? '14px 12px' : '10px 12px',
            color: 'var(--color-text)',
          }}
        />
      </div>

      {open && results.length > 0 && (
        <ul
          id="search-results"
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#fff',
            border: '1px solid var(--color-border)',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(26, 35, 50, 0.12)',
            listStyle: 'none',
            padding: '6px',
            zIndex: 50,
            maxHeight: 400,
            overflow: 'auto',
          }}
        >
          {results.map((r, i) => (
            <li
              key={r.url}
              id={`search-result-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onClick={() => { navigate(r.url); setOpen(false); setQuery('') }}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                background: i === activeIndex ? 'var(--color-surface-alt)' : 'transparent',
                transition: 'background 100ms ease',
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span style={{ lineHeight: 1, color: 'var(--color-primary)' }}>
                {r.type === 'service' && r.serviceSlug ? <Icon name={r.serviceSlug} size={18} /> : <FileText size={18} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>
                    {r.title}
                  </span>
                  <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>
                    {r.type === 'service' ? t('search.badgeService') : t('search.badgeArticle')}
                  </span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
