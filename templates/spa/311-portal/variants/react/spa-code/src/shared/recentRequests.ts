// src/shared/recentRequests.ts
// Lightweight, client-side history of service requests the user has submitted
// on THIS device. Because requests are no longer associated to the signed-in
// contact (that association requires AppendTo permission on the contact table),
// we can't query "my requests" from the server. Instead we remember the request
// numbers locally so the Track page can offer one-click lookup -- no copying.

const STORAGE_KEY = 'zava311.recentRequests'
const MAX_ENTRIES = 10

export interface RecentRequest {
  number: string
  serviceTypeName?: string
  createdOn: string
}

/** Returns the locally-remembered requests, most recent first. */
export function getRecentRequests(): RecentRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (r): r is RecentRequest => !!r && typeof r.number === 'string'
    )
  } catch {
    return []
  }
}

/** Records a newly-created request, de-duplicating by number and capping the list. */
export function addRecentRequest(req: RecentRequest): void {
  try {
    const existing = getRecentRequests().filter(r => r.number !== req.number)
    const updated = [req, ...existing].slice(0, MAX_ENTRIES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    /* localStorage unavailable (private mode / quota) -- non-fatal */
  }
}
