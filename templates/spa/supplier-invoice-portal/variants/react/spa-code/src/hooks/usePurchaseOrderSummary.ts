// src/hooks/usePurchaseOrderSummary.ts
// React hook that wraps the Data Summarization API for a single spnvc_purchaseorder record.
//
// Mirrors useInvoiceSummary — same surface, same stale-response guard, same error
// propagation — just with the PO-specific entity set, $select/$expand, and instruction
// identifier baked in. If a third table ever needs this, lift these into args.
//
// Surface:
//   summary                    — the latest `Summary` string, or null if not yet run
//   recommendations            — follow-up prompt chips from the last response
//   isLoading                  — request in flight
//   error                      — user-facing error string, or null
//   errorCode                  — Dataverse/Power Pages error code (e.g. '90041001')
//                                so the UI can branch to remediation messaging
//   summarize()                — manual trigger; idempotent per purchaseOrderId
//   refineWithRecommendation() — re-post with the opaque RecommendationConfig token
//   reset()                    — clear summary/recs/error (e.g. on PO change)

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchDataSummary,
  DataSummaryApiError,
  type DataSummaryRecommendation,
} from '../services/aiSummaryService'

// Matches the orchestrator's Phase 2 contract — the $select / $expand / identifier are
// baked into the hook rather than surfaced as props so call sites stay a one-liner.
const ENTITY_SET = 'spnvc_purchaseorders'
const PURCHASE_ORDER_SUMMARY_SELECT = [
  'spnvc_name',
  'spnvc_description',
  'spnvc_totalamount',
  'spnvc_deliverydate',
  'spnvc_postatus',
].join(',')
// Nav property casing verified against Dataverse metadata
// (ReferencedEntityNavigationPropertyName on the ManyToOne relationship).
const PURCHASE_ORDER_SUMMARY_EXPAND = [
  'spnvc_SupplierId($select=spnvc_name)',
].join(',')
const PURCHASE_ORDER_SUMMARY_INSTRUCTION = 'Summarization/prompt/purchaseorder_summary'

export interface UsePurchaseOrderSummaryResult {
  summary: string | null
  recommendations: DataSummaryRecommendation[]
  isLoading: boolean
  error: string | null
  errorCode: string | undefined
  summarize: () => Promise<void>
  refineWithRecommendation: (rec: DataSummaryRecommendation) => Promise<void>
  reset: () => void
}

export function usePurchaseOrderSummary(
  purchaseOrderId: string | undefined,
): UsePurchaseOrderSummaryResult {
  const [summary, setSummary] = useState<string | null>(null)
  const [recommendations, setRecommendations] = useState<DataSummaryRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined)

  // Guard against setState-after-unmount and against stale responses when the user
  // navigates between POs while a summary request is in flight.
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

  // Reset when the user navigates to a different PO — carrying a previous summary over
  // to a new record would be worse than showing the empty state.
  useEffect(() => {
    reset()
  }, [purchaseOrderId, reset])

  const runRequest = useCallback(
    async (recommendationConfig?: string) => {
      if (!purchaseOrderId) return
      const requestId = ++activeRequestId.current
      setIsLoading(true)
      setError(null)
      setErrorCode(undefined)
      try {
        const response = await fetchDataSummary({
          entitySet: ENTITY_SET,
          id: purchaseOrderId,
          select: PURCHASE_ORDER_SUMMARY_SELECT,
          expand: PURCHASE_ORDER_SUMMARY_EXPAND,
          // On the initial call, send the instruction identifier. On a refinement,
          // the server wants the opaque Config token in `RecommendationConfig` and
          // nothing in `InstructionIdentifier`.
          instructionIdentifier: recommendationConfig
            ? undefined
            : PURCHASE_ORDER_SUMMARY_INSTRUCTION,
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
    [purchaseOrderId],
  )

  const summarize = useCallback(() => runRequest(undefined), [runRequest])

  // Auto-load the summary when the page mounts with a PO id (or when the id changes
  // via client-side navigation). The reset effect above runs first because React
  // invokes effects in declaration order.
  useEffect(() => {
    if (purchaseOrderId) runRequest(undefined)
  }, [purchaseOrderId, runRequest])

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
