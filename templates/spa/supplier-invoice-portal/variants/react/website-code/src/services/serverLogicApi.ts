// src/services/serverLogicApi.ts
// Thin client for Power Pages Server Logic endpoints (/_api/serverlogics/<name>).
// Server Logic runs server-side and is protected by web roles and table
// permissions rather than the client Web API's field-permission model, so it's
// used here for the $apply aggregate/groupby queries the client Web API can't
// run (see dashboard-aggregates.js for why).

import { powerPagesFetch } from './powerPagesApi'

interface ServerLogicEnvelope {
  data: string | null
  success: boolean
  error: string | null
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

  return JSON.parse(envelope.data) as T
}
