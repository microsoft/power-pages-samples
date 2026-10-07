import { getCurrentUser, isLocalDevelopment, updateProfileIdentity } from './authService'
import { buildODataUrl, powerPagesFetch } from './powerPagesApi'

export interface ProfileFields {
  firstName: string
  lastName: string
  email: string
  phone: string
  jobTitle: string
}

export interface ContactProfile extends ProfileFields {
  fullName: string
  companyName: string
}

interface ContactEntity {
  contactid: string
  firstname?: string | null
  lastname?: string | null
  fullname?: string | null
  emailaddress1?: string | null
  telephone1?: string | null
  jobtitle?: string | null
  '_parentcustomerid_value@OData.Community.Display.V1.FormattedValue'?: string
}

export function validateProfile(fields: ProfileFields): void {
  if (!fields.lastName.trim()) throw new Error('Last Name is required.')
  const limits: Array<[keyof ProfileFields, string, number]> = [
    ['firstName', 'First Name', 50], ['lastName', 'Last Name', 50],
    ['email', 'Email Address', 100], ['phone', 'Phone Number', 50], ['jobTitle', 'Job Title', 100],
  ]
  for (const [field, label, limit] of limits) {
    if (fields[field].length > limit) throw new Error(`${label} must be at most ${limit} characters.`)
  }
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    throw new Error('Enter a valid Email Address.')
  }
}

function currentContactId(): string {
  const user = getCurrentUser()
  if (!user?.userName || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(user.contactId)) {
    throw new Error('Sign in with a valid portal Contact before accessing your profile.')
  }
  return user.contactId
}

function publishIdentity(contactId: string, profile: ContactProfile): ContactProfile {
  updateProfileIdentity(contactId, {
    firstName: profile.firstName, lastName: profile.lastName, email: profile.email, fullName: profile.fullName,
  })
  return profile
}

async function readContact(contactId: string, signal?: AbortSignal): Promise<ContactProfile> {
  const contact = await powerPagesFetch<ContactEntity>(
    buildODataUrl(`contacts(${contactId})`, {
      '$select': 'contactid,firstname,lastname,fullname,emailaddress1,telephone1,jobtitle,_parentcustomerid_value',
    }),
    { signal, cache: 'no-store' },
  )
  if (!contact || contact.contactid?.toLowerCase() !== contactId.toLowerCase()) {
    throw new Error('Unable to load your Contact profile. Please sign in again.')
  }
  return {
    firstName: contact.firstname ?? '', lastName: contact.lastname ?? '',
    email: contact.emailaddress1 ?? '', phone: contact.telephone1 ?? '', jobTitle: contact.jobtitle ?? '',
    fullName: contact.fullname ?? '',
    companyName: contact['_parentcustomerid_value@OData.Community.Display.V1.FormattedValue'] ?? '',
  }
}

function readMockProfile(contactId: string): ContactProfile {
  const saved = localStorage.getItem(`supplier-invoice-profile:${contactId}`)
  if (saved) {
    const profile: unknown = JSON.parse(saved)
    if (!profile || typeof profile !== 'object' ||
        !['firstName', 'lastName', 'email', 'phone', 'jobTitle', 'fullName', 'companyName']
          .every(field => field in profile && typeof Reflect.get(profile, field) === 'string')) {
      throw new Error('Invalid demo profile in this browser. Clear its local profile storage and reload.')
    }
    return profile as ContactProfile
  }
  const user = getCurrentUser()
  return {
    firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', email: user?.email ?? '',
    phone: '', jobTitle: '', fullName: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
    companyName: 'Contoso Supplies Ltd',
  }
}

export async function getProfile(signal?: AbortSignal): Promise<ContactProfile> {
  const contactId = currentContactId()
  const profile = isLocalDevelopment ? readMockProfile(contactId) : await readContact(contactId, signal)
  return publishIdentity(contactId, profile)
}

export async function updateProfile(fields: ProfileFields, signal?: AbortSignal): Promise<ContactProfile> {
  validateProfile(fields)
  const contactId = currentContactId()
  if (isLocalDevelopment) {
    const profile = {
      ...readMockProfile(contactId), ...fields,
      fullName: [fields.firstName, fields.lastName].filter(Boolean).join(' '),
    }
    localStorage.setItem(`supplier-invoice-profile:${contactId}`, JSON.stringify(profile))
    return publishIdentity(contactId, readMockProfile(contactId))
  }
  // fullname is computed by Dataverse; Company Name and identity/security fields
  // remain administrator-managed. Never spread caller data into this payload.
  // https://learn.microsoft.com/power-apps/developer/data-platform/reference/entities/contact
  await powerPagesFetch(`/_api/contacts(${contactId})`, {
    method: 'PATCH', signal,
    body: JSON.stringify({
      firstname: fields.firstName, lastname: fields.lastName,
      emailaddress1: fields.email, telephone1: fields.phone, jobtitle: fields.jobTitle,
    }),
  })
  let profile: ContactProfile
  try {
    profile = await readContact(contactId, signal)
  } catch (error) {
    if (signal?.aborted) throw error
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`Profile saved, but could not reload your Contact: ${detail}`)
  }
  return publishIdentity(contactId, profile)
}
