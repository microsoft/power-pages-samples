// Live-mode loader for the signed-in contact (Profile / partner application).
import { serverLogic } from './http'
import type { CachePatch } from './loaders'
import { toContact, type Row } from './mappers'

/** Re-reads the signed-in contact (contact-directory: role, parent and application columns aren't Web API fields). */
export async function loadOwnContact(_contactId: string): Promise<CachePatch> {
  const res = await serverLogic<{ status: string; me: Row }>('contact-directory', { scope: 'me' })
  return { contacts: [toContact(res.me)] }
}
