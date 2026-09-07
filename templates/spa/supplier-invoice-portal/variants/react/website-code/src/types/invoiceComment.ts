// src/types/invoiceComment.ts
// TypeScript types for the spnvc_invoicecomment Dataverse table.
// Column names verified against actual Dataverse metadata on 2026-03-19.

import { getFormattedValue } from '../services/powerPagesApi'

// -- Raw OData Entity ---------------------------------------------------------
// Matches Dataverse column logical names exactly.

export interface InvoiceCommentEntity {
  spnvc_invoicecommentid: string
  spnvc_name?: string                    // Comment Title (primary name attribute)
  spnvc_commenttext?: string             // Comment Text (Memo)
  spnvc_linkedaction?: string            // Linked Action (String)
  // Lookup raw GUID values (use in $select and $filter)
  _spnvc_invoiceid_value?: string        // Invoice GUID
  _spnvc_authorcontactid_value?: string  // Author Contact GUID
  // Expanded navigation properties (use in $expand)
  spnvc_InvoiceId?: { spnvc_invoiceid: string; spnvc_name?: string }
  spnvc_AuthorContactId?: { contactid: string; fullname?: string }
  // System columns
  createdon?: string
  modifiedon?: string
  // Index signature for OData formatted value annotations
  [key: string]: unknown
}

// -- Clean Domain Type --------------------------------------------------------
// Used by UI components. Properties use camelCase with friendly names.

export interface InvoiceComment {
  id: string
  title: string
  commentText: string
  linkedAction: string
  invoiceId?: string
  invoiceName: string
  authorContactId?: string
  authorName: string
  createdOn: string
  modifiedOn: string
}

// -- Input Types --------------------------------------------------------------

export interface CreateInvoiceCommentInput {
  title?: string
  commentText: string
  linkedAction?: string
  invoiceId: string
  authorContactId?: string
  contactId?: string
}

// -- Entity-to-Domain Mapper --------------------------------------------------

export const mapInvoiceCommentEntity = (entity: InvoiceCommentEntity): InvoiceComment => ({
  id: entity.spnvc_invoicecommentid,
  title: entity.spnvc_name ?? '',
  commentText: entity.spnvc_commenttext ?? '',
  linkedAction: entity.spnvc_linkedaction ?? '',
  invoiceId: entity._spnvc_invoiceid_value,
  invoiceName:
    getFormattedValue(entity, '_spnvc_invoiceid_value')
    ?? entity.spnvc_InvoiceId?.spnvc_name
    ?? '',
  authorContactId: entity._spnvc_authorcontactid_value,
  authorName:
    getFormattedValue(entity, '_spnvc_authorcontactid_value')
    ?? entity.spnvc_AuthorContactId?.fullname
    ?? '',
  createdOn: entity.createdon ?? '',
  modifiedOn: entity.modifiedon ?? entity.createdon ?? '',
})
