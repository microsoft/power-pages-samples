export type Role = 'anonymous' | 'non-partner' | 'partner-admin' | 'partner-manager' | 'partner-seller' | 'partner-technician'

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
  /** Holds the Partner Technician web role (Field Service work orders only; no sales access). */
  fieldTechnician?: boolean
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

/** Field Service booking status (bookingstatus.msdyn_fieldservicestatus). */
export type BookingStatus = 'Scheduled' | 'Traveling' | 'In Progress' | 'On Break' | 'Completed' | 'Canceled'

/** Work order system status (msdyn_workorder.msdyn_systemstatus). */
export type WorkOrderStatus = 'Unscheduled' | 'Scheduled' | 'In Progress' | 'Completed' | 'Posted' | 'Canceled'

export const WORK_ORDER_FAULTS = ['Compressor failure', 'Refrigerant leak', 'Controller fault', 'Fan motor failure', 'Sensor fault', 'No fault found'] as const

export const SERVICE_OUTCOMES = ['Resolved', 'Follow-up visit needed'] as const
export type ServiceOutcome = (typeof SERVICE_OUTCOMES)[number]

/** Technician diagnosis (msdyn_workorderincident). */
export interface WorkOrderDiagnosis {
  fault: string
  findings: string
  partRequired: boolean
  /** Replacement part name; older diagnoses hold free text. */
  part?: string
  /** Product chosen from the replacement-part catalog (product.productid / productnumber). */
  partId?: string
  partNumber?: string
  recordedOn: string
  recordedBy: string
}

/** A part technicians can order: an active product in the replacement-parts family. */
export interface ReplacementPart {
  id: string
  name: string
  number?: string
}

/** Draft purchase order raised from a service report that needs a replacement part (msdyn_purchaseorder). */
export interface WorkOrderPurchaseOrder {
  id: string
  number: string
  status: string
  part?: string
  createdOn: string
}

/** Submitted service report (msdyn_workordersummary + a "Service report" note). */
export interface ServiceReport {
  workPerformed: string
  outcome: ServiceOutcome
  customerSummary: string
  submittedOn: string
  submittedBy: string
}

export interface WorkOrderEvent {
  id: string
  at: string
  text: string
  by?: string
}

/**
 * Field Service work order as seen by a partner technician (msdyn_workorder). Customer, site and asset details are
 * a read-only projection, so technicians never need account or contact table access.
 */
export interface WorkOrder {
  id: string
  number: string
  title: string
  customerName: string
  siteName?: string
  address: Address
  siteContact?: { name: string; phone?: string }
  priority: string
  type: string
  incidentType: string
  caseNumber?: string
  caseTitle?: string
  asset?: { name: string; model?: string; serialNumber?: string; location?: string }
  instructions?: string
  /** Partner organization the visit is subcontracted to (cr798_servicepartnerid). */
  servicePartnerId?: string
  systemStatus: WorkOrderStatus
  diagnosis?: WorkOrderDiagnosis
  report?: ServiceReport
  purchaseOrder?: WorkOrderPurchaseOrder
  timeline: WorkOrderEvent[]
  createdOn: string
}

/** Resource booking for a work order (bookableresourcebooking). */
export interface Booking {
  id: string
  workOrderId: string
  /** Contact behind the bookable resource (bookableresource.contactid). */
  resourceContactId?: string
  resourceName: string
  status: BookingStatus
  start: string
  end: string
  arrivedOn?: string
  /** When the booking was created or last moved (drives "Recently assigned"). */
  assignedOn: string
}

export interface Database {
  accounts: Account[]
  contacts: Contact[]
  opportunities: Opportunity[]
  dealRegistrations: DealRegistration[]
  comments: Comment[]
  invitations: Invitation[]
  workOrders: WorkOrder[]
  bookings: Booking[]
}
