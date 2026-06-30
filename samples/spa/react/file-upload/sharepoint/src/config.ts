// ---------------------------------------------------------------------------
// config.ts
//
// SERVER_LOGIC_NAME is the resource name of the server logic the SPA calls:
//   /_api/serverlogics/<SERVER_LOGIC_NAME>
// It must match the name you give the server logic in the design studio
// (Set up -> Server logic). See README and server-logic/sharepointDocuments.js.
// ---------------------------------------------------------------------------
export const SERVER_LOGIC_NAME = 'sharepointdocuments'

export const config = {
  /**
   * Client-side guards. Because server logic's HttpClient only accepts text
   * content types (no application/octet-stream), this sample handles **text-based
   * documents** — they upload as real, usable SharePoint files. Binary types
   * (PDF/PNG) are a known limitation of this transport (see README).
   */
  maxFileBytes: 5 * 1024 * 1024,
  allowedTypes: [
    'text/plain',
    'text/csv',
    'application/json',
    'text/markdown',
    'text/html',
    'application/xml',
    'text/xml',
  ],
  allowedExtensions: ['.txt', '.csv', '.json', '.md', '.html', '.xml'],
} as const
