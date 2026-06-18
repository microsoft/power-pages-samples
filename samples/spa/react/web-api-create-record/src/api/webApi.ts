// -----------------------------------------------------------------------------
// Power Pages Web API helper - create a Dataverse record (HTTP POST)
// -----------------------------------------------------------------------------
// This file is the entire point of the sample. It shows the two things you need
// to create a row in a Dataverse table from a Power Pages code site:
//
//   1. Fetch an anti-forgery token (required for every POST/PATCH/DELETE).
//   2. POST the record to /_api/<entity-set-name> with the OData headers and
//      the token.
//
// Docs: https://learn.microsoft.com/power-pages/configure/web-api-overview
// -----------------------------------------------------------------------------

// The entity set name is the plural logical name of the table. If you create the
// Feedback table with a different prefix, update this value to match.
export const FEEDBACK_ENTITY_SET = 'sample_feedbacks'

export interface FeedbackInput {
  // Primary name column of the Feedback table.
  sample_name: string
  // Whole-number column (1-5).
  sample_rating: number
  // Multiline-text column.
  sample_comments: string
}

/**
 * Power Pages requires an anti-forgery token on every unsafe (POST/PATCH/DELETE)
 * Web API request. The token is served as an HTML hidden input by the
 * `/_layout/tokenhtml` endpoint, so we fetch it and read the `value="..."`.
 */
async function getAntiForgeryToken(): Promise<string> {
  const response = await fetch('/_layout/tokenhtml', { method: 'GET' })

  if (!response.ok) {
    throw new Error(`Could not fetch the anti-forgery token (status ${response.status}).`)
  }

  const html = await response.text()
  const match = html.match(/value="([^"]+)"/)

  if (!match) {
    throw new Error('Anti-forgery token was not found in the response.')
  }

  return match[1]
}

/**
 * Creates a single Feedback record using the Power Pages Web API and returns the
 * GUID of the new record (read from the `OData-EntityId` response header).
 */
export async function createFeedback(input: FeedbackInput): Promise<string> {
  // Local development convenience: when you run `npm run dev` there is no Power
  // Pages runtime to call, so simulate a successful create. This block is
  // compiled out of the production build (`import.meta.env.DEV` is false there).
  if (import.meta.env.DEV) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    return crypto.randomUUID()
  }

  const token = await getAntiForgeryToken()

  const response = await fetch(`/_api/${FEEDBACK_ENTITY_SET}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      __RequestVerificationToken: token,
    },
    body: JSON.stringify(input),
  })

  if (response.status === 403) {
    throw new Error(
      'The create was blocked (HTTP 403). Add a table permission that grants ' +
        'Create on the Feedback table to the web role the visitor belongs to.',
    )
  }

  if (!response.ok) {
    throw new Error(`The Web API create failed with status ${response.status}.`)
  }

  // Dataverse returns the new record URL in the OData-EntityId header, for
  // example: https://contoso.powerappsportals.com/_api/sample_feedbacks(<guid>)
  const entityId = response.headers.get('OData-EntityId') ?? ''
  const guidMatch = entityId.match(/\(([^)]+)\)/)

  return guidMatch ? guidMatch[1] : ''
}
