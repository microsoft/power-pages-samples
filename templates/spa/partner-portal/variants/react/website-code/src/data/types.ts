export type Role = 'anonymous' | 'non-partner' | 'partner-admin' | 'partner-manager' | 'partner-seller'

export type PartnerContactRole = 'Partner Admin' | 'Partner Manager' | 'Partner Seller'

export interface Address {
  line1?: string
  line2?: string
  line3?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}

export interface Account {
  id: string
  name: string
  accountNumber?: string
  phone?: string
  email?: string
  fax?: string
  website?: string
  description?: string
  address: Address
  primaryContactId?: string
  /** Partner account that manages this customer (msa_managingpartnerid). */
  managingPartnerId?: string
  classification: 'Customer' | 'Partner'
  active: boolean
  createdOn: string
}

export type ApplicationStatus = 'Submitted' | 'Under Review' | 'Approved' | 'Rejected'

export interface PartnerApplication {
  status: ApplicationStatus
  submittedOn: string
  organizationName: string
  website?: string
  numberOfEmployees?: string
  competencies?: string
  targetMarket?: string
  technologies?: string
  geographies: string[]
}

export interface Contact {
  id: string
  firstName: string
  lastName: string
  jobTitle?: string
  email?: string
  phone?: string
  mobile?: string
  parentAccountId?: string
  managingPartnerId?: string
  address: Address
  partnerRole?: PartnerContactRole
  active: boolean
  notes?: string
  application?: PartnerApplication
  preferences?: { email: boolean; phone: boolean; fax: boolean; mail: boolean }
  createdOn: string
}

export const OPPORTUNITY_STATUSES = [
  'In Progress',
  'On Hold',
  'Delivered',
  'Accepted',
  'Declined',
  'Returned',
  'Expired',
  'Won',
  'Lost',
  'Canceled',
  'Purchased',
] as const
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number]

export const PURCHASE_TIMEFRAMES = ['Immediate', 'This Quarter', 'Next Quarter', 'This Year', 'Unknown'] as const
export type PurchaseTimeframe = (typeof PURCHASE_TIMEFRAMES)[number]

export const RETURN_REASONS = [
  'No Interest',
  'No Response',
  'Purchase Timeframe > 12 months',
  'Purchased from Competitor',
  'Purchased from other Partner',
  'No Funding',
  'Bad Contact Info',
] as const

export const DECLINE_REASONS = [
  'Outside our territory',
  'Not a fit for our practice',
  'No capacity right now',
  'Customer already engaged with another partner',
  'Other',
] as const

export const LOSS_REASONS = ['Price', 'Lost to competitor', 'No budget', 'No decision', 'Other'] as const

export const TERRITORIES = ['Canada East', 'Canada West', 'US Northeast', 'US West', 'EMEA'] as const

export interface OpportunityProduct {
  id: string
  product: string
  writeIn: boolean
  unit: string
  quantity: number
  pricePerUnit: number
}

export interface Opportunity {
  id: string
  referenceCode: string
  topic: string
  customerId: string
  estRevenue: number
  estCloseDate: string
  purchaseTimeframe: PurchaseTimeframe
  territory: string
  description?: string
  customerNeed?: string
  /** Partner account the opportunity belongs to (msa_partnerid). */
  partnerId?: string
  /** Partner contact working the opportunity (msa_partneroppid). */
  partnerContactId?: string
  partnerCreated: boolean
  collaboration: boolean
  collaboratingPartnerIds: string[]
  /** Partner contacts the opportunity is shared with (adx_internal_collaboration – A-11 Share, C-TP-060). */
  sharedContactIds?: string[]
  status: OpportunityStatus
  expiryDate?: string
  acceptedDate?: string
  reasonForReturn?: string
  /** Why the partner declined a distributed opportunity (kept separate from description). */
  declineReason?: string
  declinedOn?: string
  /** Outcome data captured when the opportunity is closed. */
  lossReason?: string
  actualRevenue?: number
  actualCloseDate?: string
  customerContactIds: string[]
  products: OpportunityProduct[]
  createdOn: string
  modifiedOn: string
}

export type DealRegistrationStatus = 'New' | 'Under Review' | 'Approved' | 'Expiring' | 'Expired' | 'Closed' | 'Declined'

export interface DealRegistration {
  id: string
  name: string
  opportunityId: string
  partnerId: string
  partnerContactId?: string
  reasonForRegistering?: string
  renewalReason?: string
  submissionDate: string
  startDate?: string
  expirationDate?: string
  status: DealRegistrationStatus
}

export interface Comment {
  id: string
  regardingType: 'opportunity' | 'contact'
  regardingId: string
  text: string
  authorName: string
  createdOn: string
}

export interface Invitation {
  id: string
  contactId: string
  code: string
  status: 'New' | 'Sent' | 'Redeemed'
  sentOn: string
}

export interface Database {
  accounts: Account[]
  contacts: Contact[]
  opportunities: Opportunity[]
  dealRegistrations: DealRegistration[]
  comments: Comment[]
  invitations: Invitation[]
}
