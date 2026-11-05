// Maps Dataverse rows (Web API or Server Logic payloads) to the SPA's domain types, and back for writes.
import type {
  Account,
  ApplicationStatus,
  Comment,
  Contact,
  DealRegistration,
  DealRegistrationStatus,
  Invitation,
  Opportunity,
  OpportunityProduct,
  OpportunityStatus,
  PartnerContactRole,
  PurchaseTimeframe,
} from '../data/types'
import { PURCHASE_TIMEFRAMES } from '../data/types'

export type Row = Record<string, unknown>

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)
const num = (v: unknown) => (typeof v === 'number' ? v : undefined)
const day = (v: unknown) => (typeof v === 'string' && v ? v.slice(0, 10) : undefined)
const lookup = (row: Row, attr: string) => str(row[`_${attr}_value`])
const nested = (row: Row, nav: string) => (row[nav] && typeof row[nav] === 'object' ? (row[nav] as Row) : undefined)
const list = (v: unknown) => (Array.isArray(v) ? (v as Row[]) : [])

/* -------------------------------- Choices -------------------------------- */

export const OPP_STATUS: Record<number, OpportunityStatus> = {
  1: 'In Progress',
  2: 'On Hold',
  200000: 'In Progress',
  100000001: 'Delivered',
  100000003: 'Accepted',
  100000006: 'Declined',
  756150000: 'Returned',
  100000007: 'Expired',
  3: 'Won',
  100000004: 'Purchased',
  // Close as lost uses Canceled (4); Out-Sold (5) is back-office only. Both are "Lost" on the site.
  4: 'Lost',
  5: 'Lost',
}

export const REG_STATUS: Record<number, DealRegistrationStatus> = {
  100000000: 'New',
  100000001: 'Under Review',
  100000002: 'Approved',
  100000007: 'Declined',
  100000008: 'Expired',
  100000010: 'Expiring',
  100000006: 'Closed',
}

export const PARTNER_ROLE_VALUE: Record<PartnerContactRole, number> = {
  'Partner Admin': 756150000,
  'Partner Manager': 756150001,
  'Partner Seller': 756150002,
}
const PARTNER_ROLE: Record<number, PartnerContactRole> = Object.fromEntries(Object.entries(PARTNER_ROLE_VALUE).map(([k, v]) => [v, k as PartnerContactRole]))

const APPLICATION_STATUS: Record<number, ApplicationStatus> = { 1: 'Submitted', 2: 'Under Review', 3: 'Approved', 4: 'Rejected' }

const INVITATION_STATUS: Record<number, Invitation['status']> = { 1: 'New', 756150000: 'Sent', 756150001: 'Redeemed' }

export const timeframeValue = (t: PurchaseTimeframe) => PURCHASE_TIMEFRAMES.indexOf(t)

/** Dataverse geography flags ↔ prototype labels ("Europe, Middle East, Africa" is one flag). */
export const GEO_FLAGS: Record<string, string> = {
  'Asia/Pacific': 'adx_geo_apac',
  Australia: 'adx_geo_australia',
  'North America': 'adx_geo_northamerica',
  Europe: 'adx_geo_emea',
  'Middle East': 'adx_geo_emea',
  Africa: 'adx_geo_emea',
  'South America': 'adx_geo_southamerica',
}

/* -------------------------------- Mappers -------------------------------- */

function address(row: Row): Account['address'] {
  return {
    line1: str(row.address1_line1),
    line2: str(row.address1_line2),
    line3: str(row.address1_line3),
    city: str(row.address1_city),
    state: str(row.address1_stateorprovince),
    postalCode: str(row.address1_postalcode),
    country: str(row.address1_country),
  }
}

export function toAccount(row: Row): Account {
  return {
    id: String(row.accountid),
    name: str(row.name) ?? '',
    accountNumber: str(row.accountnumber),
    phone: str(row.telephone1),
    email: str(row.emailaddress1),
    fax: str(row.fax),
    website: str(row.websiteurl),
    description: str(row.description),
    address: address(row),
    primaryContactId: lookup(row, 'primarycontactid'),
    managingPartnerId: lookup(row, 'msa_managingpartnerid'),
    classification: row.accountclassificationcode === 100000000 ? 'Partner' : 'Customer',
    active: row.statecode === undefined || row.statecode === 0,
    createdOn: day(row.createdon) ?? '',
  }
}

/** Lightweight account from a lookup expansion ({ accountid, name }). */
export function toAccountRef(row: Row, classification: Account['classification'] = 'Customer'): Account {
  return { id: String(row.accountid), name: str(row.name) ?? '', address: {}, classification, active: true, createdOn: '' }
}

export function toContact(row: Row): Contact {
  const geographies = Object.entries(GEO_FLAGS)
    .filter(([, flag]) => row[flag] === true)
    .map(([label]) => label)
  const appStatus = num(row.adx_partner_applicationstatus)
  return {
    id: String(row.contactid),
    firstName: str(row.firstname) ?? '',
    lastName: str(row.lastname) ?? '',
    jobTitle: str(row.jobtitle),
    email: str(row.emailaddress1),
    phone: str(row.telephone1),
    mobile: str(row.mobilephone),
    parentAccountId: lookup(row, 'parentcustomerid'),
    managingPartnerId: lookup(row, 'msa_managingpartnerid'),
    address: address(row),
    partnerRole: PARTNER_ROLE[num(row.adx_partnercontactrole) ?? -1],
    active: row.statecode === undefined || row.statecode === 0,
    application:
      appStatus && APPLICATION_STATUS[appStatus]
        ? {
            status: APPLICATION_STATUS[appStatus],
            submittedOn: day(row.adx_partner_applicationdate) ?? '',
            organizationName: str(row.adx_organizationname) ?? '',
            website: str(row.websiteurl),
            numberOfEmployees: num(row.adx_partnernumberofemployees)?.toString(),
            competencies: str(row.adx_competencies),
            targetMarket: str(row.adx_partner_targetmarket),
            technologies: str(row.adx_partner_technologies),
            geographies,
          }
        : undefined,
    preferences:
      row.donotemail === undefined
        ? undefined
        : { email: row.donotemail !== true, phone: row.donotphone !== true, fax: row.donotfax !== true, mail: row.donotpostalmail !== true },
    createdOn: day(row.createdon) ?? '',
  }
}

/** Lightweight contact from a lookup expansion ({ contactid, firstname, lastname, … }). */
export function toContactRef(row: Row): Contact {
  return toContact(row)
}

export function toOpportunity(row: Row): Opportunity {
  const customer = nested(row, 'customerid_account')
  const territory = nested(row, 'adx_TerritoryId') ?? nested(row, 'adx_territoryid')
  const statuscode = num(row.statuscode) ?? 1
  const statecode = num(row.statecode) ?? 0
  const status: OpportunityStatus = statecode === 2 ? 'Lost' : (OPP_STATUS[statuscode] ?? 'In Progress')
  const timeframe = num(row.purchasetimeframe)
  return {
    id: String(row.opportunityid),
    referenceCode: str(row.adx_referencecode) ?? '',
    topic: str(row.name) ?? '',
    customerId: lookup(row, 'customerid') ?? (customer ? String(customer.accountid) : ''),
    estRevenue: num(row.estimatedvalue) ?? 0,
    estCloseDate: day(row.estimatedclosedate) ?? '',
    purchaseTimeframe: timeframe !== undefined && PURCHASE_TIMEFRAMES[timeframe] ? PURCHASE_TIMEFRAMES[timeframe] : 'Unknown',
    territory: (territory && str(territory.name)) ?? (str(row['_adx_territoryid_value@OData.Community.Display.V1.FormattedValue']) ?? ''),
    description: str(row.description),
    customerNeed: str(row.customerneed),
    partnerId: lookup(row, 'msa_partnerid'),
    partnerContactId: lookup(row, 'msa_partneroppid'),
    partnerCreated: row.adx_partnercreated === true,
    collaboration: row.adx_partnercollaboration === true,
    collaboratingPartnerIds: list(row.adx_opportunity_account).map(a => String(a.accountid)),
    sharedContactIds: list(row.adx_internal_collaboration).map(c => String(c.contactid)),
    status,
    expiryDate: day(row.adx_expirydate),
    acceptedDate: day(row.adx_accepteddate),
    actualRevenue: num(row.actualvalue),
    actualCloseDate: day(row.actualclosedate),
    customerContactIds: list(row.adx_partner_collaboration).map(c => String(c.contactid)),
    products: [],
    createdOn: day(row.createdon) ?? '',
    modifiedOn: day(row.modifiedon) ?? '',
  }
}

export function toProduct(row: Row): OpportunityProduct {
  const product = nested(row, 'productid')
  const uom = nested(row, 'uomid')
  return {
    id: String(row.opportunityproductid),
    product: str(row.productdescription) ?? (product ? (str(product.name) ?? '') : ''),
    writeIn: row.isproductoverridden === true,
    unit: (uom && str(uom.name)) ?? 'Each',
    quantity: num(row.quantity) ?? 0,
    pricePerUnit: num(row.priceperunit) ?? 0,
  }
}

export function toRegistration(row: Row): DealRegistration {
  return {
    id: String(row.adx_dealregistrationrequestid),
    name: str(row.adx_name) ?? '',
    opportunityId: lookup(row, 'adx_opportunityid') ?? '',
    partnerId: lookup(row, 'adx_partner') ?? '',
    partnerContactId: lookup(row, 'adx_partnercontact'),
    reasonForRegistering: str(row.adx_reasonforregistering),
    renewalReason: str(row.adx_renewalreason),
    submissionDate: day(row.adx_submissiondate) ?? day(row.createdon) ?? '',
    startDate: day(row.adx_startdate),
    expirationDate: day(row.adx_expirationdate),
    status: num(row.statecode) === 1 ? 'Closed' : (REG_STATUS[num(row.statuscode) ?? 100000000] ?? 'New'),
  }
}

export function toComment(row: Row, regardingType: Comment['regardingType'], regardingId: string): Comment {
  return {
    id: String(row.activityid),
    regardingType,
    regardingId,
    text: str(row.description) ?? '',
    authorName: str(row['_createdby_value@OData.Community.Display.V1.FormattedValue']) ?? 'Partner portal user',
    createdOn: str(row.createdon) ?? '',
  }
}

export function toInvitation(row: Row): Invitation {
  return {
    id: String(row.adx_invitationid),
    contactId: lookup(row, 'adx_invitecontact') ?? '',
    code: str(row.adx_invitationcode) ?? '',
    status: INVITATION_STATUS[num(row.statuscode) ?? 1] ?? 'New',
    sentOn: day(row.createdon) ?? '',
  }
}

/* ------------------------------ Write payloads ----------------------------- */

const orNull = (v?: string) => (v && v.trim() ? v.trim() : null)

export function addressPayload(a: Account['address']): Row {
  return {
    address1_line1: orNull(a.line1),
    address1_line2: orNull(a.line2),
    address1_line3: orNull(a.line3),
    address1_city: orNull(a.city),
    address1_stateorprovince: orNull(a.state),
    address1_postalcode: orNull(a.postalCode),
    address1_country: orNull(a.country),
  }
}

export function accountPayload(a: Partial<Account>): Row {
  const p: Row = {}
  if (a.name !== undefined) p.name = a.name.trim()
  if (a.phone !== undefined) p.telephone1 = orNull(a.phone)
  if (a.email !== undefined) p.emailaddress1 = orNull(a.email)
  if (a.fax !== undefined) p.fax = orNull(a.fax)
  if (a.website !== undefined) p.websiteurl = orNull(a.website)
  if (a.description !== undefined) p.description = orNull(a.description)
  if (a.address !== undefined) Object.assign(p, addressPayload(a.address))
  return p
}

export function contactPayload(c: Partial<Contact>): Row {
  const p: Row = {}
  if (c.firstName !== undefined) p.firstname = orNull(c.firstName)
  if (c.lastName !== undefined) p.lastname = c.lastName.trim()
  if (c.jobTitle !== undefined) p.jobtitle = orNull(c.jobTitle)
  if (c.email !== undefined) p.emailaddress1 = orNull(c.email)
  if (c.phone !== undefined) p.telephone1 = orNull(c.phone)
  if (c.mobile !== undefined) p.mobilephone = orNull(c.mobile)
  if (c.address !== undefined) Object.assign(p, addressPayload(c.address))
  if (c.preferences !== undefined) {
    p.donotemail = !c.preferences.email
    p.donotphone = !c.preferences.phone
    p.donotfax = !c.preferences.fax
    p.donotpostalmail = !c.preferences.mail
  }
  return p
}
