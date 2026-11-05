// Live-mode partner administration writes that combine the shared actions.
import type { Account, Contact, PartnerContactRole } from '../data/types'
import { createContact, setPartnerRole, updateAccount } from './actions'
import { webApi } from './http'

/** P-034: company details plus the primary contact lookup (not part of accountPayload). */
export async function savePartnerAccount(id: string, fields: Partial<Account>, primaryContactId: string | undefined, previousPrimaryId: string | undefined): Promise<void> {
  await updateAccount(id, fields)
  if (primaryContactId === previousPrimaryId) return
  if (primaryContactId) await webApi.update('accounts', id, { 'primarycontactid@odata.bind': `/contacts(${primaryContactId})` })
  else await webApi.clearLookup('accounts', id, 'primarycontactid')
}

/** 11.3.18 partner contact under the caller's partner account, then the role (synced to web roles server-side). */
export async function createPartnerContact(fields: Partial<Contact>, role: PartnerContactRole | undefined, partnerId: string, meContactId: string): Promise<string> {
  const id = await createContact(fields, partnerId, meContactId)
  if (role) await setPartnerRole(id, role)
  return id
}
