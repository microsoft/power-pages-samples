import { useEffect, useState } from 'react'
import { verifyCreatePreflight } from '../services/serverLogicApi'

export function useCreatePreflight(endpoint: 'submit-invoice' | 'create-purchase-order', selectedId: string) {
  const [state, setState] = useState<{
    key: string; ready: boolean; loading: boolean; error: string | null
  }>({ key: '', ready: false, loading: false, error: null })
  const key = `${endpoint}:${selectedId}`
  useEffect(() => {
    let current = true
    if (!selectedId) {
      setState({ key, ready: false, loading: false, error: null })
      return
    }
    setState({ key, ready: false, loading: true, error: null })
    verifyCreatePreflight(endpoint, selectedId).then(
      () => { if (current) setState({ key, ready: true, loading: false, error: null }) },
      error => {
        if (current) setState({ key, ready: false, loading: false,
          error: error instanceof Error ? error.message : 'Create prerequisites could not be verified.' })
      },
    )
    return () => { current = false }
  }, [endpoint, selectedId, key])
  // Selection identity gates readiness before effects run and after stale reads.
  const matches = state.key === key
  return {
    ready: matches && state.ready,
    isLoading: Boolean(selectedId) && (!matches || state.loading),
    error: matches ? state.error : null,
  }
}
