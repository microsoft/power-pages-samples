// Live-mode writes. Per §11.3: plain create/update/associate/deactivate go through the Web API (Dataverse
// workflows/plug-ins keep firing); workflow-backed opportunity actions go through server logic, and invitations through
// a synchronous Power Pages cloud flow.
import type { Account, Contact, OpportunityProduct, PartnerContactRole, PurchaseTimeframe } from '../data/types'
import { FLOW_IDS } from './config'
import { cloudFlow, serverLogicPost, webApi } from './http'
import { accountPayload, contactPayload, GEO_FLAGS, PARTNER_ROLE_VALUE, timeframeValue } from './mappers'
import { territoryIdByName } from './loaders'

const bind = (set: string, id?: string) => (id ? `/${set}(${id})` : undefined)
const clean = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined))

/* ------------------------------ Opportunities ----------------------------- */

export interface OpportunityFields {
  topic?: string
  customerId?: string
  estRevenue?: number
  estCloseDate?: string
  purchaseTimeframe?: PurchaseTimeframe
  territory?: string
  description?: string
  customerNeed?: string
}

function opportunityPayload(f: OpportunityFields): Record<string, unknown> {
  const territoryId = f.territory ? territoryIdByName(f.territory) : undefined
  return clean({
    name: f.topic?.trim(),
    estimatedvalue: f.estRevenue,
    isrevenuesystemcalculated: f.estRevenue !== undefined ? false : undefined,
    estimatedclosedate: f.estCloseDate || undefined,
    purchasetimeframe: f.purchaseTimeframe !== undefined ? timeframeValue(f.purchaseTimeframe) : undefined,
    description: f.description !== undefined ? f.description.trim() || null : undefined,
    customerneed: f.customerNeed !== undefined ? f.customerNeed.trim() || null : undefined,
    'customerid_account@odata.bind': bind('accounts', f.customerId),
    'parentaccountid@odata.bind': bind('accounts', f.customerId),
    'adx_TerritoryId@odata.bind': bind('territories', territoryId),
  })
}

/**
 * F-013 / REQ-ACT-21: partner-created, owned by the caller's partner. The partner, partner-created flag and status
 * aren't Web API fields, so the opportunity-create server logic sets them after validating the customer and owner.
 */
export async function createOpportunity(f: OpportunityFields, _me: { contactId: string; partnerId: string }, partnerContactId?: string): Promise<string> {
  const res = await serverLogicPost<{ status: string; id: string }>('opportunity-create', { fields: opportunityPayload(f), partnerContactId })
  return res.id
}

/** F-014 / REQ-ACT-10: only changed user columns. */
export const updateOpportunity = (id: string, f: OpportunityFields) => webApi.update('opportunities', id, opportunityPayload(f))

/** A-10 Assign: msa_partneroppid (C-PROC-035 adds the contact to Partner Contacts). */
export async function assignPartnerContact(id: string, contactId?: string): Promise<void> {
  if (contactId) await webApi.update('opportunities', id, { 'msa_partneroppid@odata.bind': `/contacts(${contactId})` })
  else await webApi.clearLookup('opportunities', id, 'msa_partneroppid')
}

/** A-11 Share / unshare with own partner contacts (adx_internal_collaboration). */
export const shareOpportunity = (id: string, contactId: string) => webApi.associate('opportunities', id, 'adx_internal_collaboration', 'contacts', contactId)
export const unshareOpportunity = (id: string, contactId: string) => webApi.disassociate('opportunities', id, 'adx_internal_collaboration', contactId)

/** L-021 customer contacts (adx_partner_collaboration). */
export const linkCustomerContact = (id: string, contactId: string) => webApi.associate('opportunities', id, 'adx_partner_collaboration', 'contacts', contactId)
export const unlinkCustomerContact = (id: string, contactId: string) => webApi.disassociate('opportunities', id, 'adx_partner_collaboration', contactId)

/** L-019 write-in product (the environment has no price lists; existing products are write-in too). */
export function addProduct(opportunityId: string, p: Omit<OpportunityProduct, 'id'>): Promise<string> {
  return webApi.create('opportunityproducts', {
    'opportunityid@odata.bind': `/opportunities(${opportunityId})`,
    isproductoverridden: true,
    productdescription: p.product,
    quantity: p.quantity,
    ispriceoverridden: true,
    priceperunit: p.pricePerUnit,
  })
}
export const removeProduct = (productLineId: string) => webApi.remove('opportunityproducts', productLineId)

/** A-09 Register / A-08 Extend (REQ-ACT-15/16): C-PROC-050/006/007 set name, partner and close the old request. */
export function registerDeal(opportunityId: string, contactId: string, input: { reason?: string; renewalReason?: string }): Promise<string> {
  return webApi.create(
    'adx_dealregistrationrequests',
    clean({
      adx_reasonforregistering: input.reason,
      adx_renewalreason: input.renewalReason,
      adx_submissiondate: new Date().toISOString().slice(0, 10),
      'adx_OpportunityId@odata.bind': `/opportunities(${opportunityId})`,
      'adx_PartnerContact@odata.bind': `/contacts(${contactId})`,
    }),
  )
}

/** A-02…A-07 through the opportunity-action server logic (re-checks role, scope, state and collaboration server-side). */
export type OpportunityAction = 'accept' | 'decline' | 'return' | 'win' | 'lose' | 'reopen'
export function runOpportunityAction(action: OpportunityAction, opportunityId: string): Promise<{ status: string; message?: string }> {
  return serverLogicPost('opportunity-action', { action, opportunityid: opportunityId })
}

/* ---------------------------------- Notes --------------------------------- */

const REGARDING_NAV = {
  opportunity: 'regardingobjectid_opportunity_adx_portalcomment',
  contact: 'regardingobjectid_contact_adx_portalcomment',
  account: 'regardingobjectid_account_adx_portalcomment',
} as const
const REGARDING_SET = { opportunity: 'opportunities', contact: 'contacts', account: 'accounts' } as const

/** A-13 Add Comment (REQ-ACT-20). */
export function addComment(regardingType: keyof typeof REGARDING_NAV, regardingId: string, text: string): Promise<string> {
  return webApi.create('adx_portalcomments', {
    description: text,
    adx_portalcommentdirectioncode: 1,
    [`${REGARDING_NAV[regardingType]}@odata.bind`]: `/${REGARDING_SET[regardingType]}(${regardingId})`,
  })
}

/* -------------------------------- Accounts -------------------------------- */

/**
 * 11.3.15 / P-008 through customer-account-create: classification and managing partner aren't Web API fields;
 * adx_createdbyportalcontactid lets C-PROC-004 set the managing partner.
 */
export async function createCustomerAccount(a: Partial<Account>, _meContactId: string, accountNumber?: string): Promise<string> {
  const fields = { ...accountPayload(a), ...(accountNumber ? { accountnumber: accountNumber } : {}) }
  const res = await serverLogicPost<{ status: string; id: string }>('customer-account-create', { fields })
  return res.id
}
export const updateAccount = (id: string, a: Partial<Account>) => webApi.update('accounts', id, accountPayload(a))
export const setAccountActive = (id: string, active: boolean) =>
  webApi.update('accounts', id, active ? { statecode: 0, statuscode: 1 } : { statecode: 1, statuscode: 2 })

/* -------------------------------- Contacts -------------------------------- */

/**
 * 11.3.16 customer contact / 11.3.18 partner contact. parentcustomerid isn't a Web API field, so contact-actions
 * creates the contact after checking the caller may add contacts to that account.
 */
export async function createContact(c: Partial<Contact>, parentAccountId: string, _meContactId: string): Promise<string> {
  const res = await serverLogicPost<{ status: string; id: string }>('contact-actions', { action: 'create', fields: contactPayload(c), parentAccountId })
  return res.id
}
/** Contact details only (Web API); the account can't change here – see updateCustomerContact. */
export function updateContact(id: string, c: Partial<Contact>): Promise<void> {
  return webApi.update('contacts', id, contactPayload(c))
}
/** P-012 customer contact, including a move to another managed customer account (validated by contact-actions). */
export async function updateCustomerContact(id: string, c: Partial<Contact>): Promise<void> {
  if (!c.parentAccountId) return updateContact(id, c)
  await serverLogicPost('contact-actions', { action: 'update', contactid: id, fields: contactPayload(c), parentAccountId: c.parentAccountId })
}
export const setContactActive = (id: string, active: boolean) =>
  webApi.update('contacts', id, active ? { statecode: 0, statuscode: 1 } : { statecode: 1, statuscode: 2 })

/** 11.3.20 Manage Role: contact-actions allows it for a Partner Admin of the same partner only; the sync flow updates web roles. */
export async function setPartnerRole(id: string, role?: PartnerContactRole): Promise<void> {
  await serverLogicPost('contact-actions', { action: 'setRole', contactid: id, role: role ? PARTNER_ROLE_VALUE[role] : null })
}

/** 11.3.19 Send Invitation through "PRM – Send invitation" (runs C-PROC-025 after the scope check). */
export function sendInvitation(contactId: string): Promise<{ message?: string; invitationcode?: string }> {
  return cloudFlow(FLOW_IDS.sendInvitation, { contactid: contactId })
}

/** 11.3.21 partner application: one PATCH of the own contact; C-PROC-021 creates the account and sets Submitted. */
export function submitApplication(
  meContactId: string,
  app: {
    organizationName: string
    website?: string
    numberOfEmployees?: string
    competencies?: string
    targetMarket?: string
    technologies?: string
    geographies: string[]
  },
): Promise<void> {
  const flags = Object.fromEntries([...new Set(Object.values(GEO_FLAGS))].map(f => [f, false])) as Record<string, boolean>
  for (const g of app.geographies) if (GEO_FLAGS[g]) flags[GEO_FLAGS[g]] = true
  const employees = Number(app.numberOfEmployees)
  return webApi.update('contacts', meContactId, {
    adx_organizationname: app.organizationName.trim(),
    websiteurl: app.website?.trim() || null,
    adx_partnernumberofemployees: Number.isFinite(employees) && app.numberOfEmployees ? employees : null,
    adx_competencies: app.competencies?.trim() || null,
    adx_partner_targetmarket: app.targetMarket?.trim() || null,
    adx_partner_technologies: app.technologies?.trim() || null,
    ...flags,
    adx_partner_applicationsubmitted: true,
  })
}
