// ---------------------------------------------------------------------------
// cloudFlowClient.ts — THE LESSON OF THIS SAMPLE
//
// This is the entire recipe for calling a Power Automate cloud flow from a
// Power Pages code site. Everything else in this app is just UI around it.
//
// A registered cloud flow is invoked with a single HTTP request:
//
//     POST [Site URL]/_api/cloudflow/v1.0/trigger/<flowId>
//     Header: __RequestVerificationToken: <CSRF token>
//     Body:   JSON whose keys match the flow trigger's input parameter names
//
// Notes from the docs (https://learn.microsoft.com/power-pages/configure/cloud-flow-integration):
//   - You do NOT send an auth token — the site session handles authentication.
//   - You MUST send the cross-site request forgery (CSRF) token on every call.
//   - Request body keys must match the input parameter names defined on the
//     "When Power Pages calls a flow" trigger, exactly.
//   - If the flow ends with a "Respond to Power Pages" action, the response
//     body is JSON. Without it, the call returns 202 Accepted and no body.
// ---------------------------------------------------------------------------

import { FLOW_ID } from './config'

// The shape we ask the flow to return. Match this to your flow's
// "Respond to Power Pages" outputs.
export interface CallbackResponse {
  ticketNumber: string
  message: string
  estimatedCallback: string
}

// The inputs we send. Keys MUST match the flow trigger's input parameters.
export interface CallbackRequest {
  name: string
  topic: string
}

// Running `npm run dev` locally has no Power Pages runtime, so we short-circuit
// to a mocked response. On a deployed site this is false and the real call runs.
const isDevelopment =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1')

/**
 * Fetch the anti-forgery (CSRF) token that Power Pages requires on every
 * write request. `/_layout/tokenhtml` returns a small HTML fragment with the
 * token in an input's `value` attribute.
 */
async function getCsrfToken(): Promise<string> {
  const response = await fetch('/_layout/tokenhtml', { credentials: 'same-origin' })
  if (!response.ok) {
    throw new Error(`Could not fetch CSRF token (status ${response.status}).`)
  }
  const html = await response.text()
  const match = html.match(/value="([^"]+)"/)
  if (!match) {
    throw new Error('Could not parse CSRF token from /_layout/tokenhtml.')
  }
  return match[1]
}

/**
 * Invoke the registered cloud flow with the given inputs and return its
 * JSON response.
 */
export async function requestCallback(input: CallbackRequest): Promise<CallbackResponse> {
  // --- Local dev: return a fake response so the UI is testable offline. ---
  if (isDevelopment) {
    await new Promise(resolve => setTimeout(resolve, 800))
    return {
      ticketNumber: 'CB-DEV-1024',
      message: `Thanks ${input.name}! A specialist will call you about "${input.topic}".`,
      estimatedCallback: 'within 2 business hours (mocked locally)',
    }
  }

  // --- Real site: CSRF token, then POST to the cloud flow trigger. ---
  const token = await getCsrfToken()

  const response = await fetch(`/_api/cloudflow/v1.0/trigger/${FLOW_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // The CSRF token is what makes this an authenticated, allowed call.
      __RequestVerificationToken: token,
    },
    // Keys here must match the flow trigger's input parameter names.
    body: JSON.stringify({
      name: input.name,
      topic: input.topic,
    }),
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error(
      `Flow call failed (status ${response.status}). ` +
        'Check that the flow is registered on this site and your web role has access to it.',
    )
  }

  // A flow that ends with "Respond to Power Pages" returns JSON; one without
  // it returns 202 Accepted and an empty body.
  const text = await response.text()
  if (!text) {
    throw new Error(
      'The flow returned no content. Add a "Respond to Power Pages" action to return data.',
    )
  }
  return JSON.parse(text) as CallbackResponse
}
