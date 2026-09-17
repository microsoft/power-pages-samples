// src/types/invoiceAttachment.ts
// TypeScript types for the spnvc_invoiceattachment Dataverse table.
// Column names verified against actual Dataverse metadata on 2026-03-19.

import { getFormattedValue } from '../services/powerPagesApi'

// -- Raw OData Entity ---------------------------------------------------------
// Matches Dataverse column logical names exactly.

export interface InvoiceAttachmentEntity {
  spnvc_invoiceattachmentid: string
  spnvc_name?: string              // File Name (primary name attribute)
  spnvc_filesize?: string          // File Size (String, e.g. "1.2 MB")
  spnvc_filetype?: string          // File Type (String, e.g. "application/pdf")
  spnvc_file_name?: string         // Auto-generated filename for file column
  // Lookup raw GUID values (use in $select and $filter)
  _spnvc_invoiceid_value?: string           // Invoice GUID
  _spnvc_invoicecommentid_value?: string    // Invoice Comment GUID
  // Expanded navigation properties (use in $expand)
  spnvc_InvoiceId?: { spnvc_invoiceid: string; spnvc_name?: string }
  spnvc_InvoiceCommentId?: { spnvc_invoicecommentid: string; spnvc_name?: string }
  // System columns
  createdon?: string
  modifiedon?: string
  // Index signature for OData formatted value annotations
  [key: string]: unknown
}

// -- Clean Domain Type --------------------------------------------------------
// Used by UI components. Properties use camelCase with friendly names.

export interface InvoiceAttachment {
  id: string
  fileName: string
  fileSize: string
  fileType: string
  invoiceId?: string
  invoiceName: string
  commentId?: string
  commentName: string
  createdOn: string
  modifiedOn: string
}

// -- Input Types --------------------------------------------------------------

export interface CreateInvoiceAttachmentInput {
  fileName: string
  fileSize?: string
  fileType?: string
  invoiceId?: string
  commentId?: string
  contactId?: string
}

// -- Entity-to-Domain Mapper --------------------------------------------------

export const mapInvoiceAttachmentEntity = (
  entity: InvoiceAttachmentEntity,
): InvoiceAttachment => ({
  id: entity.spnvc_invoiceattachmentid,
  fileName: entity.spnvc_name ?? '',
  fileSize: entity.spnvc_filesize ?? '',
  fileType: entity.spnvc_filetype ?? '',
  invoiceId: entity._spnvc_invoiceid_value,
  invoiceName:
    getFormattedValue(entity, '_spnvc_invoiceid_value')
    ?? entity.spnvc_InvoiceId?.spnvc_name
    ?? '',
  commentId: entity._spnvc_invoicecommentid_value,
  commentName:
    getFormattedValue(entity, '_spnvc_invoicecommentid_value')
    ?? entity.spnvc_InvoiceCommentId?.spnvc_name
    ?? '',
  createdOn: entity.createdon ?? '',
  modifiedOn: entity.modifiedon ?? entity.createdon ?? '',
})
