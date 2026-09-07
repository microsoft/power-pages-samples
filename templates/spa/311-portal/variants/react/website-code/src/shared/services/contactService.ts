// src/shared/services/contactService.ts
// CRUD service for the contact Dataverse table (standard/OOB table).
//
// Operations: createContact, getContactByEmail, getContactById, updateContact.
//
// NOTE: Column logical names are well-known standard Dataverse contact columns.
// API metadata verification was not available at generation time, but these names
// are stable for the OOB contact entity. The entity set name "contacts" is the
// standard OData entity set for the contact table.

import {
  powerPagesFetch,
  powerPagesFetchResponse,
  extractRecordId,
  buildODataUrl,
  escapeODataString,
  type ODataCollectionResponse,
} from '../powerPagesApi'
import {
  type Contact,
  type ContactEntity,
  type CreateContactInput,
  type UpdateContactInput,
  mapContactEntity,
} from '../../types/contact'

// -- Select Columns -----------------------------------------------------------
// Always specify exact columns -- never use wildcards.

const CONTACT_SELECT = [
  'contactid',
  'firstname',
  'lastname',
  'fullname',
  'emailaddress1',
  'telephone1',
  'address1_line1',
].join(',')

// -- Create -------------------------------------------------------------------

export const createContact = async (payload: CreateContactInput): Promise<Contact> => {
  const body: Record<string, unknown> = {
    firstname: payload.firstName,
    lastname: payload.lastName,
    emailaddress1: payload.email,
  }

  if (payload.phone) body.telephone1 = payload.phone
  if (payload.address) body.address1_line1 = payload.address

  // Do NOT send `Prefer: return=representation` -- requesting the full row back
  // triggers "Attribute * ... is not enabled for Web Api" (90040101) under
  // field-level Web API restrictions. Read the new ID from the OData-EntityId
  // header and re-fetch with an explicit $select instead.
  const response = await powerPagesFetchResponse('/_api/contacts', {
    method: 'POST',
    body: JSON.stringify(body),
  })

  const createdId = extractRecordId(response)
  if (createdId) {
    const created = await getContactById(createdId)
    if (created) return created
  }

  throw new Error('Failed to retrieve created contact -- no OData-EntityId header returned')
}

// -- Get by Email -------------------------------------------------------------
// Critical for the Track page -- looks up a contact by their email address.

export const getContactByEmail = async (email: string): Promise<Contact | null> => {
  const url = buildODataUrl('contacts', {
    '$select': CONTACT_SELECT,
    '$filter': `emailaddress1 eq '${escapeODataString(email)}'`,
    '$top': '1',
    '$count': 'true',
  })

  try {
    const response = await powerPagesFetch<ODataCollectionResponse<ContactEntity>>(url)
    const entity = response?.value?.[0]
    return entity ? mapContactEntity(entity) : null
  } catch {
    return null
  }
}

// -- Get by ID ----------------------------------------------------------------

export const getContactById = async (id: string): Promise<Contact | null> => {
  const url = buildODataUrl(`contacts(${id})`, {
    '$select': CONTACT_SELECT,
  })

  try {
    const entity = await powerPagesFetch<ContactEntity>(url)
    return entity ? mapContactEntity(entity) : null
  } catch {
    return null
  }
}

// -- Update -------------------------------------------------------------------

export const updateContact = async (id: string, payload: UpdateContactInput): Promise<Contact> => {
  const body: Record<string, unknown> = {}

  if (payload.firstName !== undefined) body.firstname = payload.firstName
  if (payload.lastName !== undefined) body.lastname = payload.lastName
  if (payload.email !== undefined) body.emailaddress1 = payload.email
  if (payload.phone !== undefined) body.telephone1 = payload.phone
  if (payload.address !== undefined) body.address1_line1 = payload.address

  await powerPagesFetch(`/_api/contacts(${id})`, {
    method: 'PATCH',
    headers: { 'If-Match': '*' },
    body: JSON.stringify(body),
  })

  const updated = await getContactById(id)
  if (!updated) throw new Error('Failed to fetch updated contact')
  return updated
}
