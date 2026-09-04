// UI presentation types used by components and the data provider layer.
// These are distinct from the Dataverse entity types in types/invoice.ts.
// InvoiceStatus is derived from the canonical INVOICE_STATUS enum to prevent drift.

import type { InvoiceStatusLabel } from './types/invoice'

export type InvoiceStatus = InvoiceStatusLabel

export interface Attachment {
  id: string
  name: string
  size: string
  type: string
}

export interface StatusHistoryEntry {
  status: InvoiceStatus
  date: string
  note?: string
  author?: string
  authorInitials?: string
}

export interface Comment {
  id: string
  author: string
  authorInitials: string
  date: string
  text: string
  linkedAction?: string
  attachments?: Attachment[]
}

export interface Invoice {
  id: string
  invoiceNumber: string
  poNumber: string
  amount: number
  status: InvoiceStatus
  submissionDate: string
  dueDate: string
  description: string
  company: string
  attachments: Attachment[]
  statusHistory: StatusHistoryEntry[]
  comments: Comment[]
}

export interface User {
  name: string
  company: string
  email: string
  initials: string
}
