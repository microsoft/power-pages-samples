// src/services/cloudFlowService.ts
// Power Pages cloud-flow triggers. Each function wraps a single flow registered
// via its `.cloudflowconsumer.yml` under `.powerpages-site/cloud-flow-consumer/`.
//
// Endpoint shape: POST /_api/cloudflow/v1.0/trigger/<workflowEntityId>
// Payload shape:  { eventData: "<stringified JSON of the caller's payload>" }
//
// This endpoint is NOT OData — do not route it through the Dataverse OData
// wrapper (`powerPagesFetch`). We use raw `fetch` here and only reuse the
// shared `getCsrfToken` helper so token parsing lives in one place.

import { getCsrfToken } from './powerPagesApi'

// -- Error class --------------------------------------------------------------

export class CloudFlowError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'CloudFlowError'
    this.status = status
  }
}

// -- Core invoker -------------------------------------------------------------

async function invokeFlow<T = unknown>(
  flowId: string,
  payload: Record<string, unknown> = {},
): Promise<T | null> {
  const token = await getCsrfToken()
  const response = await fetch(`/_api/cloudflow/v1.0/trigger/${flowId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      __RequestVerificationToken: token,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({ eventData: JSON.stringify(payload) }),
  })

  if (!response.ok) {
    throw new CloudFlowError(
      `Cloud flow trigger failed: ${response.status} ${response.statusText}`,
      response.status,
    )
  }
  // 202 Accepted = fire-and-forget (no Response action); 200 OK = flow returned a body
  if (response.status === 202) return null
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

// -- Flows --------------------------------------------------------------------

export interface SendEmailNotificationPayload {
  InvoiceNumber: string
  InvoiceId: string
  ReviewerEmail: string
  SupplierName: string
  DaysPending: number
}

/**
 * Trigger: PowerPages -> Send an email notification (V3)
 * API: /_api/cloudflow/v1.0/trigger/76282bdc-a03c-f111-88b4-6045bd06f200
 *
 * Used to send a reminder email to the reviewer assigned to a non-approved
 * invoice. Gated to the Supplier web role via the `.cloudflowconsumer.yml`.
 */
export async function sendEmailNotification(
  payload: SendEmailNotificationPayload,
): Promise<unknown> {
  return invokeFlow('76282bdc-a03c-f111-88b4-6045bd06f200', { ...payload })
}
