// src/services/serverLogicApi.ts
// Thin client for Power Pages Server Logic endpoints (/_api/serverlogics/<name>).
// Server Logic runs server-side and is protected by web roles and table
// permissions rather than the client Web API's field-permission model, so it's
// used here for protected FetchXML aggregate queries (see dashboard-aggregates.js).

import { isGuid, powerPagesFetch, PowerPagesApiError } from './powerPagesApi'
import choices from '../../dataverse-choice-values.json'

interface ServerLogicEnvelope {
  data: string | null
  success: boolean
  error: string | null
}

type CreatePersistence = 'not_attempted' | 'rejected' | 'unknown' | 'created_unverified'
class ServerLogicApiError extends PowerPagesApiError {
  constructor(message: string, status: number, code: string | undefined, innerCode: string | undefined,
    readonly persistence?: CreatePersistence) {
    super(message, status, code, { innerCode })
  }
}

/**
 * Calls a Power Pages Server Logic endpoint and unwraps its response envelope.
 * `T` is the shape the server logic itself returns (already JSON-parsed once);
 * see the individual server logic .js file for its exact response shape.
 */
export async function callServerLogic<T = unknown>(
  endpointName: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  params?: Record<string, string>,
  body?: unknown,
): Promise<T> {
  const url = params
    ? `/_api/serverlogics/${endpointName}?${new URLSearchParams(params)}`
    : `/_api/serverlogics/${endpointName}`

  const envelope = await powerPagesFetch<ServerLogicEnvelope>(url, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    // An RPC can perform work before its hosting layer rejects the response.
    // Never replay a mutating handler, including on a 90040107 envelope.
    retryAntiForgery: method === 'GET',
  })

  if (!envelope) {
    throw new Error(`Empty response from server logic '${endpointName}'`)
  }
  if (!envelope.success) {
    throw new Error(envelope.error ?? `Server logic '${endpointName}' call failed`)
  }
  if (envelope.data == null) {
    throw new Error(`Missing response data from server logic '${endpointName}'`)
  }

  const result: unknown = JSON.parse(envelope.data)
  if (result && typeof result === 'object' && 'status' in result && result.status === 'error') {
    const message = 'message' in result && typeof result.message === 'string'
      ? result.message : `Server logic '${endpointName}' failed`
    const status = 'httpStatus' in result && typeof result.httpStatus === 'number' &&
      Number.isInteger(result.httpStatus) && result.httpStatus >= 400 && result.httpStatus <= 599
      ? result.httpStatus : 500
    const code = 'code' in result && typeof result.code === 'string' ? result.code : undefined
    const innerCode = 'innerCode' in result && typeof result.innerCode === 'string' ? result.innerCode : undefined
    const persistence = 'persistence' in result &&
      (result.persistence === 'not_attempted' || result.persistence === 'rejected' ||
       result.persistence === 'unknown' || result.persistence === 'created_unverified')
      ? result.persistence : undefined
    throw new ServerLogicApiError(message, status, code, innerCode, persistence)
  }
  return result as T
}

export async function createBusinessRecord<T extends Record<string, unknown>>(
  endpoint: 'submit-invoice' | 'create-purchase-order',
  body: unknown,
): Promise<T> {
  let response: { record: T }
  try {
    response = await callServerLogic<{ record: T }>(endpoint, 'POST', undefined, body)
  } catch (error) {
    if (error instanceof ServerLogicApiError && error.persistence) throw error
    throw new PowerPagesApiError(
      'The create outcome could not be verified. Check existing records before submitting again.',
      error instanceof PowerPagesApiError ? error.status : 502,
      error instanceof PowerPagesApiError ? error.code : undefined,
      error instanceof PowerPagesApiError ? error.details : undefined,
    )
  }
  const record = response?.record
  const invoice = endpoint === 'submit-invoice'
  const primary = invoice ? 'spnvc_invoiceid' : 'spnvc_purchaseorderid'
  const amount = record?.[invoice ? 'spnvc_amount' : 'spnvc_totalamount']
  const status = record?.[invoice ? 'spnvc_invoicestatus' : 'spnvc_postatus']
  const statuses = Object.values(invoice
    ? choices.tables.spnvc_invoice.spnvc_invoicestatus
    : choices.tables.spnvc_purchaseorder.spnvc_postatus)
  if (!record || typeof record !== 'object' || Array.isArray(record) || !isGuid(record[primary]) ||
      typeof record.spnvc_name !== 'string' || !record.spnvc_name.trim() ||
      typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 ||
      typeof status !== 'number' || !statuses.includes(status) ||
      !isGuid(record._spnvc_supplieraccountid_value) ||
      (invoice && (!isGuid(record._spnvc_contactid_value) || !isGuid(record._spnvc_purchaseorderid_value)))) {
    throw new Error('The create response could not verify persistence. Check existing records before submitting again.')
  }
  return record
}

export async function verifyCreatePreflight(
  endpoint: 'submit-invoice' | 'create-purchase-order', selectedId: string,
): Promise<void> {
  if (!isGuid(selectedId)) throw new Error('Select a valid related record.')
  const field = endpoint === 'submit-invoice' ? 'purchaseOrderId' : 'supplierId'
  const response = await callServerLogic<{ ready: boolean; creationVerified: boolean }>(endpoint, 'GET', { [field]: selectedId })
  if (response?.ready !== true || response.creationVerified !== false) {
    throw new Error('Create prerequisites could not be verified.')
  }
}
