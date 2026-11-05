import type { Account, Booking, Contact, Database, Opportunity, WorkOrder } from './types'

/** The signed-in partner organisation for every partner persona (Partner A in the audit). */
export const PARTNER_A = 'acc-northwind'
/** A second partner used to prove cross-partner isolation and collaboration (Partner B). */
export const PARTNER_B = 'acc-fabrikam'
/** A rival installer: its technicians and work orders must never be visible to Fabrikam (Partner C). */
export const PARTNER_C = 'acc-adatum'

const addr = (line1: string, city: string, state: string, postalCode: string, country = 'Canada') => ({
  line1,
  city,
  state,
  postalCode,
  country,
})

const customer = (
  id: string,
  name: string,
  phone: string,
  city: string,
  state: string,
  primaryContactId: string,
  managingPartnerId = PARTNER_A,
  extra: Partial<Account> = {},
): Account => ({
  id,
  name,
  accountNumber: `CUST-${id.slice(-3).toUpperCase()}`,
  phone,
  email: `info@${name.toLowerCase().replace(/[^a-z]+/g, '')}.example.com`,
  website: `https://www.${name.toLowerCase().replace(/[^a-z]+/g, '')}.example.com`,
  address: addr(`${100 + name.length * 7} King Street`, city, state, 'M5H 1J9'),
  primaryContactId,
  managingPartnerId,
  classification: 'Customer',
  active: true,
  createdOn: '2026-03-04',
  ...extra,
})

const person = (
  id: string,
  firstName: string,
  lastName: string,
  jobTitle: string,
  parentAccountId: string | undefined,
  extra: Partial<Contact> = {},
): Contact => ({
  id,
  firstName,
  lastName,
  jobTitle,
  email: `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, '') + '@example.com',
  phone: `555-01${(firstName.length * 7 + lastName.length) % 90 + 10}`,
  parentAccountId,
  managingPartnerId: PARTNER_A,
  address: {},
  active: true,
  createdOn: '2026-04-11',
  preferences: { email: true, phone: true, fax: false, mail: false },
  ...extra,
})

const accounts: Account[] = [
  {
    id: PARTNER_A,
    name: 'Northwind Partners',
    accountNumber: 'PRT-1001',
    phone: '555-0100',
    email: 'alliances@northwindpartners.example.com',
    website: 'https://www.northwindpartners.example.com',
    description: 'Gold-tier solutions partner focused on cloud migration, data and AI for mid-market customers across Canada.',
    address: addr('200 Bay Street, Suite 1800', 'Toronto', 'ON', 'M5J 2J2'),
    primaryContactId: 'c-avery',
    classification: 'Partner',
    active: true,
    createdOn: '2025-11-02',
  },
  {
    id: PARTNER_B,
    name: 'Fabrikam Building Systems',
    accountNumber: 'PRT-1002',
    phone: '555-0200',
    email: 'partners@fabrikam.example.com',
    address: addr('1 Place Ville Marie', 'Montréal', 'QC', 'H3B 2B6'),
    primaryContactId: 'c-morgan',
    classification: 'Partner',
    active: true,
    createdOn: '2025-12-15',
  },
  {
    id: PARTNER_C,
    name: 'Adatum Mechanical',
    accountNumber: 'PRT-1003',
    phone: '555-0300',
    email: 'service@adatum.example.com',
    address: addr('88 Industrial Parkway', 'Mississauga', 'ON', 'L5T 2H6'),
    classification: 'Partner',
    active: true,
    createdOn: '2026-01-20',
  },
  customer('acc-adventure', 'Adventure Works Cycles', '555-0111', 'Toronto', 'ON', 'c-adv-1'),
  customer('acc-alpine', 'Alpine Ski House', '555-0112', 'Whistler', 'BC', 'c-alp-1'),
  customer('acc-coho', 'Coho Winery', '555-0113', 'Kelowna', 'BC', 'c-coho-1'),
  customer('acc-litware', 'Litware Inc.', '555-0114', 'Ottawa', 'ON', 'c-lit-1'),
  customer('acc-tailspin', 'Tailspin Toys', '555-0115', 'Calgary', 'AB', 'c-tail-1'),
  customer('acc-wwi', 'Wide World Importers', '555-0116', 'Vancouver', 'BC', 'c-wwi-1'),
  customer('acc-contosopharma', 'Contoso Pharmaceuticals', '555-0117', 'Mississauga', 'ON', 'c-cph-1'),
  customer('acc-proseware', 'Proseware, Inc.', '555-0118', 'Waterloo', 'ON', 'c-pro-1'),
  customer('acc-trey', 'Trey Research', '555-0119', 'Halifax', 'NS', 'c-trey-1'),
  customer('acc-woodgrove', 'Woodgrove Bank', '555-0120', 'Toronto', 'ON', 'c-wood-1'),
  customer('acc-citypower', 'City Power & Light', '555-0121', 'Edmonton', 'AB', 'c-cpl-1'),
  customer('acc-graphic', 'Graphic Design Institute', '555-0122', 'Winnipeg', 'MB', 'c-gdi-1', PARTNER_A, { active: false }),
  customer('acc-blueyonder', 'Blue Yonder Airlines', '555-0221', 'Montréal', 'QC', 'c-by-1', PARTNER_B),
  customer('acc-lucerne', 'Lucerne Publishing', '555-0222', 'Québec City', 'QC', 'c-luc-1', PARTNER_B),
]

const contacts: Contact[] = [
  // Partner A contacts (portal users)
  person('c-avery', 'Avery', 'Chen', 'Alliance Director', PARTNER_A, { partnerRole: 'Partner Admin', phone: '555-0101' }),
  person('c-jordan', 'Jordan', 'Patel', 'Sales Manager', PARTNER_A, { partnerRole: 'Partner Manager', phone: '555-0102' }),
  person('c-sam', 'Sam', 'Rivera', 'Account Executive', PARTNER_A, { partnerRole: 'Partner Seller', phone: '555-0103' }),
  person('c-riley', 'Riley', 'Okafor', 'Solutions Consultant', PARTNER_A, { partnerRole: 'Partner Seller', phone: '555-0104' }),
  person('c-casey', 'Casey', 'Nguyen', 'Inside Sales Representative', PARTNER_A, { phone: '555-0105' }),
  person('c-drew', 'Drew', 'Lindqvist', 'Former Account Executive', PARTNER_A, { partnerRole: 'Partner Seller', active: false }),
  // Partner B
  person('c-morgan', 'Morgan', 'Dubois', 'Partner Lead', PARTNER_B, { partnerRole: 'Partner Admin', managingPartnerId: PARTNER_B }),
  // Partner B field technicians (Partner Technician web role: work orders only)
  person('c-kenji', 'Kenji', 'Tanaka', 'Senior HVAC Technician', PARTNER_B, { fieldTechnician: true, managingPartnerId: PARTNER_B, phone: '555-0232' }),
  // Rival installer technician (Partner C)
  person('c-dmitri', 'Dmitri', 'Volkov', 'Service Technician', PARTNER_C, { fieldTechnician: true, managingPartnerId: PARTNER_C, phone: '555-0331' }),
  // Prospective partner (Non-Partner Portal User)
  person('c-taylor', 'Taylor', 'Brooks', 'Founder', undefined, { managingPartnerId: undefined }),
  // Customer contacts managed by Partner A
  person('c-adv-1', 'Linda', 'Mitchell', 'IT Director', 'acc-adventure'),
  person('c-adv-2', 'Marcus', 'Webb', 'Procurement Lead', 'acc-adventure'),
  person('c-alp-1', 'Sofia', 'Marchetti', 'Operations Manager', 'acc-alpine'),
  person('c-coho-1', 'Ethan', 'Brooks', 'Owner', 'acc-coho'),
  person('c-lit-1', 'Priya', 'Raman', 'CISO', 'acc-litware'),
  person('c-tail-1', 'Noah', 'Fischer', 'VP Retail', 'acc-tailspin'),
  person('c-wwi-1', 'Grace', 'Liu', 'Logistics Director', 'acc-wwi'),
  person('c-cph-1', 'Oliver', 'Grant', 'Head of Digital', 'acc-contosopharma'),
  person('c-pro-1', 'Hannah', 'Kowalski', 'Data Platform Lead', 'acc-proseware'),
  person('c-trey-1', 'Liam', 'Moreau', 'CTO', 'acc-trey'),
  person('c-wood-1', 'Isabella', 'Santos', 'Contact Center Director', 'acc-woodgrove'),
  person('c-cpl-1', 'Benjamin', 'Ward', 'Field Operations Manager', 'acc-citypower'),
  person('c-gdi-1', 'Chloe', 'Bennett', 'Registrar', 'acc-graphic'),
  // Partner B customer contacts
  person('c-by-1', 'Lucas', 'Tremblay', 'Crew Systems Manager', 'acc-blueyonder', { managingPartnerId: PARTNER_B }),
  person('c-luc-1', 'Amélie', 'Roy', 'Editorial Director', 'acc-lucerne', { managingPartnerId: PARTNER_B }),
]

const opp = (o: Partial<Opportunity> & Pick<Opportunity, 'id' | 'topic' | 'customerId' | 'estRevenue' | 'estCloseDate' | 'status'>): Opportunity => ({
  referenceCode: `OPP-${o.id.replace(/\D/g, '').padStart(4, '0')}`,
  purchaseTimeframe: 'This Quarter',
  territory: 'Canada East',
  partnerId: PARTNER_A,
  partnerCreated: false,
  collaboration: false,
  collaboratingPartnerIds: [],
  customerContactIds: [],
  products: [],
  createdOn: '2026-08-12',
  modifiedOn: '2026-10-10',
  ...o,
})

const opportunities: Opportunity[] = [
  opp({
    id: 'opp-2401', topic: 'Fleet telematics rollout', customerId: 'acc-wwi', estRevenue: 48000, estCloseDate: '2026-12-18',
    status: 'Delivered', territory: 'Canada West', expiryDate: '2026-10-25', purchaseTimeframe: 'Next Quarter',
    description: 'Wide World Importers wants real-time telematics across 240 delivery vehicles with route optimisation.',
    customerNeed: 'Reduce fuel spend and late deliveries by 15%.', customerContactIds: ['c-wwi-1'],
  }),
  opp({
    id: 'opp-2402', topic: 'Retail POS modernization', customerId: 'acc-tailspin', estRevenue: 32500, estCloseDate: '2027-01-30',
    status: 'Delivered', territory: 'Canada West', expiryDate: '2026-10-21', purchaseTimeframe: 'This Year',
    description: 'Replace legacy point-of-sale in 38 stores with a cloud POS integrated with inventory.', customerContactIds: ['c-tail-1'],
  }),
  opp({
    id: 'opp-2403', topic: 'Data platform assessment', customerId: 'acc-proseware', estRevenue: 18000, estCloseDate: '2026-11-28',
    status: 'Delivered', territory: 'Canada East', expiryDate: '2026-10-30', purchaseTimeframe: 'Immediate',
    description: 'Two-week assessment of the current warehouse with a modernisation roadmap.', customerContactIds: ['c-pro-1'],
  }),
  opp({
    id: 'opp-2404', topic: 'Cloud migration – phase 1', customerId: 'acc-adventure', estRevenue: 25000, estCloseDate: '2026-12-15',
    status: 'Accepted', partnerContactId: 'c-sam', acceptedDate: '2026-09-02', purchaseTimeframe: 'Immediate',
    description: 'Lift-and-shift of 40 line-of-business VMs to the cloud with landing-zone setup.',
    customerNeed: 'Exit the co-located data centre before the lease ends in Q1.', customerContactIds: ['c-adv-1', 'c-adv-2'],
    products: [
      { id: 'op-1', product: 'Cloud Migration Services', writeIn: false, unit: 'Hour', quantity: 120, pricePerUnit: 150 },
      { id: 'op-2', product: 'Landing Zone Accelerator', writeIn: true, unit: 'Each', quantity: 1, pricePerUnit: 7000 },
    ],
  }),
  opp({
    id: 'opp-2405', topic: 'Dynamics 365 Sales rollout', customerId: 'acc-alpine', estRevenue: 30000, estCloseDate: '2027-02-12',
    status: 'Accepted', partnerContactId: 'c-jordan', acceptedDate: '2026-09-18', territory: 'Canada West',
    description: 'CRM rollout for 60 sellers including Outlook integration and pipeline dashboards.', customerContactIds: ['c-alp-1'],
  }),
  opp({
    id: 'opp-2406', topic: 'Analytics dashboards', customerId: 'acc-coho', estRevenue: 20000, estCloseDate: '2026-12-31',
    status: 'In Progress', partnerCreated: true, partnerContactId: 'c-avery', territory: 'Canada West', purchaseTimeframe: 'This Quarter',
    description: 'Executive and vineyard-operations dashboards built on the existing ERP data.', customerContactIds: ['c-coho-1'],
  }),
  opp({
    id: 'opp-2407', topic: 'Security hardening program', customerId: 'acc-litware', estRevenue: 42000, estCloseDate: '2027-01-15',
    status: 'In Progress', partnerCreated: true, partnerContactId: 'c-sam', purchaseTimeframe: 'Next Quarter',
    description: 'Zero-trust assessment, identity hardening and SOC onboarding.', customerContactIds: ['c-lit-1'],
  }),
  opp({
    id: 'opp-2408', topic: 'Contact center AI', customerId: 'acc-woodgrove', estRevenue: 64000, estCloseDate: '2026-11-20',
    status: 'Accepted', partnerContactId: 'c-jordan', acceptedDate: '2026-06-03', partnerCreated: true,
    description: 'Conversational AI and agent assist for 300 contact-centre agents.', customerContactIds: ['c-wood-1'],
  }),
  opp({
    id: 'opp-2409', topic: 'Field service mobile app', customerId: 'acc-citypower', estRevenue: 55000, estCloseDate: '2026-09-30',
    status: 'Won', partnerContactId: 'c-sam', acceptedDate: '2026-05-14', territory: 'Canada West',
    description: 'Mobile work orders and offline inspections for 120 field technicians.', customerContactIds: ['c-cpl-1'],
  }),
  opp({
    id: 'opp-2410', topic: 'ERP integration', customerId: 'acc-trey', estRevenue: 15000, estCloseDate: '2026-08-29',
    status: 'Lost', partnerContactId: 'c-riley', acceptedDate: '2026-04-22',
    description: 'Integration between the LIMS and ERP finance modules.', customerContactIds: ['c-trey-1'],
  }),
  opp({
    id: 'opp-2411', topic: 'Kiosk refresh', customerId: 'acc-contosopharma', estRevenue: 12000, estCloseDate: '2026-10-31',
    status: 'Declined', description: 'Declined by Northwind Partners on 09/12/2026.',
  }),
  // Partner B owns this one but shares it with Partner A as a collaborative opportunity.
  opp({
    id: 'opp-2501', topic: 'Crew scheduling optimisation', customerId: 'acc-blueyonder', estRevenue: 88000, estCloseDate: '2027-03-31',
    status: 'Accepted', partnerId: PARTNER_B, partnerContactId: 'c-morgan', collaboration: true,
    collaboratingPartnerIds: [PARTNER_A], acceptedDate: '2026-08-30', territory: 'EMEA',
    description: 'Joint delivery with Northwind Partners: optimisation engine (Fabrikam) and data platform (Northwind).',
    customerContactIds: ['c-by-1'],
  }),
  // Partner B only — must never be visible to Partner A users.
  opp({
    id: 'opp-2502', topic: 'Editorial workflow automation', customerId: 'acc-lucerne', estRevenue: 27000, estCloseDate: '2026-12-05',
    status: 'Accepted', partnerId: PARTNER_B, partnerContactId: 'c-morgan', acceptedDate: '2026-09-09',
  }),
  opp({
    id: 'opp-2503', topic: 'Loyalty platform pilot', customerId: 'acc-blueyonder', estRevenue: 21000, estCloseDate: '2027-01-08',
    status: 'Delivered', partnerId: PARTNER_B, expiryDate: '2026-10-28',
  }),
]

/** Local time `days` from today at hh:mm, so the technician's "today" always has visits. */
function at(days: number, hours: number, minutes = 0) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

const wo = (w: Partial<WorkOrder> & Pick<WorkOrder, 'id' | 'number' | 'title' | 'customerName' | 'servicePartnerId'>): WorkOrder => ({
  address: {},
  priority: 'Normal',
  type: 'Zava Customer Visit',
  incidentType: 'Zava equipment assessment',
  systemStatus: 'Scheduled',
  timeline: [],
  createdOn: at(-2, 9),
  ...w,
})

function fieldService(): Pick<Database, 'workOrders' | 'bookings'> {
  const workOrders: WorkOrder[] = [
    wo({
      id: 'wo-204', number: 'WO-00123', title: 'High-temperature alarm on CU-204', customerName: 'Contoso Hotels',
      siteName: 'Contoso Hotels Flagship', address: addr('1 Harbourfront Way', 'Toronto', 'ON', 'M5J 2N1'),
      siteContact: { name: 'Priya B (Facilities Manager)', phone: '555-0410' },
      priority: '4-hour priority', incidentType: 'High-temperature alarm', caseNumber: 'CAS-01000', caseTitle: 'High-temperature alarm on CU-204',
      asset: { name: 'CU-204 – Flagship Cooling Unit', model: 'Zava HX-450 chiller', serialNumber: 'HX450-20419', location: 'Rooftop plant room' },
      instructions: 'Guest floors 12–18 are affected. Check in at the loading dock; the chief engineer has roof access.',
      servicePartnerId: PARTNER_B, createdOn: at(0, 7, 40),
      timeline: [
        { id: 'ev-204-1', at: at(0, 7, 40), text: 'Work order created from case CAS-01000', by: 'Zava Customer Service' },
        { id: 'ev-204-2', at: at(0, 8, 15), text: 'Visit moved forward after a same-day cancellation', by: 'Zava dispatch' },
      ],
    }),
    wo({
      id: 'wo-311', number: 'WO-00131', title: 'Quarterly maintenance – AHU-3', customerName: 'Alpine Ski House',
      siteName: 'Alpine Ski House Lodge', address: addr('12 Summit Road', 'Whistler', 'BC', 'V8E 0A1'),
      siteContact: { name: 'Sofia Marchetti', phone: '555-0420' }, type: 'Planned maintenance',
      asset: { name: 'AHU-3 – Lodge Air Handler', model: 'Zava AH-90', serialNumber: 'AH90-3301', location: 'Basement plant' },
      servicePartnerId: PARTNER_B,
      timeline: [{ id: 'ev-311-1', at: at(-2, 9), text: 'Assigned to Kenji Tanaka', by: 'Zava dispatch' }],
    }),
    wo({
      id: 'wo-288', number: 'WO-00128', title: 'Battery storage inspection – BSU-12', customerName: 'Woodgrove Bank',
      siteName: 'Woodgrove Data Centre', address: addr('400 Front Street West', 'Toronto', 'ON', 'M5V 3J1'),
      siteContact: { name: 'Isabella Santos', phone: '555-0430' }, type: 'Planned maintenance',
      asset: { name: 'BSU-12 – Battery Storage Unit', model: 'Zava PowerStack 500', serialNumber: 'PS500-1207', location: 'Level B2' },
      servicePartnerId: PARTNER_B,
      timeline: [],
    }),
    wo({
      id: 'wo-240', number: 'WO-00119', title: 'Heat pump noise – HP-07', customerName: 'Contoso Hotels',
      siteName: 'Contoso Hotels Airport', address: addr('6 Airport Road', 'Mississauga', 'ON', 'L4V 1E8'),
      incidentType: 'Unusual noise', systemStatus: 'Completed', servicePartnerId: PARTNER_B, createdOn: at(-3, 10),
      asset: { name: 'HP-07 – Lobby Heat Pump', model: 'Zava HP-30', serialNumber: 'HP30-0007', location: 'Lobby mezzanine' },
      diagnosis: { fault: 'Fan motor failure', findings: 'Worn fan bearing causing vibration noise.', partRequired: false, recordedOn: at(-1, 11), recordedBy: 'Former technician' },
      report: {
        workPerformed: 'Replaced fan bearing from van stock, balanced the fan and ran a 30-minute test.', outcome: 'Resolved',
        customerSummary: 'Noise resolved. A worn fan bearing was replaced and the unit tested normally.', submittedOn: at(-1, 12), submittedBy: 'Former technician',
      },
      timeline: [
        { id: 'ev-240-2', at: at(-1, 11), text: 'Diagnosis recorded: Fan motor failure', by: 'Former technician' },
        { id: 'ev-240-3', at: at(-1, 12), text: 'Service report submitted', by: 'Former technician' },
      ],
    }),
    wo({
      id: 'wo-901', number: 'WO-00140', title: 'Chiller restart – CU-11', customerName: 'Contoso Hotels',
      siteName: 'Contoso Hotels Downtown', address: addr('77 King Street West', 'Toronto', 'ON', 'M5K 1A1'),
      asset: { name: 'CU-11 – Downtown Cooling Unit', model: 'Zava HX-300 chiller', serialNumber: 'HX300-1101' },
      servicePartnerId: PARTNER_C,
      timeline: [{ id: 'ev-901-1', at: at(-1, 9), text: 'Assigned to Dmitri Volkov', by: 'Zava dispatch' }],
    }),
  ]
  const bookings: Booking[] = [
    { id: 'bk-311', workOrderId: 'wo-311', resourceContactId: 'c-kenji', resourceName: 'Kenji Tanaka', status: 'Scheduled', start: at(0, 13), end: at(0, 15), assignedOn: at(-2, 9) },
    { id: 'bk-901', workOrderId: 'wo-901', resourceContactId: 'c-dmitri', resourceName: 'Dmitri Volkov', status: 'Scheduled', start: at(0, 11), end: at(0, 13), assignedOn: at(-1, 9) },
  ]
  return { workOrders, bookings }
}

export function createSeed(): Database {
  return {
    ...fieldService(),
    accounts,
    contacts,
    opportunities,
    dealRegistrations: [
      {
        id: 'dr-1', name: 'Security hardening program – registration', opportunityId: 'opp-2407', partnerId: PARTNER_A,
        partnerContactId: 'c-sam', reasonForRegistering: 'Customer engaged via our security workshop; we own the architecture.',
        submissionDate: '2026-09-10', startDate: '2026-09-14', expirationDate: '2027-03-14', status: 'Approved',
      },
      {
        id: 'dr-2', name: 'Contact center AI – registration', opportunityId: 'opp-2408', partnerId: PARTNER_A,
        partnerContactId: 'c-jordan', reasonForRegistering: 'Sourced through existing Woodgrove relationship.',
        submissionDate: '2026-04-28', startDate: '2026-05-01', expirationDate: '2026-10-31', status: 'Expiring',
      },
      {
        id: 'dr-3', name: 'Field service mobile app – registration', opportunityId: 'opp-2409', partnerId: PARTNER_A,
        partnerContactId: 'c-sam', reasonForRegistering: 'Partner-sourced through utility vertical event.',
        submissionDate: '2026-03-02', startDate: '2026-03-05', expirationDate: '2026-09-05', status: 'Closed',
      },
    ],
    comments: [
      { id: 'cm-1', regardingType: 'opportunity', regardingId: 'opp-2404', text: 'Discovery workshop booked for 10/22. Linda confirmed the VM inventory export.', authorName: 'Sam Rivera', createdOn: '2026-10-09T15:30:00' },
      { id: 'cm-2', regardingType: 'opportunity', regardingId: 'opp-2404', text: 'Shared the migration estimate with procurement (Marcus).', authorName: 'Jordan Patel', createdOn: '2026-10-13T11:05:00' },
      { id: 'cm-3', regardingType: 'opportunity', regardingId: 'opp-2501', text: 'Fabrikam will lead the optimisation workstream; Northwind owns data ingestion.', authorName: 'Morgan Dubois', createdOn: '2026-09-04T09:12:00' },
      { id: 'cm-7', regardingType: 'contact', regardingId: 'c-riley', text: 'Riley moved to the solutions team; keep Partner Seller access.', authorName: 'Avery Chen', createdOn: '2026-09-30T12:00:00' },
    ],
    invitations: [
      { id: 'inv-1', contactId: 'c-riley', code: 'NWP-7Q4K-2M9X', status: 'Redeemed', sentOn: '2026-06-02' },
      { id: 'inv-2', contactId: 'c-casey', code: 'NWP-3T8H-6R1Z', status: 'Sent', sentOn: '2026-10-14' },
    ],
  }
}
