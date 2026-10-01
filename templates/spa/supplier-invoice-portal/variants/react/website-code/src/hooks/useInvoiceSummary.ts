// src/hooks/useInvoiceSummary.ts
// React hook that wraps the Data Summarization API for a single spnvc_invoice record.
//
// Surface:
//   summary                    — the latest `Summary` string, or null if not yet run
//   recommendations            — follow-up prompt chips from the last response
//   isLoading                  — request in flight
//   error                      — user-facing error string, or null
//   errorCode                  — Dataverse/Power Pages error code (e.g. '90041001')
//                                so the UI can branch to remediation messaging
//   summarize()                — manual trigger; idempotent per invoiceId
//   refineWithRecommendation() — re-post with the opaque RecommendationConfig token
//   reset()                    — clear summary/recs/error (e.g. on invoice change)

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchDataSummary,
  DataSummaryApiError,
  type DataSummaryRecommendation,
} from '../services/aiSummaryService'

// Matches the orchestrator's Phase 2 contract — the $select / $expand / identifier are
// baked into the hook rather than surfaced as props so call sites stay a one-liner. If
// this hook ever needs to serve another table, lift these into args.
const ENTITY_SET = 'spnvc_invoices'
const INVOICE_SUMMARY_SELECT = [
  'spnvc_name',
  'spnvc_ponumber',
  'spnvc_description',
  'spnvc_submissiondate',
  'spnvc_duedate',
  'spnvc_amount',
  'spnvc_invoicestatus',
].join(',')
// Nav property casing verified against Dataverse metadata
// (ReferencedEntityNavigationPropertyName on the ManyToOne relationships).
const INVOICE_SUMMARY_EXPAND = [
  'spnvc_ContactId($select=fullname)',
  'spnvc_SupplierId($select=spnvc_name)',
].join(',')
const INVOICE_SUMMARY_INSTRUCTION = 'Summarization/prompt/invoice_summary'

export interface UseInvoiceSummaryResult {
  summary: string | null
  recommendations: DataSummaryRecommendation[]
  isLoading: boolean
  error: string | null
  errorCode: string | undefined
  summarize: () => Promise<void>
  refineWithRecommendation: (rec: DataSummaryRecommendation) => Promise<void>
  reset: () => void
}

export function useInvoiceSummary(invoiceId: string | undefined): UseInvoiceSummaryResult {
  const [summary, setSummary] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<DataSummaryRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined)

  // Guard against setState-after-unmount and against stale responses when the user
  // navigates between invoices while a summary request is in flight.
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

  // Reset when the user navigates to a different invoice — carrying a previous
  // summary over to a new record would be worse than showing the empty state.
  useEffect(() => {
    reset()
  }, [invoiceId, reset])

  const runRequest = useCallback(
    async (recommendationConfig?: string) => {
      if (!invoiceId) return
      const requestId = ++activeRequestId.current
      setIsLoading(true)
      setError(null)
      setErrorCode(undefined)
      try {
        const response = await fetchDataSummary({
          entitySet: ENTITY_SET,
          id: invoiceId,
          select: INVOICE_SUMMARY_SELECT,
          expand: INVOICE_SUMMARY_EXPAND,
          // On the initial call, send the instruction identifier. On a refinement,
          // the server wants the opaque Config token in `RecommendationConfig` and
          // nothing in `InstructionIdentifier`.
          instructionIdentifier: recommendationConfig ? undefined : INVOICE_SUMMARY_INSTRUCTION,
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
    [invoiceId],
  )

  const summarize = useCallback(() => runRequest(undefined), [runRequest])

  // Auto-load the summary when the page mounts with an invoice id (or when the id
  // changes via client-side navigation). The reset effect above runs first because
  // React invokes effects in declaration order, so state is cleared before the
  // fetch kicks off.
  useEffect(() => {
    if (invoiceId) runRequest(undefined)
  }, [invoiceId, runRequest])

  const refineWithRecommendation = useCallback(
    (rec: DataSummaryRecommendation) => runRequest(rec.Config),
    [runRequest],
  )

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
