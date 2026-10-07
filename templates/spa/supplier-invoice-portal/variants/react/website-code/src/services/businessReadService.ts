import {
  collectionCount, fetchODataRecord, PowerPagesApiError, serializeODataFilter,
  type ODataCollectionResponse, type ODataQuery,
} from './powerPagesApi'
import { callServerLogic } from './serverLogicApi'

export type BusinessReadTable =
  | 'spnvc_invoices'
  | 'spnvc_purchaseorders'
  | 'spnvc_invoicecomments'
  | 'spnvc_invoiceattachments'
const ENDPOINT = 'invoice-po-reads'
const PATH = `/_api/serverlogics/${ENDPOINT}`

function readCursor(url: string, table: BusinessReadTable): URLSearchParams {
  const origin = typeof window !== 'undefined' ? window.location?.origin : undefined
  const base = origin ?? 'https://portal.example'
  const parsed = new URL(url, base)
  if (parsed.origin !== base || parsed.username || parsed.password || parsed.hash ||
      (!origin && !url.startsWith(`${PATH}?`)) || parsed.pathname !== PATH ||
      parsed.searchParams.get('table') !== table || parsed.searchParams.has('fetchXml') ||
      parsed.searchParams.get('mode') === 'record') {
    throw new Error('Invalid or cross-origin business read cursor')
  }
  return parsed.searchParams
}

function queryParameters(table: BusinessReadTable, query: ODataQuery, pageSize: number): Record<string, string> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 5000) {
    throw new Error('Business read page size must be between 1 and 5000')
  }
  if (query.top !== undefined && (!Number.isInteger(query.top) || query.top < 1 || query.top > 5000)) {
    throw new Error('Business read limit must be between 1 and 5000')
  }
  // Validate typed literals before serialization; the server independently checks
  // fields/operators and never trusts filters or record IDs as authorization.
  serializeODataFilter(query.filter)
  return {
    table,
    select: query.select,
    pageSize: String(pageSize),
    ...(query.filter ? { filter: JSON.stringify(query.filter) } : {}),
    ...(query.orderBy ? { orderBy: query.orderBy } : {}),
    ...(query.top ? { pageSize: String(query.top) } : {}),
  }
}

// The shipped N:N/Parent scopes reproduce the platform's OData relationship
// compiler failure. Only the affected business tables and invoice children use
// this fixed server contract.
// The connector still enforces the current portal caller's table permissions.
// https://learn.microsoft.com/power-pages/configure/web-api-overview#known-issues
export async function fetchBusinessCollection<T>(
  table: BusinessReadTable, query: ODataQuery, pageSize: number, nextLink?: string,
): Promise<ODataCollectionResponse<T>> {
  const params = nextLink
    ? Object.fromEntries(readCursor(nextLink, table))
    : queryParameters(table, query, pageSize)
  const response = await callServerLogic<{ result: ODataCollectionResponse<T> }>(ENDPOINT, 'GET', params)
  const result = response.result
  if (!result || !Array.isArray(result.value)) throw new Error('Missing business read collection response')
  collectionCount(result)
  if (result['@odata.nextLink']) {
    const cursor = readCursor(result['@odata.nextLink'], table)
    result['@odata.nextLink'] = `${PATH}?${cursor}`
  }
  return result
}

export function isRelationshipQueryError(error: unknown): boolean {
  return error instanceof PowerPagesApiError && error.status === 400 &&
    error.code?.toLowerCase() === '9004010d' &&
    error.details?.innerCode?.toLowerCase() === '0x80040216' &&
    error.details.innerMessage === 'entityRelationshipRole for given navigation property not found'
}

export async function fetchBusinessRecord<T>(
  table: BusinessReadTable, id: string, select: string,
): Promise<T | null> {
  try {
    return await fetchODataRecord<T>(table, id, select)
  } catch (error) {
    if (!isRelationshipQueryError(error)) throw error
    const response = await callServerLogic<{ record: T | null }>(ENDPOINT, 'GET', {
      table, mode: 'record', id, select,
    })
    if (!('record' in response) || (response.record !== null &&
        (typeof response.record !== 'object' || Array.isArray(response.record)))) {
      throw new Error('Missing business read record response')
    }
    return response.record
  }
}
