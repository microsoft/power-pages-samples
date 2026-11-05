import type { Database } from '../data/types'
import type { CachePatch } from './loaders'

type Keyed = { id: string }

function upsert<T extends Keyed>(current: T[], incoming: T[] | undefined, drop?: (item: T) => boolean, defaults?: Partial<T>): T[] {
  let next = drop ? current.filter(item => !drop(item)) : current
  if (!incoming?.length) return next === current ? current : next
  const index = new Map(next.map((item, i) => [item.id, i]))
  next = [...next]
  for (const item of incoming) {
    const i = index.get(item.id)
    if (i === undefined) {
      index.set(item.id, next.length)
      next.push(defaults ? ({ ...defaults, ...definedOnly(item) } as T) : item)
    } else {
      next[i] = { ...next[i], ...definedOnly(item) }
    }
  }
  return next
}

/** Keeps cached values when a newer row omitted a column (e.g. trimmed list rows vs full workspace rows). */
function definedOnly<T extends object>(item: T): Partial<T> {
  return Object.fromEntries(Object.entries(item).filter(([, v]) => v !== undefined)) as Partial<T>
}

function insertMissing<T extends Keyed>(current: T[], refs: T[] | undefined): T[] {
  if (!refs?.length) return current
  const known = new Set(current.map(i => i.id))
  const add = refs.filter(r => !known.has(r.id) && (known.add(r.id), true))
  return add.length ? [...current, ...add] : current
}

/** Merges a live-mode loader patch into the normalized cache. */
export function mergePatch(db: Database, patch: CachePatch): Database {
  const r = patch.replace ?? {}
  return {
    accounts: insertMissing(upsert(db.accounts, patch.accounts), patch.accountRefs),
    contacts: insertMissing(upsert(db.contacts, patch.contacts, r.contacts), patch.contactRefs),
    // Trimmed list rows omit the expanded collections; a row seen for the first time still needs valid arrays.
    opportunities: upsert(db.opportunities, patch.opportunities, r.opportunities, {
      products: [], customerContactIds: [], collaboratingPartnerIds: [], sharedContactIds: [],
    }),
    dealRegistrations: upsert(db.dealRegistrations, patch.dealRegistrations, r.dealRegistrations),
    comments: upsert(db.comments, patch.comments, r.comments),
    invitations: upsert(db.invitations, patch.invitations, r.invitations),
    workOrders: upsert(db.workOrders, patch.workOrders, r.workOrders, { timeline: [] }),
    bookings: upsert(db.bookings, patch.bookings, r.bookings),
  }
}

export const EMPTY_DB: Database = { accounts: [], contacts: [], opportunities: [], dealRegistrations: [], comments: [], invitations: [], workOrders: [], bookings: [] }
