import { useEffect, useRef, useState } from 'react'
import { fetchSearchSummary, SearchSummaryApiError, verifyKnowledgeSummary, type KnowledgeSource, type VerifiedSummary } from '../services/aiSummaryService'

const kbAiSearchEnabled = import.meta.env.VITE_KB_AI_SEARCH_ENABLED === 'true'

type SummaryState =
  | { kind: 'idle' }
  | { kind: 'demo' | 'setup-unavailable' | 'loading' | 'empty' | 'disabled'; query: string }
  | { kind: 'error'; query: string; error: SearchSummaryApiError }
  | { kind: 'success'; query: string; summary: VerifiedSummary }

export function useSearchSummary(articles: readonly KnowledgeSource[], isDemo: boolean, ready: boolean) {
  const [state, setState] = useState<SummaryState>({ kind: 'idle' })
  const generation = useRef(0)
  const request = useRef<AbortController | null>(null)
  function reset() {
    generation.current++
    request.current?.abort()
    request.current = null
    setState({ kind: 'idle' })
  }
  useEffect(() => {
    setState({ kind: 'idle' })
    return () => { generation.current++; request.current?.abort(); request.current = null }
  }, [articles, isDemo, ready])

  async function run(query: string) {
    reset()
    if (!query.trim()) return
    if (isDemo) { setState({ kind: 'demo', query }); return }
    if (!kbAiSearchEnabled) { setState({ kind: 'setup-unavailable', query }); return }
    if (!ready) { setState({ kind: 'error', query, error: new SearchSummaryApiError('NOT_READY') }); return }
    const current = generation.current, controller = new AbortController()
    request.current = controller
    setState({ kind: 'loading', query })
    try {
      const response = await fetchSearchSummary(query, controller.signal)
      if (generation.current !== current || controller.signal.aborted) return
      const summary = verifyKnowledgeSummary(response, articles, location.origin)
      setState(summary ? { kind: 'success', query, summary } : { kind: 'empty', query })
    } catch (error) {
      if (generation.current !== current || controller.signal.aborted) return
      const failure = error instanceof SearchSummaryApiError ? error : new SearchSummaryApiError('SERVICE')
      setState(failure.code === 'DISABLED' ? { kind: 'disabled', query } : { kind: 'error', query, error: failure })
    } finally {
      if (generation.current === current) request.current = null
    }
  }
  return { state, run, reset }
}
