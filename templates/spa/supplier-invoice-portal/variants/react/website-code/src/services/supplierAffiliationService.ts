import { getCurrentUser } from './authService'
import { powerPagesFetch, buildODataUrl } from './powerPagesApi'
import { fetchXmlRecord } from './fetchXmlApi'
import { SUPPLIER_CATEGORY, ACCOUNT_STATE, type SupplierEntity } from '../types/supplier'

interface ContactAffiliation {
  _parentcustomerid_value?: string
  '_parentcustomerid_value@Microsoft.Dynamics.CRM.lookuplogicalname'?: string
}

// Company Name is polymorphic. A Contact target isn't a Supplier affiliation.
// The Self Contact permission, not this client ID, restricts the actual read.
export async function getSupplierCompanyId(): Promise<string> {
  const contactId = getCurrentUser()?.contactId
  if (!contactId) throw new Error('Sign in before accessing supplier purchase orders.')
  const contact = await powerPagesFetch<ContactAffiliation>(
    buildODataUrl(`contacts(${contactId})`, { '$select': '_parentcustomerid_value' }),
    { headers: { Prefer: 'odata.include-annotations="Microsoft.Dynamics.CRM.lookuplogicalname"' } },
  )
  if (!contact?._parentcustomerid_value) {
    throw new Error('Your Contact has no supplier Company Name Account. Ask an administrator to configure your affiliation.')
  }
  if (contact['_parentcustomerid_value@Microsoft.Dynamics.CRM.lookuplogicalname'] !== 'account') {
    throw new Error('Your Company Name must reference an Account, not a Contact. Ask an administrator to correct your affiliation.')
  }
  const companyId = contact._parentcustomerid_value
  let company: SupplierEntity | null
  try {
    company = await fetchXmlRecord<SupplierEntity>(
      'accounts', companyId, 'accountid,name,accountcategorycode,statecode',
    )
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new Error(`Cannot access your supplier Company Name Account: ${detail}. Ask an administrator to check your assignments.`)
  }
  if (!company || typeof company.accountid !== 'string' ||
      company.accountid.toLowerCase() !== companyId.toLowerCase()) {
    throw new Error('Your Company Name Account is not accessible through your assignments. Ask an administrator to restore the company membership.')
  }
  if (company.accountcategorycode !== SUPPLIER_CATEGORY) {
    throw new Error('Your Company Name Account is not classified as Supplier. Ask an administrator to correct your affiliation.')
  }
  if (company.statecode !== ACCOUNT_STATE.Active) {
    throw new Error('Your Supplier Company Name Account is inactive. Ask an administrator to review your affiliation.')
  }
  return companyId
}
