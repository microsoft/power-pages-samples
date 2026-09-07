// src/hooks/useMyInvoicesSummary.ts
// React hook that wraps the Data Summarization API for the supplier's
// "My Invoices" list. RLS on spnvc_invoice scopes the collection to the
// signed-in supplier's own rows; the hook adds a status filter on top so
// the summary tracks whichever category the user is currently viewing.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchListSummary,
  DataSummaryApiError,
  type DataSummaryRecommendation,
} from '../services/aiSummaryService'
import { INVOICE_STATUS, type InvoiceStatusLabel } from '../types/invoice'

const ENTITY_SET = 'spnvc_invoices'
const MY_INVOICES_SELECT = [
  'spnvc_name',
  'spnvc_ponumber',
  'spnvc_description',
  'spnvc_amount',
  'spnvc_invoicestatus',
  'spnvc_submissiondate',
  'spnvc_duedate',
].join(',')
const MY_INVOICES_EXPAND = [
  'spnvc_SupplierId($select=spnvc_name)',
].join(',')
const MY_INVOICES_ORDERBY = 'spnvc_submissiondate desc'
const MY_INVOICES_INSTRUCTION = 'Summarization/prompt/myinvoices_summary'

export type MyInvoicesStatusFilter = InvoiceStatusLabel | 'All'

export interface UseMyInvoicesSummaryResult {
  summary: string | null
  recommendations: DataSummaryRecommendation[]
  isLoading: boolean
  error: string | null
  errorCode: string | undefined
  summarize: () => Promise<void>
  refineWithRecommendation: (rec: DataSummaryRecommendation) => Promise<void>
  reset: () => void
}

/**
 * Auto-loads on mount and whenever `statusFilter` changes. When the filter is
 * 'All' the summary covers every invoice the supplier can see (RLS-scoped);
 * otherwise it pins `spnvc_invoicestatus eq <value>`.
 */
export function useMyInvoicesSummary(
  statusFilter: MyInvoicesStatusFilter,
  enabled = true,
): UseMyInvoicesSummaryResult {
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

  const runRequest = useCallback(
    async (recommendationConfig?: string) => {
      if (!enabled) return
      const requestId = ++activeRequestId.current
      setIsLoading(true)
      setError(null)
      setErrorCode(undefined)
      try {
        const filter =
          statusFilter === 'All'
            ? undefined
            : `spnvc_invoicestatus eq ${INVOICE_STATUS[statusFilter]}`
        const response = await fetchListSummary({
          entitySet: ENTITY_SET,
          select: MY_INVOICES_SELECT,
          expand: MY_INVOICES_EXPAND,
          filter,
          orderby: MY_INVOICES_ORDERBY,
          instructionIdentifier: recommendationConfig ? undefined : MY_INVOICES_INSTRUCTION,
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
    },
    [statusFilter, enabled],
  )

  const summarize = useCallback(() => runRequest(undefined), [runRequest])

  const refineWithRecommendation = useCallback(
    (rec: DataSummaryRecommendation) => runRequest(rec.Config),
    [runRequest],
  )

  // Auto-load on mount and whenever the filter changes.
  useEffect(() => {
    if (enabled) runRequest(undefined)
    else reset()
  }, [enabled, runRequest, reset])

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
