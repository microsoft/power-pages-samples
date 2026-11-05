// Opportunity-area loader wrappers (live mode).
// - List rows are permission-scoped by the server but don't expand products, customer contacts or shared partner
//   contacts: those columns are left undefined so the cache keeps what the details screen loaded.
// - Records that left a list (accepted, declined, returned…) are dropped from the cache before the merge.
import type { Opportunity } from '../data/types'
import { loadDashboard, loadOpportunityList, type CachePatch } from './loaders'

type Scope = (o: Opportunity) => boolean

const isDistributed: Scope = o => o.status === 'Delivered' && !o.collaboration
const isManaged: Scope = o => !isDistributed(o)

function normalize(patch: CachePatch, scope: Scope, sellerContactId?: string): CachePatch {
  const incoming = patch.opportunities ?? []
  const ids = new Set(incoming.map(o => o.id))
  const opportunities = incoming.map(o => {
    const row: Partial<Opportunity> = { ...o }
    delete row.products
    delete row.customerContactIds
    if (!o.collaboratingPartnerIds?.length) delete row.collaboratingPartnerIds
    if (!o.sharedContactIds?.length) delete row.sharedContactIds
    // Sellers only receive rows assigned or shared to them (table permissions), so unassigned rows are shared ones.
    if (sellerContactId && o.partnerContactId !== sellerContactId && !o.collaboration) row.sharedContactIds = [sellerContactId]
    return row as Opportunity
  })
  return { ...patch, opportunities, replace: { ...patch.replace, opportunities: o => scope(o) && !ids.has(o.id) } }
}

export async function loadOpportunityListFresh(view: 'distributed' | 'managed', sellerContactId?: string, signal?: AbortSignal): Promise<CachePatch> {
  return normalize(await loadOpportunityList(view, signal), view === 'distributed' ? isDistributed : isManaged, sellerContactId)
}

/** Opportunities home: one partner-dashboard call (distributed + managed rows). */
export async function loadOpportunityRows(sellerContactId?: string, signal?: AbortSignal): Promise<{ patch: CachePatch }> {
  const { patch } = await loadDashboard('rows', signal)
  return { patch: normalize(patch, () => true, sellerContactId) }
}
