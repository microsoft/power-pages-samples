// src/types/contact.ts
// TypeScript types for the contact Dataverse table (standard/OOB table, no publisher prefix).
//
// NOTE: Column logical names are from the data model manifest and are well-known
// standard Dataverse contact columns. API metadata verification was not available
// at generation time, but these names are stable for the OOB contact entity.

// -- Raw OData Entity ---------------------------------------------------------
// Matches Dataverse column logical names exactly.

export interface ContactEntity {
  contactid: string
  firstname?: string
  lastname?: string
  fullname?: string
  emailaddress1?: string
  telephone1?: string
  address1_line1?: string
  createdon?: string
  modifiedon?: string
  // Index signature for OData formatted value annotations
  [key: string]: unknown
}

// -- Domain Type --------------------------------------------------------------
// Clean application type for UI consumption.

export interface Contact {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  address: string
}

// -- Input Types --------------------------------------------------------------

export interface CreateContactInput {
  firstName: string
  lastName: string
  email: string
  phone?: string
  address?: string
}

export interface UpdateContactInput {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  address?: string
}

// -- Entity-to-Domain Mapper --------------------------------------------------

export const mapContactEntity = (entity: ContactEntity): Contact => ({
  id: entity.contactid,
  firstName: entity.firstname ?? '',
  lastName: entity.lastname ?? '',
  fullName: entity.fullname ?? '',
  email: entity.emailaddress1 ?? '',
  phone: entity.telephone1 ?? '',
  address: entity.address1_line1 ?? '',
})

// -- Name Splitting Helper ----------------------------------------------------
// The CreateRequest form collects a single "name" field. This utility splits
// it into firstName and lastName for the Dataverse contact record.

export const splitFullName = (name: string): { firstName: string; lastName: string } => {
  const trimmed = name.trim()
  const spaceIndex = trimmed.indexOf(' ')
  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: '' }
  }
  return {
    firstName: trimmed.substring(0, spaceIndex),
    lastName: trimmed.substring(spaceIndex + 1).trim(),
  }
}
