import { useState } from 'react'
import { loadCatalog, loadPricingContext } from './productCatalog'
import { useLiveLoad } from './useLiveLoad'

/** Both loaders are keyed by their dependencies; useLiveLoad aborts and discards obsolete results. */
export function useProductCatalog(opportunityId: string, enabled: boolean, chosenListId: string) {
  const pricing = useLiveLoad(enabled ? `product-pricing:${opportunityId}` : null, async signal => ({
    patch: {},
    context: await loadPricingContext(opportunityId, signal),
  }))
  const context = enabled && pricing.status === 'ready' ? pricing.result?.context : undefined
  const priceListId = context?.opportunity._pricelevelid_value || chosenListId
  const validList = !!context?.lists.some(l => l.pricelevelid.toLowerCase() === priceListId.toLowerCase())
  const products = useLiveLoad(
    enabled && context && validList ? `product-catalog:${opportunityId}:${context.currencyId}:${priceListId}` : null,
    async signal => ({
      patch: {},
      catalog: await loadCatalog(priceListId, signal),
    }),
  )
  const [retrying, setRetrying] = useState(false)
  const retry = async () => {
    setRetrying(true)
    try {
      await pricing.reload()
      await products.reload()
    } finally {
      setRetrying(false)
    }
  }
  const ready = !retrying && !!context && validList && products.status === 'ready' && !!products.result && !pricing.error && !products.error
  return {
    context,
    priceListId,
    catalog: ready ? products.result?.catalog : undefined,
    ready,
    loading: retrying || pricing.status === 'loading' || (validList && products.status === 'loading'),
    error: pricing.error || (validList ? products.error : undefined),
    retry,
  }
}
