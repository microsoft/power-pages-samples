import type { InvoiceStatus, Invoice, User } from '../types'
import type { POStatusLabel } from '../types/purchaseOrder'
import { getDevRole } from '../services/authService'
export type { InvoiceStatus, Attachment, StatusHistoryEntry, Invoice, User, Comment } from '../types'

export interface MockPurchaseOrder {
  id: string
  poNumber: string
  description: string
  totalAmount: number
  invoicedAmount: number
  deliveryDate: string
  status: POStatusLabel
  supplierName: string
  createdOn: string
}

const supplierUser: User = {
  name: 'Chris Green',
  company: 'Contoso Supplies Ltd',
  email: 'chris.green@contoso.com',
  initials: 'CG',
}

const reviewerUser: User = {
  name: 'Sarah Mitchell',
  company: 'Contoso Ltd',
  email: 'sarah.mitchell@contoso.com',
  initials: 'SM',
}

export function getCurrentMockUser(): User {
  return getDevRole() === 'reviewer' ? reviewerUser : supplierUser
}

// Keep backward compat — reads current role at import time
export const currentUser: User = getCurrentMockUser()

export const invoices: Invoice[] = [
  {
    id: 'INV-001',
    invoiceNumber: 'INV-2026-001',
    poNumber: 'PO-2026-001',
    amount: 12500,
    status: 'Paid',
    submissionDate: '2026-01-10',
    dueDate: '2026-02-10',
    description: 'Office supplies bulk order — Q1 stationery, printer cartridges, and desk accessories',
    company: 'Contoso Supplies Ltd',
    attachments: [
      { id: 'a1', name: 'invoice-001.pdf', size: '245 KB', type: 'application/pdf' },
      { id: 'a2', name: 'delivery-receipt.pdf', size: '120 KB', type: 'application/pdf' },
    ],
    statusHistory: [
      { status: 'Draft', date: '2026-01-08' },
      { status: 'Submitted', date: '2026-01-10', author: 'Chris Green', authorInitials: 'CG', note: 'Bulk order for Q1. All items per the agreed catalog pricing.' },
      { status: 'Under Review', date: '2026-01-12', author: 'Sarah Mitchell', authorInitials: 'SM' },
      { status: 'Approved', date: '2026-01-20', author: 'Sarah Mitchell', authorInitials: 'SM', note: 'Pricing verified against contract. Approved for payment.' },
      { status: 'Paid', date: '2026-02-10' },
    ],
    comments: [
      { id: 'c1', author: 'Chris Green', authorInitials: 'CG', date: '2026-01-10T09:15:00', text: 'Submitted for Q1 supplies. Delivery receipt attached for reference.', linkedAction: 'Submitted' },
      { id: 'c2', author: 'Sarah Mitchell', authorInitials: 'SM', date: '2026-01-14T14:30:00', text: 'Can you confirm the unit pricing for the printer cartridges? Looks slightly different from the catalog.' },
      { id: 'c3', author: 'Chris Green', authorInitials: 'CG', date: '2026-01-15T10:00:00', text: 'Good catch — that reflects the updated bulk discount we negotiated last month. See attachment line item 4.' },
      { id: 'c4', author: 'Sarah Mitchell', authorInitials: 'SM', date: '2026-01-20T11:45:00', text: 'Confirmed. Pricing verified against contract. Approving now.', linkedAction: 'Approved' },
    ],
  },
  {
    id: 'INV-002',
    invoiceNumber: 'INV-2026-002',
    poNumber: 'PO-2026-002',
    amount: 3200,
    status: 'Approved',
    submissionDate: '2026-01-15',
    dueDate: '2026-02-15',
    description: 'IT equipment maintenance — monthly server room cleaning and hardware diagnostics',
    company: 'Contoso Supplies Ltd',
    attachments: [
      { id: 'a3', name: 'maintenance-report.pdf', size: '310 KB', type: 'application/pdf' },
    ],
    statusHistory: [
      { status: 'Draft', date: '2026-01-13' },
      { status: 'Submitted', date: '2026-01-15' },
      { status: 'Under Review', date: '2026-01-17' },
      { status: 'Approved', date: '2026-01-28' },
    ],
    comments: [],
  },
  {
    id: 'INV-003',
    invoiceNumber: 'INV-2026-003',
    poNumber: 'PO-2026-003',
    amount: 85000,
    status: 'Under Review',
    submissionDate: '2026-01-22',
    dueDate: '2026-03-01',
    description: 'Annual software licensing renewal — Enterprise suite for 200 seats',
    company: 'Contoso Supplies Ltd',
    attachments: [
      { id: 'a4', name: 'license-agreement.pdf', size: '1.2 MB', type: 'application/pdf' },
      { id: 'a5', name: 'quote-enterprise.pdf', size: '450 KB', type: 'application/pdf' },
    ],
    statusHistory: [
      { status: 'Draft', date: '2026-01-20' },
      { status: 'Submitted', date: '2026-01-22' },
      { status: 'Under Review', date: '2026-01-25' },
    ],
    comments: [
      { id: 'c5', author: 'Chris Green', authorInitials: 'CG', date: '2026-01-22T10:30:00', text: 'Annual renewal — same vendor and terms as last year. License expires March 1, please prioritize.', linkedAction: 'Submitted' },
      { id: 'c6', author: 'Sarah Mitchell', authorInitials: 'SM', date: '2026-01-27T15:00:00', text: 'High value invoice — routing to finance director for secondary approval. Will update once I hear back.' },
    ],
  },
  {
    id: 'INV-004',
    invoiceNumber: 'INV-2026-004',
    poNumber: 'PO-2026-004',
    amount: 4750,
    status: 'Submitted',
    submissionDate: '2026-02-01',
    dueDate: '2026-03-01',
    description: 'Ergonomic furniture — standing desks and monitor arms for new hires',
    company: 'Contoso Supplies Ltd',
    attachments: [
      { id: 'a6', name: 'furniture-order.pdf', size: '180 KB', type: 'application/pdf' },
    ],
    statusHistory: [
      { status: 'Draft', date: '2026-01-29' },
      { status: 'Submitted', date: '2026-02-01' },
    ],
    comments: [],
  },
  {
    id: 'INV-005',
    invoiceNumber: 'INV-2026-005',
    poNumber: 'PO-2026-005',
    amount: 1500,
    status: 'Rejected',
    submissionDate: '2026-02-05',
    dueDate: '2026-03-05',
    description: 'Catering services — team building event refreshments (duplicate submission)',
    company: 'Contoso Supplies Ltd',
    attachments: [],
    statusHistory: [
      { status: 'Draft', date: '2026-02-03' },
      { status: 'Submitted', date: '2026-02-05' },
      { status: 'Under Review', date: '2026-02-07' },
      { status: 'Rejected', date: '2026-02-10', author: 'Sarah Mitchell', authorInitials: 'SM', note: 'Duplicate submission — already paid as INV-2025-087.' },
    ],
    comments: [
      { id: 'c7', author: 'Sarah Mitchell', authorInitials: 'SM', date: '2026-02-10T09:20:00', text: 'This appears to be a duplicate of INV-2025-087 which was paid on Dec 15, 2025. Please verify and resubmit only if this is a separate event.', linkedAction: 'Rejected' },
      { id: 'c8', author: 'Chris Green', authorInitials: 'CG', date: '2026-02-10T14:00:00', text: 'You\'re right, this was submitted in error. The original was already processed. Apologies for the confusion.' },
    ],
  },
  {
    id: 'INV-006',
    invoiceNumber: 'INV-2026-006',
    poNumber: 'PO-2026-006',
    amount: 22800,
    status: 'Paid',
    submissionDate: '2026-02-10',
    dueDate: '2026-03-10',
    description: 'Network infrastructure — Ethernet cabling and switch installation for Building C',
    company: 'Contoso Supplies Ltd',
    attachments: [
      { id: 'a7', name: 'network-plan.pdf', size: '890 KB', type: 'application/pdf' },
      { id: 'a8', name: 'installation-photos.zip', size: '4.5 MB', type: 'application/zip' },
    ],
    statusHistory: [
      { status: 'Draft', date: '2026-02-08' },
      { status: 'Submitted', date: '2026-02-10' },
      { status: 'Under Review', date: '2026-02-12' },
      { status: 'Approved', date: '2026-02-22' },
      { status: 'Paid', date: '2026-03-10' },
    ],
    comments: [],
  },
  {
    id: 'INV-007',
    invoiceNumber: 'INV-2026-007',
    poNumber: 'PO-2026-007',
    amount: 9600,
    status: 'Approved',
    submissionDate: '2026-02-18',
    dueDate: '2026-03-18',
    description: 'Printing services — Q1 marketing materials, brochures, and business cards',
    company: 'Contoso Supplies Ltd',
    attachments: [
      { id: 'a9', name: 'print-proof.pdf', size: '2.1 MB', type: 'application/pdf' },
    ],
    statusHistory: [
      { status: 'Draft', date: '2026-02-16' },
      { status: 'Submitted', date: '2026-02-18' },
      { status: 'Under Review', date: '2026-02-20' },
      { status: 'Approved', date: '2026-03-01' },
    ],
    comments: [],
  },
  {
    id: 'INV-008',
    invoiceNumber: 'INV-2026-008',
    poNumber: 'PO-2026-008',
    amount: 38500,
    status: 'Under Review',
    submissionDate: '2026-02-25',
    dueDate: '2026-03-25',
    description: 'Security system upgrade — access control panels and CCTV cameras for all floors',
    company: 'Contoso Supplies Ltd',
    attachments: [
      { id: 'a10', name: 'security-proposal.pdf', size: '560 KB', type: 'application/pdf' },
    ],
    statusHistory: [
      { status: 'Draft', date: '2026-02-23' },
      { status: 'Submitted', date: '2026-02-25' },
      { status: 'Under Review', date: '2026-02-27' },
    ],
    comments: [
      { id: 'c9', author: 'Chris Green', authorInitials: 'CG', date: '2026-02-25T16:00:00', text: 'Urgent — security compliance audit deadline is March 31. Installation needs at least 3 weeks lead time.', linkedAction: 'Submitted' },
    ],
  },
  {
    id: 'INV-009',
    invoiceNumber: 'INV-2026-009',
    poNumber: 'PO-2026-009',
    amount: 6100,
    status: 'Draft',
    submissionDate: '2026-03-01',
    dueDate: '2026-04-01',
    description: 'Cleaning supplies — industrial-grade cleaning products and equipment',
    company: 'Contoso Supplies Ltd',
    attachments: [],
    statusHistory: [
      { status: 'Draft', date: '2026-03-01' },
    ],
    comments: [],
  },
  {
    id: 'INV-010',
    invoiceNumber: 'INV-2026-010',
    poNumber: 'PO-2026-010',
    amount: 15200,
    status: 'Submitted',
    submissionDate: '2026-03-05',
    dueDate: '2026-04-05',
    description: 'Conference room AV equipment — projectors, screens, and wireless presenters',
    company: 'Contoso Supplies Ltd',
    attachments: [
      { id: 'a11', name: 'av-quote.pdf', size: '340 KB', type: 'application/pdf' },
      { id: 'a12', name: 'room-layout.png', size: '1.8 MB', type: 'image/png' },
    ],
    statusHistory: [
      { status: 'Draft', date: '2026-03-03' },
      { status: 'Submitted', date: '2026-03-05' },
    ],
    comments: [],
  },
  {
    id: 'INV-011',
    invoiceNumber: 'INV-2026-011',
    poNumber: 'PO-2026-011',
    amount: 7400,
    status: 'Needs Revision',
    submissionDate: '2026-03-08',
    dueDate: '2026-04-08',
    description: 'Warehouse shelving installation — heavy-duty steel racking for Building A storage',
    company: 'Contoso Supplies Ltd',
    attachments: [
      { id: 'a13', name: 'shelving-quote.pdf', size: '280 KB', type: 'application/pdf' },
    ],
    statusHistory: [
      { status: 'Draft', date: '2026-03-06' },
      { status: 'Submitted', date: '2026-03-08' },
      { status: 'Under Review', date: '2026-03-10' },
      { status: 'Needs Revision', date: '2026-03-12', note: 'Missing delivery receipt — please attach proof of delivery and resubmit' },
    ],
    comments: [],
  },
  {
    id: 'INV-012',
    invoiceNumber: 'INV-2026-012',
    poNumber: 'PO-2026-012',
    amount: 18900,
    status: 'Approved',
    submissionDate: '2026-02-14',
    dueDate: '2026-03-14',
    description: 'HVAC maintenance contract — quarterly service for all office floors',
    company: 'Contoso Supplies Ltd',
    attachments: [
      { id: 'a14', name: 'hvac-contract.pdf', size: '520 KB', type: 'application/pdf' },
      { id: 'a15', name: 'delivery-confirmation.pdf', size: '150 KB', type: 'application/pdf' },
    ],
    statusHistory: [
      { status: 'Draft', date: '2026-02-12' },
      { status: 'Submitted', date: '2026-02-14' },
      { status: 'Under Review', date: '2026-02-16' },
      { status: 'Needs Revision', date: '2026-02-20', note: 'PO amount does not match contract total — please correct the amount and attach signed contract' },
      { status: 'Submitted', date: '2026-02-22' },
      { status: 'Under Review', date: '2026-02-24' },
      { status: 'Approved', date: '2026-03-05' },
    ],
    comments: [],
  },
]

export const purchaseOrders: MockPurchaseOrder[] = [
  {
    id: 'PO-001',
    poNumber: 'PO-2026-001',
    description: 'Q1 office supplies — stationery, printer cartridges, desk accessories',
    totalAmount: 15000,
    invoicedAmount: 12500,
    deliveryDate: '2026-02-01',
    status: 'Partially Invoiced',
    supplierName: 'Contoso Supplies Ltd',
    createdOn: '2026-01-02',
  },
  {
    id: 'PO-002',
    poNumber: 'PO-2026-002',
    description: 'Monthly IT equipment maintenance contract',
    totalAmount: 3200,
    invoicedAmount: 3200,
    deliveryDate: '2026-02-15',
    status: 'Fully Invoiced',
    supplierName: 'Contoso Supplies Ltd',
    createdOn: '2026-01-05',
  },
  {
    id: 'PO-003',
    poNumber: 'PO-2026-003',
    description: 'Annual enterprise software licensing — 200 seats',
    totalAmount: 90000,
    invoicedAmount: 85000,
    deliveryDate: '2026-03-01',
    status: 'Partially Invoiced',
    supplierName: 'Contoso Supplies Ltd',
    createdOn: '2026-01-10',
  },
  {
    id: 'PO-004',
    poNumber: 'PO-2026-004',
    description: 'Ergonomic furniture for new hire onboarding',
    totalAmount: 8000,
    invoicedAmount: 4750,
    deliveryDate: '2026-03-01',
    status: 'Partially Invoiced',
    supplierName: 'Contoso Supplies Ltd',
    createdOn: '2026-01-15',
  },
  {
    id: 'PO-005',
    poNumber: 'PO-2026-005',
    description: 'Team building event catering services',
    totalAmount: 2000,
    invoicedAmount: 1500,
    deliveryDate: '2026-03-05',
    status: 'Issued',
    supplierName: 'Contoso Supplies Ltd',
    createdOn: '2026-01-20',
  },
  {
    id: 'PO-006',
    poNumber: 'PO-2026-006',
    description: 'Network infrastructure — Building C cabling and switches',
    totalAmount: 25000,
    invoicedAmount: 22800,
    deliveryDate: '2026-03-10',
    status: 'Partially Invoiced',
    supplierName: 'Contoso Supplies Ltd',
    createdOn: '2026-01-25',
  },
  {
    id: 'PO-007',
    poNumber: 'PO-2026-007',
    description: 'Q1 marketing materials — brochures, business cards, banners',
    totalAmount: 12000,
    invoicedAmount: 9600,
    deliveryDate: '2026-03-18',
    status: 'Partially Invoiced',
    supplierName: 'Contoso Supplies Ltd',
    createdOn: '2026-02-01',
  },
  {
    id: 'PO-008',
    poNumber: 'PO-2026-008',
    description: 'Security system upgrade — access control and CCTV',
    totalAmount: 45000,
    invoicedAmount: 38500,
    deliveryDate: '2026-03-25',
    status: 'Partially Invoiced',
    supplierName: 'Contoso Supplies Ltd',
    createdOn: '2026-02-10',
  },
  {
    id: 'PO-009',
    poNumber: 'PO-2026-009',
    description: 'Industrial cleaning supplies and equipment',
    totalAmount: 8000,
    invoicedAmount: 0,
    deliveryDate: '2026-04-01',
    status: 'Issued',
    supplierName: 'Contoso Supplies Ltd',
    createdOn: '2026-02-15',
  },
  {
    id: 'PO-010',
    poNumber: 'PO-2026-010',
    description: 'Conference room AV equipment — projectors, screens, wireless presenters',
    totalAmount: 20000,
    invoicedAmount: 15200,
    deliveryDate: '2026-04-05',
    status: 'Partially Invoiced',
    supplierName: 'Contoso Supplies Ltd',
    createdOn: '2026-02-20',
  },
  {
    id: 'PO-011',
    poNumber: 'PO-2026-011',
    description: 'Warehouse shelving — heavy-duty steel racking for Building A',
    totalAmount: 10000,
    invoicedAmount: 7400,
    deliveryDate: '2026-04-08',
    status: 'Partially Invoiced',
    supplierName: 'Contoso Supplies Ltd',
    createdOn: '2026-02-25',
  },
  {
    id: 'PO-012',
    poNumber: 'PO-2026-012',
    description: 'HVAC quarterly maintenance contract — all office floors',
    totalAmount: 20000,
    invoicedAmount: 18900,
    deliveryDate: '2026-03-14',
    status: 'Partially Invoiced',
    supplierName: 'Contoso Supplies Ltd',
    createdOn: '2026-02-05',
  },
  {
    id: 'PO-013',
    poNumber: 'PO-2026-013',
    description: 'New laptop procurement — 50 units for Q2 expansion',
    totalAmount: 75000,
    invoicedAmount: 0,
    deliveryDate: '2026-05-01',
    status: 'Draft',
    supplierName: 'Contoso Supplies Ltd',
    createdOn: '2026-03-10',
  },
  {
    id: 'PO-014',
    poNumber: 'PO-2026-014',
    description: 'Office renovation — carpet replacement and painting',
    totalAmount: 35000,
    invoicedAmount: 0,
    deliveryDate: '2026-04-15',
    status: 'Cancelled',
    supplierName: 'Contoso Supplies Ltd',
    createdOn: '2026-03-01',
  },
]

export function getPurchaseOrderById(id: string): MockPurchaseOrder | undefined {
  return purchaseOrders.find((po) => po.id === id)
}

export function getInvoiceById(id: string): Invoice | undefined {
  return invoices.find((inv) => inv.id === id)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  // Parse as local date to avoid UTC offset causing off-by-one day
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const statusOrder: InvoiceStatus[] = [
  'Draft',
  'Submitted',
  'Under Review',
  'Needs Revision',
  'Approved',
  'Rejected',
  'Paid',
]
