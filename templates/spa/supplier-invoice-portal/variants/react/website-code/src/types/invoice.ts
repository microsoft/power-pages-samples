// src/types/invoice.ts
// TypeScript types for the spnvc_invoice Dataverse table.
// Column names verified against actual Dataverse metadata on 2026-03-19.

import { getFormattedValue } from '../services/powerPagesApi'

// -- Raw OData Entity ---------------------------------------------------------
// Matches Dataverse column logical names exactly.

export interface InvoiceEntity {
  spnvc_invoiceid: string
  spnvc_name?: string                // Invoice Number (primary name attribute)
  spnvc_ponumber?: string            // PO Number
  spnvc_description?: string         // Description (Memo)
  spnvc_submissiondate?: string      // Submission Date (DateTime ISO)
  spnvc_duedate?: string             // Due Date (DateTime ISO)
  spnvc_amount?: number              // Amount (Money)
  spnvc_invoicestatus?: number       // Invoice Status (Picklist)
  // Lookup raw GUID values (use in $select and $filter)
  _spnvc_contactid_value?: string    // Submitter contact GUID
  _spnvc_supplierid_value?: string   // Supplier GUID
  _spnvc_purchaseorderid_value?: string // Purchase Order GUID
  // Expanded navigation properties (use in $expand)
  spnvc_ContactId?: { contactid: string; fullname?: string }
  spnvc_SupplierId?: { spnvc_supplierid: string; spnvc_name?: string }
  // System columns
  createdon?: string
  modifiedon?: string
  // Index signature for OData formatted value annotations
  [key: string]: unknown
}

// -- Invoice Status Option Set ------------------------------------------------
// Values verified from Dataverse PicklistAttributeMetadata.

export const INVOICE_STATUS = {
  Draft: 1,
  Submitted: 2,
  'Under Review': 3,
  'Needs Revision': 4,
  Approved: 5,
  Rejected: 6,
  Paid: 7,
} as const

export type InvoiceStatusLabel = keyof typeof INVOICE_STATUS
export type InvoiceStatusValue = typeof INVOICE_STATUS[InvoiceStatusLabel]

/** Statuses where the invoice is finalized and no further edits/comments/attachments are allowed. */
const LOCKED_INVOICE_STATUSES: readonly InvoiceStatusLabel[] = ['Approved', 'Paid']

export function isInvoiceLocked(status: string | undefined): boolean {
  return LOCKED_INVOICE_STATUSES.includes(status as InvoiceStatusLabel)
}

const STATUS_VALUE_TO_LABEL = Object.fromEntries(
  Object.entries(INVOICE_STATUS).map(([label, value]) => [value, label]),
) as Record<number, InvoiceStatusLabel>

// -- Clean Domain Type --------------------------------------------------------
// Used by UI components. Properties use camelCase with friendly names.

export interface Invoice {
  id: string
  invoiceNumber: string
  poNumber: string
  description: string
  submissionDate: string
  dueDate: string
  amount: number
  status: InvoiceStatusLabel
  statusValue: number
  contactId?: string
  contactName: string
  supplierId?: string
  supplierName: string
  purchaseOrderId?: string
  createdOn: string
  modifiedOn: string
}

// -- Input Types --------------------------------------------------------------

export interface CreateInvoiceInput {
  invoiceNumber: string
  poNumber?: string
  description?: string
  submissionDate?: string
  dueDate?: string
  amount: number
  status?: InvoiceStatusLabel
  contactId?: string
  supplierId?: string
}

export interface UpdateInvoiceInput {
  invoiceNumber?: string
  poNumber?: string
  description?: string
  submissionDate?: string
  dueDate?: string
  amount?: number
  status?: InvoiceStatusLabel
  contactId?: string | null
  supplierId?: string | null
}

// -- Entity-to-Domain Mapper --------------------------------------------------

export const mapInvoiceEntity = (entity: InvoiceEntity): Invoice => ({
  id: entity.spnvc_invoiceid,
  invoiceNumber: entity.spnvc_name ?? '',
  poNumber: entity.spnvc_ponumber ?? '',
  description: entity.spnvc_description ?? '',
  submissionDate: entity.spnvc_submissiondate ?? '',
  dueDate: entity.spnvc_duedate ?? '',
  amount: entity.spnvc_amount ?? 0,
  status: STATUS_VALUE_TO_LABEL[entity.spnvc_invoicestatus ?? 0] ?? 'Draft',
  statusValue: entity.spnvc_invoicestatus ?? 1,
  contactId: entity._spnvc_contactid_value,
  contactName:
    getFormattedValue(entity, '_spnvc_contactid_value')
    ?? entity.spnvc_ContactId?.fullname
    ?? '',
  supplierId: entity._spnvc_supplierid_value,
  purchaseOrderId: entity._spnvc_purchaseorderid_value,
  supplierName:
    getFormattedValue(entity, '_spnvc_supplierid_value')
    ?? entity.spnvc_SupplierId?.spnvc_name
    ?? '',
  createdOn: entity.createdon ?? '',
  modifiedOn: entity.modifiedon ?? entity.createdon ?? '',
})
