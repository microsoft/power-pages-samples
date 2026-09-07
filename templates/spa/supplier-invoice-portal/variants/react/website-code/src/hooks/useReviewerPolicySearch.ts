// src/hooks/useReviewerPolicySearch.ts
// React hook wrapping the Search Summary API for the reviewer-only policy search.
// Manual trigger (the user must submit a query) plus loading/error/disabled state.

import { useCallback, useRef, useState } from 'react'
import {
  fetchSearchSummary,
  SearchSummaryApiError,
  type SearchSummaryResponse,
} from '../services/aiSummaryService'

export interface UseReviewerPolicySearchResult {
  query: string
  setQuery: (q: string) => void
  summary: string | null
  citations: SearchSummaryResponse['Citations']
  isLoading: boolean
  error: string | null
  errorCode: string | undefined
  /** True when the API responded with the 200-with-embedded disablement envelope. */
  isDisabled: boolean
  submit: () => Promise<void>
  reset: () => void
}

export function useReviewerPolicySearch(): UseReviewerPolicySearchResult {
  const [query, setQuery] = useState('')
  const [summary, setSummary] = useState<string | null>(null)
  const [citations, setCitations] = useState<SearchSummaryResponse['Citations']>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined)
  const [isDisabled, setIsDisabled] = useState(false)
  const activeRequestId = useRef(0)

  const reset = useCallback(() => {
    setSummary(null)
    setCitations([])
    setError(null)
    setErrorCode(undefined)
    setIsDisabled(false)
  }, [])

  const submit = useCallback(async () => {
    const trimmed = query.trim()
    if (!trimmed) return
    const requestId = ++activeRequestId.current
    setIsLoading(true)
    setError(null)
    setErrorCode(undefined)
    setIsDisabled(false)
    try {
      const response = await fetchSearchSummary(trimmed)
      if (requestId !== activeRequestId.current) return
      setSummary(response.Summary ?? '')
      setCitations(response.Citations ?? [])
    } catch (err) {
      if (requestId !== activeRequestId.current) return
      if (err instanceof SearchSummaryApiError) {
        setError(err.message)
        setErrorCode(err.code)
        setIsDisabled(err.disabled)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to search.')
      }
    } finally {
      if (requestId === activeRequestId.current) setIsLoading(false)
    }
  }, [query])

  return {
    query,
    setQuery,
    summary,
    citations,
    isLoading,
    error,
    errorCode,
    isDisabled,
    submit,
    reset,
  }
}
