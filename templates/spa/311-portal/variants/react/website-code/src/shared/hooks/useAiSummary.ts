// src/shared/hooks/useAiSummary.ts
// React bindings for the generative-AI endpoints in src/services/aiSummaryService.ts.
//
// Both hooks here share one request primitive, useAbortableRequest, so the cancellation and
// stale-response rules below exist in exactly one place. They differ only in how a settled
// request maps onto UI state, because the two endpoints fail in different ways and the two
// surfaces degrade differently: the summary card reports its failures, while the related-article
// panels fall back to a non-AI list without saying anything.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DataSummaryError,
  fetchSearchSummary,
  isGenAiSearchDisabled,
  isSummarizationDisabledError,
  isSummarizationEmptyError,
  type DataSummaryRecommendation,
  type DataSummaryResponse,
  type SearchSummaryResponse,
} from '../../services/aiSummaryService'

// -- Shared request lifecycle -------------------------------------------------

type RequestPhase<TResult> =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; result: TResult }
  | { kind: 'failure'; error: unknown }

/**
 * Drive one cancellable request keyed on `subject`.
 *
 * @param subject Identifies what to request and is also the trigger: the request runs once per
 *   distinct value. While undefined the hook stays idle and issues nothing, which is how a page
 *   defers until its own record fetch resolves or until the surface is actually on screen.
 * @param request Issues the call. It must be referentially stable across renders (useCallback,
 *   or a module-scope function) — an inline lambda restarts the request on every render.
 *   `variant` carries the optional second argument some callers re-run with.
 */
function useAbortableRequest<TResult>(
  subject: string | undefined,
  request: (
    subject: string,
    variant: string | undefined,
    signal: AbortSignal
  ) => Promise<TResult>
): { phase: RequestPhase<TResult>; run: (variant?: string) => void } {
  const [phase, setPhase] = useState<RequestPhase<TResult>>({ kind: 'idle' })

  // Bumped on every run so a slow in-flight response cannot overwrite the state of a newer one.
  // These calls take seconds, and the user can navigate to another subject or re-run while a
  // request is outstanding.
  const runIdRef = useRef(0)
  // Holds the controller for the request in flight, so starting a new run or unmounting cancels
  // the previous one instead of paying for a result nobody will see.
  const controllerRef = useRef<AbortController | null>(null)

  const run = useCallback(
    (variant?: string) => {
      if (!subject) {
        setPhase({ kind: 'idle' })
        return
      }

      const runId = ++runIdRef.current
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      setPhase({ kind: 'loading' })

      request(subject, variant, controller.signal)
        .then(result => {
          if (runId !== runIdRef.current) return
          setPhase({ kind: 'success', result })
        })
        .catch((error: unknown) => {
          if (runId !== runIdRef.current) return
          // An abort that reached here was not caused by a newer run or by unmount (both bump
          // runIdRef first), so there is no newer state to protect and nothing to report.
          if (error instanceof DOMException && error.name === 'AbortError') return
          setPhase({ kind: 'failure', error })
        })
    },
    [subject, request]
  )

  useEffect(() => {
    if (!subject) {
      // Invalidate any in-flight run so its response cannot land on the cleared state.
      runIdRef.current++
      controllerRef.current?.abort()
      controllerRef.current = null
      setPhase({ kind: 'idle' })
      return
    }

    run()
    return () => {
      runIdRef.current++
      controllerRef.current?.abort()
      controllerRef.current = null
    }
  }, [subject, run])

  return { phase, run }
}

// -- Data summarization -------------------------------------------------------

/**
 * The four UI branches the summary card must render, plus `disabled` (a remediation state that
 * no retry can clear) and `idle` (nothing to summarize yet).
 */
export type AiSummaryStatus = 'idle' | 'loading' | 'content' | 'empty' | 'error' | 'disabled'

export interface AiSummaryResult {
  status: AiSummaryStatus
  summary: string
  recommendations: DataSummaryRecommendation[]
  /** Server error code (e.g. '90041004') so the UI can pick a localized message. */
  errorCode?: string
  /** Re-run with the maker-defined prompt. */
  refresh: () => void
  /** Re-run with a recommendation's opaque `Config` hash, sent verbatim. */
  summarizeWithRecommendation: (config: string) => void
}

/** Shared empty array so consumers can safely depend on the identity of `recommendations`. */
const NO_RECOMMENDATIONS: DataSummaryRecommendation[] = []

/**
 * Drive a summarization request for a single subject.
 *
 * @param subject The Dataverse GUID for a record summary, or the entity set name for a
 *   collection summary. Passed through to `summarize`, and the request trigger — see
 *   useAbortableRequest. A page whose filters are applied client-side keeps a constant subject
 *   and so is never re-summarized as the user narrows the view.
 * @param summarize Issues the request. Must be referentially stable across renders.
 */
export function useAiSummary(
  subject: string | undefined,
  summarize: (
    subject: string,
    recommendationConfig: string | undefined,
    signal: AbortSignal
  ) => Promise<DataSummaryResponse>
): AiSummaryResult {
  const { phase, run } = useAbortableRequest(subject, summarize)

  const { status, summary, recommendations, errorCode } = useMemo((): Omit<
    AiSummaryResult,
    'refresh' | 'summarizeWithRecommendation'
  > => {
    switch (phase.kind) {
      case 'idle':
        return { status: 'idle', summary: '', recommendations: NO_RECOMMENDATIONS }

      case 'loading':
        return { status: 'loading', summary: '', recommendations: NO_RECOMMENDATIONS }

      case 'success': {
        const text = phase.result.Summary.trim()
        return {
          // A 200 with a blank Summary is a documented outcome when the model has nothing to
          // say; it is an empty state, not a success with no text.
          status: text ? 'content' : 'empty',
          summary: text,
          recommendations: phase.result.Recommendations,
        }
      }

      case 'failure':
        return {
          status: isSummarizationEmptyError(phase.error)
            ? 'empty'
            : isSummarizationDisabledError(phase.error)
              ? 'disabled'
              : 'error',
          summary: '',
          recommendations: NO_RECOMMENDATIONS,
          errorCode: phase.error instanceof DataSummaryError ? phase.error.code : undefined,
        }
    }
  }, [phase])

  const refresh = useCallback(() => { run() }, [run])

  const summarizeWithRecommendation = useCallback(
    (config: string) => { run(config) },
    [run]
  )

  return { status, summary, recommendations, errorCode, refresh, summarizeWithRecommendation }
}

// -- Search summary -----------------------------------------------------------

/**
 * Branches for a search summary used as an enhancement over an existing feature.
 *
 * Every way of not getting a summary collapses into `unavailable` on purpose. The related-article
 * panels that consume this already have a working non-AI list to fall back to, so a disabled
 * site toggle, an empty result and a network failure all call for the same thing: render the old
 * list and say nothing. A surface where the AI output *is* the feature wants the richer branches
 * on AiSummaryStatus instead.
 */
export type SearchSummaryStatus = 'idle' | 'loading' | 'content' | 'unavailable'

export interface SearchSummaryResult {
  status: SearchSummaryStatus
  /** Prose with inline `[[N]](url)` tokens. Non-empty only when status is 'content'. */
  summary: string
  /** Citation token (`"[1]"`) to source title, for labelling citation links. */
  citationTitleMapping: Record<string, string>
  refresh: () => void
}

/** Shared empty map so consumers can safely depend on the identity of `citationTitleMapping`. */
const NO_CITATION_TITLES: Record<string, string> = {}

// Module scope keeps this referentially stable, which useAbortableRequest requires. The variant
// argument is unused: the search endpoint takes a query and nothing else.
const requestSearchSummary = (
  userQuery: string,
  _variant: string | undefined,
  signal: AbortSignal
): Promise<SearchSummaryResponse> => fetchSearchSummary(userQuery, signal)

/**
 * Ask the site search index to summarize an answer to `userQuery`.
 *
 * @param userQuery Natural-language question, and the request trigger — see useAbortableRequest.
 *   Pass undefined to hold the request, which is how a caller skips the call entirely while the
 *   surface is off screen or its subject has not loaded.
 */
export function useSearchSummary(userQuery: string | undefined): SearchSummaryResult {
  const { phase, run } = useAbortableRequest(userQuery, requestSearchSummary)

  // Failures are invisible in the UI by design, so without this the most common cause — the site
  // toggle being off — would look like "the search index has nothing on this topic" to whoever
  // is configuring the site.
  useEffect(() => {
    if (phase.kind !== 'failure') return
    if (isGenAiSearchDisabled(phase.error)) {
      console.warn(
        'Search summary is disabled for this site, so related articles fell back to tag matching. ' +
          'Enable it under Set up workspace > Copilot > Site search (preview).'
      )
    } else {
      console.warn('Search summary request failed; falling back to tag matching.', phase.error)
    }
  }, [phase])

  const { status, summary, citationTitleMapping } = useMemo((): Omit<
    SearchSummaryResult,
    'refresh'
  > => {
    if (phase.kind === 'idle') {
      return { status: 'idle', summary: '', citationTitleMapping: NO_CITATION_TITLES }
    }
    if (phase.kind === 'loading') {
      return { status: 'loading', summary: '', citationTitleMapping: NO_CITATION_TITLES }
    }
    if (phase.kind === 'failure') {
      return { status: 'unavailable', summary: '', citationTitleMapping: NO_CITATION_TITLES }
    }

    // A 200 is not yet a success: this endpoint reports soft failures in ErrorMessage, and
    // returns whitespace-only prose when the index has nothing on the topic. Both mean there is
    // nothing worth showing in place of the existing list.
    const text = phase.result.Summary.trim()
    if (phase.result.ErrorMessage?.trim() || text.length === 0) {
      return { status: 'unavailable', summary: '', citationTitleMapping: NO_CITATION_TITLES }
    }

    return {
      status: 'content',
      summary: text,
      citationTitleMapping: phase.result.CitationTitleMapping ?? NO_CITATION_TITLES,
    }
  }, [phase])

  const refresh = useCallback(() => { run() }, [run])

  return { status, summary, citationTitleMapping, refresh }
}
