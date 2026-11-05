export const ACCOUNTS_URL = '/customers/customer-accounts/'
export const CONTACTS_URL = '/customers/customer-contacts/'
export const CREATE_ACCOUNT_URL = '/customers/customer-accounts/create-customer-account/'
export const editAccountUrl = (id: string) => `/customers/customer-accounts/edit-customer-account/?id=${encodeURIComponent(id)}`
export const editContactUrl = (id: string) => `/customers/customer-contacts/edit-customer-contact/?id=${encodeURIComponent(id)}`
export const createContactUrl = (accountId?: string) =>
  `/customers/customer-contacts/create-customer-contact-form/${accountId ? `?accountid=${encodeURIComponent(accountId)}` : ''}`

export const EMAIL_FORMAT_MESSAGE = 'Enter an email address in the correct format, like name@example.com'
export const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
export const WEBSITE_HINT = 'For example, www.contoso.com'
export const websiteHref = (v: string) => (/^https?:\/\//i.test(v) ? v : `https://${v}`)

/** Address as separate lines (street lines, "City, State ZIP", country). */
export function addressLines(a?: {
  line1?: string
  line2?: string
  line3?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
}): string[] {
  if (!a) return []
  const cityLine = ([a.city, a.state].filter(Boolean).join(', ') + (a.postalCode ? ` ${a.postalCode}` : '')).trim()
  return [a.line1, a.line2, a.line3, cityLine, a.country].filter((l): l is string => !!l && l.trim() !== '')
}
