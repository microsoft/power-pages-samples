import { powerPagesFetch, type ODataCollectionResponse } from './powerPagesApi'
import { SUPPLIER_CATEGORY, ACCOUNT_STATE } from '../types/supplier'

export type FetchFilter =
  | { attribute: string; operator: 'eq' | 'ne' | 'like'; value: string | number }
  | { type: 'and' | 'or'; filters: FetchFilter[] }

export const eq = (attribute: string, value: string | number): FetchFilter =>
  ({ attribute, operator: 'eq', value })
export const and = (...filters: (FetchFilter | undefined)[]): FetchFilter =>
  ({ type: 'and', filters: filters.filter((filter): filter is FetchFilter => filter !== undefined) })
export const or = (...filters: FetchFilter[]): FetchFilter => ({ type: 'or', filters })
export const contains = (attribute: string, value: string): FetchFilter =>
  ({ attribute, operator: 'like', value: `%${value.replace(/[[%_]/g, character => `[${character}]`)}%` })

const tables = {
  accounts: 'account',
  contacts: 'contact',
  spnvc_invoices: 'spnvc_invoice',
  spnvc_purchaseorders: 'spnvc_purchaseorder',
  spnvc_invoicecomments: 'spnvc_invoicecomment',
  spnvc_invoiceattachments: 'spnvc_invoiceattachment',
} as const
type EntitySet = keyof typeof tables

export const escapeXml = (value: string | number): string => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;')

const attributeName = (value: string): string => {
  const attribute = /^_(.+)_value$/.exec(value)?.[1] ?? value
  if (!/^[a-z][a-z0-9_]*$/.test(attribute)) throw new Error(`Invalid FetchXML attribute: ${value}`)
  return attribute
}
const filterXml = (filter: FetchFilter): string => 'type' in filter
  ? `<filter type="${filter.type}">${filter.filters.map(filterXml).join('')}</filter>`
  : `<condition attribute="${attributeName(filter.attribute)}" operator="${filter.operator}" value="${escapeXml(filter.value)}"/>`

interface FetchQuery {
  select: string
  filter?: FetchFilter
  orderBy?: string
  pageSize?: number
  count?: boolean
  supplierAccountOnly?: boolean
}

// OData GETs can fail when N:N/Parent permission chains inject navigation filters.
// FetchXML is the platform's supported workaround, not a substitute for table
// permissions. No client-supplied Contact ID participates in authorization.
// https://learn.microsoft.com/power-pages/configure/web-api-overview#known-issues
export function buildFetchXmlUrl(entitySet: EntitySet, query: FetchQuery): string {
  const pageSize = query.pageSize ?? 50
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 5000) {
    throw new Error('FetchXML page size must be between 1 and 5000')
  }
  const select = [...new Set(query.select.split(',').map(attributeName))]
    .map(name => `<attribute name="${name}"/>`).join('')
  const order = query.orderBy?.split(',').map(part => {
    const match = /^([a-z][a-z0-9_]*)(?: (asc|desc))?$/.exec(part.trim())
    if (!match) throw new Error(`Invalid FetchXML sort: ${part}`)
    return `<order attribute="${attributeName(match[1])}" descending="${match[2] === 'desc'}"/>`
  }).join('') ?? ''
  const xml = `<fetch count="${pageSize}" page="1" returntotalrecordcount="${query.count === true}">` +
    `<entity name="${tables[entitySet]}">${select}${order}${query.filter ? filterXml(query.filter) : ''}` +
    (query.supplierAccountOnly
      ? '<link-entity name="account" from="accountid" to="spnvc_supplieraccountid" link-type="inner">' +
        `<filter type="and"><condition attribute="accountcategorycode" operator="eq" value="${SUPPLIER_CATEGORY}"/>` +
        `<condition attribute="statecode" operator="eq" value="${ACCOUNT_STATE.Active}"/></filter></link-entity>`
      : '') + '</entity></fetch>'
  return `/_api/${entitySet}?${new URLSearchParams({ fetchXml: xml })}`
}

interface FetchResponse<T> extends ODataCollectionResponse<T> {
  '@Microsoft.Dynamics.CRM.totalrecordcount'?: number
  '@Microsoft.Dynamics.CRM.fetchxmlpagingcookie'?: string
  '@Microsoft.Dynamics.CRM.morerecords'?: boolean
}

function nextPageUrl(url: string, response: FetchResponse<unknown>): string | undefined {
  if (response['@odata.nextLink']) return response['@odata.nextLink']
  const cookie = response['@Microsoft.Dynamics.CRM.fetchxmlpagingcookie']
  if (response['@Microsoft.Dynamics.CRM.morerecords'] === false) return undefined
  if (!response['@Microsoft.Dynamics.CRM.morerecords'] && !cookie) return undefined
  if (!cookie) throw new Error('FetchXML reports more records without a paging cookie')
  // Dataverse returns an envelope such as:
  // <cookie pagenumber="2" pagingcookie="%253ccookie...%253e" istracking="False" />
  // The inner cookie is URI-encoded twice; raw XML cookies are also accepted.
  // https://learn.microsoft.com/power-apps/developer/data-platform/fetchxml/page-results
  const wrapped = /\bpagingcookie="([^"]*)"/.exec(cookie)
  const innerCookie = wrapped ? decodeURIComponent(decodeURIComponent(wrapped[1])) : cookie
  if (!innerCookie.startsWith('<cookie')) throw new Error('Invalid FetchXML paging cookie')
  const parsed = new URL(url, 'https://portal.example')
  const xml = parsed.searchParams.get('fetchXml')
  const page = xml && /\bpage="(\d+)"/.exec(xml)
  if (!xml || !page) throw new Error('Missing FetchXML page information')
  const nextXml = xml.replace(/\bpaging-cookie="[^"]*"/, '')
    .replace(/\bpage="\d+"/, `page="${Number(page[1]) + 1}"`)
    .replace('<fetch ', `<fetch paging-cookie="${escapeXml(innerCookie)}" `)
  parsed.searchParams.set('fetchXml', nextXml)
  return `${parsed.pathname}?${parsed.searchParams}`
}

export async function fetchXmlCollection<T>(url: string): Promise<ODataCollectionResponse<T>> {
  const response = await powerPagesFetch<FetchResponse<T>>(url, {
    headers: {
      Prefer: 'odata.include-annotations="OData.Community.Display.V1.FormattedValue,Microsoft.Dynamics.CRM.totalrecordcount,Microsoft.Dynamics.CRM.fetchxmlpagingcookie,Microsoft.Dynamics.CRM.morerecords"',
    },
  })
  if (!response || !Array.isArray(response.value)) throw new Error('Missing FetchXML collection response')
  const count = response['@odata.count'] ?? response['@Microsoft.Dynamics.CRM.totalrecordcount']
  return {
    value: response.value,
    '@odata.count': count !== undefined && count >= 0 ? count : undefined,
    '@odata.nextLink': nextPageUrl(url, response),
  }
}

export async function fetchXmlRecord<T>(entitySet: EntitySet, id: string, select: string): Promise<T | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('Record ID must be a GUID')
  }
  const url = buildFetchXmlUrl(entitySet, {
    select, filter: eq(`${tables[entitySet]}id`, id), pageSize: 1,
  })
  const response = await fetchXmlCollection<T>(url)
  return response.value[0] ?? null
}

export async function fetchAllXmlPages<T>(initialUrl: string): Promise<T[]> {
  const records: T[] = []
  let url: string | undefined = initialUrl
  for (let page = 0; url && page < 100; page++) {
    const response: ODataCollectionResponse<T> = await fetchXmlCollection<T>(url)
    records.push(...response.value)
    url = response['@odata.nextLink']
  }
  if (url) throw new Error('FetchXML pagination exceeded 100 pages')
  return records
}
