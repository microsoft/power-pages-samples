/**
 * Lightweight publish/subscribe channel for invoice mutations.
 *
 * Long-lived UI such as the sidebar badges stays mounted while the user moves
 * between routes, so it never re-runs its initial fetch when a page changes an
 * invoice. Mutation hooks publish here and those subscribers refetch instead of
 * waiting for a full page reload.
 */

import { useEffect } from 'react'

type InvoicesChangedListener = () => void

const listeners = new Set<InvoicesChangedListener>()

export function notifyInvoicesChanged(): void {
  for (const listener of [...listeners]) {
    listener()
  }
}

export function subscribeToInvoiceChanges(listener: InvoicesChangedListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Runs `onChange` whenever an invoice is created or updated. The callback is
 * read through a ref-free dependency list, so pass a stable `useCallback`.
 */
export function useInvoicesChanged(onChange: InvoicesChangedListener): void {
  useEffect(() => subscribeToInvoiceChanges(onChange), [onChange])
}
