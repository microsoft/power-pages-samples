// src/hooks/useReviewQueueSummary.ts
// React hook that wraps the Data Summarization API for the reviewer queue —
// a collection scope over spnvc_invoice filtered to Submitted (2) + Under Review (3).
//
// Surface: same as the single-record hooks, plus the scope is baked in so the
// call site stays a one-liner.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchListSummary,
  DataSummaryApiError,
  type DataSummaryRecommendation,
} from '../services/aiSummaryService'

const ENTITY_SET = 'spnvc_invoices'
const REVIEW_QUEUE_SELECT = [
  'spnvc_name',
  'spnvc_ponumber',
  'spnvc_amount',
  'spnvc_invoicestatus',
  'spnvc_submissiondate',
  'spnvc_duedate',
].join(',')
const REVIEW_QUEUE_EXPAND = [
  'spnvc_SupplierId($select=spnvc_name)',
].join(',')
// Submitted = 2, Under Review = 3 — mirrors the page's existing filter scope.
// No $top / Prefer: odata.maxpagesize — those are pagination concerns for the UI
// table; the summary is bounded by Summarization/Data/ContentSizeLimit.
const REVIEW_QUEUE_FILTER = 'spnvc_invoicestatus eq 2 or spnvc_invoicestatus eq 3'
const REVIEW_QUEUE_ORDERBY = 'spnvc_submissiondate asc'
const REVIEW_QUEUE_INSTRUCTION = 'Summarization/prompt/reviewqueue_summary'

export interface UseReviewQueueSummaryResult {
  summary: string | null
  recommendations: DataSummaryRecommendation[]
  isLoading: boolean
  error: string | null
  errorCode: string | undefined
  summarize: () => Promise<void>
  refineWithRecommendation: (rec: DataSummaryRecommendation) => Promise<void>
  reset: () => void
}

export function useReviewQueueSummary(): UseReviewQueueSummaryResult {
  const [summary, setSummary] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<DataSummaryRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined)

  const activeRequestId = useRef(0)
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const reset = useCallback(() => {
    setSummary(null)
    setRecommendations([])
    setError(null)
    setErrorCode(undefined)
    setIsLoading(false)
  }, [])

  const runRequest = useCallback(async (recommendationConfig?: string) => {
    const requestId = ++activeRequestId.current
    setIsLoading(true)
    setError(null)
    setErrorCode(undefined)
    try {
      const response = await fetchListSummary({
        entitySet: ENTITY_SET,
        select: REVIEW_QUEUE_SELECT,
        expand: REVIEW_QUEUE_EXPAND,
        filter: REVIEW_QUEUE_FILTER,
        orderby: REVIEW_QUEUE_ORDERBY,
        instructionIdentifier: recommendationConfig ? undefined : REVIEW_QUEUE_INSTRUCTION,
        recommendationConfig,
      })
      if (!isMountedRef.current || requestId !== activeRequestId.current) return
      setSummary(response.Summary ?? '')
      setRecommendations(response.Recommendations ?? [])
    } catch (err) {
      if (!isMountedRef.current || requestId !== activeRequestId.current) return
      if (err instanceof DataSummaryApiError) {
        setError(err.message)
        setErrorCode(err.code)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to generate summary.')
      }
    } finally {
      if (isMountedRef.current && requestId === activeRequestId.current) {
        setIsLoading(false)
      }
    }
  }, [])

  const summarize = useCallback(() => runRequest(undefined), [runRequest])

  const refineWithRecommendation = useCallback(
    (rec: DataSummaryRecommendation) => runRequest(rec.Config),
    [runRequest],
  )

  // Auto-load on mount.
  useEffect(() => {
    runRequest(undefined)
  }, [runRequest])

  return {
    summary,
    recommendations,
    isLoading,
    error,
    errorCode,
    summarize,
    refineWithRecommendation,
    reset,
  }
}
