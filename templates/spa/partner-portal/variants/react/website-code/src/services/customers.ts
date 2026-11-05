// Live-mode loaders/writes for the Customers area that build on loaders.ts / actions.ts.
import type { Account } from '../data/types'
import { serverLogic, webApi } from './http'
import { loadCustomerAccounts, loadCustomerContacts, type CachePatch } from './loaders'
import { createCustomerAccount } from './actions'
import { accountPayload, toAccountRef, toContact, type Row } from './mappers'

interface AccountsRequest {
  controller: AbortController
  promise: Promise<CachePatch>
  consumers: number
}

const inflight = new Map<string, AccountsRequest>()

/** L-002 list, shared between concurrent callers (e.g. the contact form and its account picker). */
export function loadCustomerAccountsOnce(partnerId: string | undefined, signal?: AbortSignal): Promise<CachePatch> {
  if (signal?.aborted) return Promise.reject(signal.reason)
  if (!partnerId) return Promise.resolve({})
  let request = inflight.get(partnerId)
  if (!request) {
    const controller = new AbortController()
    const entry: AccountsRequest = {
      controller,
      consumers: 0,
      promise: loadCustomerAccounts(partnerId, controller.signal).finally(() => {
        if (inflight.get(partnerId) === entry) inflight.delete(partnerId)
      }),
    }
    inflight.set(partnerId, entry)
    request = entry
  }
  const shared = request
  shared.consumers++
  return new Promise<CachePatch>((resolve, reject) => {
    let released = false
    const release = () => {
      if (released) return
      released = true
      signal?.removeEventListener('abort', onAbort)
      if (--shared.consumers === 0) {
        if (inflight.get(partnerId) === shared) inflight.delete(partnerId)
        shared.controller.abort()
      }
    }
    const onAbort = () => {
      release()
      reject(signal?.reason)
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    shared.promise.then(
      patch => {
        if (released) return
        release()
        resolve(patch)
      },
      error => {
        if (released) return
        release()
        reject(error)
      },
    )
  })
}

/** Customer accounts + contacts: `customerContacts()` only lists contacts whose (full) parent account is cached. */
export async function loadCustomerLists(partnerId: string | undefined, signal?: AbortSignal): Promise<CachePatch> {
  if (!partnerId) return {}
  const [accounts, contacts] = await Promise.all([loadCustomerAccountsOnce(partnerId, signal), loadCustomerContacts(partnerId, signal)])
  return { ...contacts, accounts: accounts.accounts, contactRefs: accounts.contactRefs }
}

/** P-012: one customer contact with its parent account reference (contact-directory); `found` is false when not visible. */
export async function loadCustomerContact(id: string, signal?: AbortSignal): Promise<{ found: boolean; patch: CachePatch }> {
  const res = await serverLogic<{ status: string; found?: boolean; contact?: Row }>('contact-directory', { id }, signal)
  if (!res.found || !res.contact) return { found: false, patch: {} }
  const parent = res.contact.parentcustomerid_account as Row | undefined
  return { found: true, patch: { contacts: [toContact(res.contact)], accountRefs: parent?.accountid ? [toAccountRef(parent)] : [] } }
}

/** P-011/P-012: account options (L-002) and, when editing, the contact. */
export async function loadCustomerContactForm(
  partnerId: string | undefined,
  id: string | null,
  signal?: AbortSignal,
): Promise<{ found: boolean; patch: CachePatch }> {
  const [accounts, contact] = await Promise.all([
    loadCustomerAccountsOnce(partnerId, signal),
    id ? loadCustomerContact(id, signal) : Promise.resolve({ found: true, patch: {} as CachePatch }),
  ])
  return { found: contact.found, patch: { ...accounts, ...contact.patch, contactRefs: accounts.contactRefs } }
}

/** P-008: create with the account number in one validated call (C-PROC-004 sets the managing partner). */
export async function createCustomerAccountWithNumber(a: Partial<Account>, meContactId: string): Promise<string> {
  return createCustomerAccount(a, meContactId, a.accountNumber)
}

/** P-009: details, account number and primary contact in one PATCH (clearing the lookup needs a $ref DELETE). */
export async function saveCustomerAccount(
  id: string,
  a: Partial<Account>,
  primaryContactId: string | undefined,
  previousPrimaryId: string | undefined,
): Promise<void> {
  const payload: Record<string, unknown> = { ...accountPayload(a), accountnumber: a.accountNumber ?? null }
  if (primaryContactId) payload['primarycontactid@odata.bind'] = `/contacts(${primaryContactId})`
  await webApi.update('accounts', id, payload)
  if (!primaryContactId && previousPrimaryId) await webApi.clearLookup('accounts', id, 'primarycontactid')
}
