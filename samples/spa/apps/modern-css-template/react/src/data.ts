export type CaseStatus = 'action' | 'progress' | 'resolved' | 'cancelled' | 'draft'
export type TimelineEntry = { title: string; body: string; date: string; author: string; kind: 'action' | 'message' }
export type SupportCase = {
  id: string; title: string; status: CaseStatus; statusLabel?: string; statusNote?: string; summary: string; nextStep: string
  owner: string; opened: string; updated: string; target?: string; original: string; timeline: TimelineEntry[]; number?: string
}
export type Article = {
  id: string; title: string; category: 'equipment' | 'events' | 'account' | 'general'
  label: string; description: string; keywords: string; minutes: number
  applies: string[]; symptoms: string[]; steps: string[]; notes: string[]; escalation: string; content?: string; number?: string
}
export const statusLabels: Record<CaseStatus, string> = {
  action: 'Action needed', progress: 'Support is investigating', resolved: 'Resolved', cancelled: 'Cancelled', draft: 'Local draft',
}
// SAMPLE CONTENT - replace before launch: customer, coverage and equipment are demonstration records from the supplied HTML.
export const initialProfile = {
  name: 'Mona Kane', phone: '+1 206 555 0184', email: 'mona.kane@example.com',
  address: '1250 Westlake Avenue, Seattle, WA 98109', timezone: 'America/Los_Angeles', channel: 'Chat',
}
// SAMPLE CONTENT - replace before launch: case history, dates, owners and response expectations are not live support data.
export const initialCases: SupportCase[] = [
  {
    id: 'CAS-01000-M8J4J8', title: 'Name change for Seattle event ticket', status: 'action',
    summary: 'Support is waiting for your identity document. Verification can continue after the requested evidence is received.',
    nextStep: 'Review the requested identity evidence', owner: 'Event Support',
    opened: '2026-10-10T16:20:00-07:00', updated: '2026-10-12T10:32:00-07:00', target: '2026-10-15T17:00:00-07:00',
    original: 'I recently changed my legal name from Mona Lopez to Mona Kane. Please update my Partner Summit ticket for the Seattle event.',
    timeline: [
      { title: 'Identity document requested', body: 'Use an approved secure channel to provide the evidence. Do not share real identity documents in this demonstration.', date: '2026-10-12T10:32:00-07:00', author: 'Northwind Support', kind: 'action' },
      { title: 'Booking details verified', body: 'The booking and requested name change were matched to this sample account.', date: '2026-10-12T09:48:00-07:00', author: 'Event Support', kind: 'action' },
      { title: 'Request details added', body: 'I recently changed my legal name and need my Seattle ticket updated.', date: '2026-10-10T16:21:00-07:00', author: 'You', kind: 'message' },
      { title: 'Case created', body: 'The request was routed to the event support team.', date: '2026-10-10T16:20:00-07:00', author: 'System', kind: 'action' },
    ],
  },
  {
    id: 'CAS-01001-S9D5F3', title: 'Edge Gateway 500 offline after firmware update', status: 'progress',
    summary: 'A patched firmware build is in final testing. Support will post installation guidance after validation.',
    nextStep: 'No action is required from you', owner: 'Equipment Support',
    opened: '2026-10-09T09:00:00-07:00', updated: '2026-10-12T12:00:00-07:00', target: '2026-10-16T17:00:00-07:00',
    original: 'My Edge Gateway 500 stopped reporting after a firmware update. The sensors are registered but readings are not arriving.',
    timeline: [
      { title: 'Patched firmware in testing', body: 'The equipment team is validating a proposed fix. No installation is required yet.', date: '2026-10-12T12:00:00-07:00', author: 'Equipment Support', kind: 'action' },
      { title: 'Diagnostic details reviewed', body: 'The reporting interruption was reproduced in the sample investigation.', date: '2026-10-11T14:00:00-07:00', author: 'Equipment Support', kind: 'action' },
      { title: 'Reporting interruption described', body: 'The gateway went offline after its update.', date: '2026-10-09T09:00:00-07:00', author: 'You', kind: 'message' },
    ],
  },
  {
    id: 'CAS-00982-R4T7X1', title: 'Replacement sensor delivery', status: 'resolved',
    summary: 'Your replacement Climate Sensor Array was delivered and activated successfully.',
    nextStep: 'Replacement delivered and verified', owner: 'Fulfillment Support',
    opened: '2026-09-28T11:00:00-07:00', updated: '2026-10-02T10:00:00-07:00',
    original: 'Please arrange a replacement for the registered Climate Sensor Array.',
    timeline: [
      { title: 'Resolution confirmed', body: 'Replacement delivery and activation were confirmed. This sample case is closed.', date: '2026-10-02T10:00:00-07:00', author: 'Fulfillment Support', kind: 'action' },
      { title: 'Replacement dispatched', body: 'A replacement sensor was prepared for the registered address.', date: '2026-09-30T09:00:00-07:00', author: 'Fulfillment Support', kind: 'action' },
      { title: 'Replacement requested', body: 'The original replacement request was received.', date: '2026-09-28T11:00:00-07:00', author: 'You', kind: 'message' },
    ],
  },
]
// SAMPLE CONTENT - replace before launch: all six knowledge articles require approved product and policy review.
export const articles: Article[] = [
  { id: 'KA-0182', title: 'Understand Edge Gateway status lights', category: 'equipment', label: 'Equipment', minutes: 4,
    description: 'Interpret steady, blinking, amber, red and unlit gateway states before contacting support.',
    keywords: 'gateway device status lights led color colour amber red teal connection troubleshooting',
    applies: ['Edge Gateway 500', 'Hardware revisions B-D'],
    symptoms: ['Steady teal: connected and reporting normally.', 'Blinking teal: queued data is synchronizing.', 'Amber: network or maintenance attention may be needed.', 'Red or unlit: power or hardware review may be needed.'],
    steps: ['Record the light color and whether it is steady or blinking.', 'Compare the observation with approved documentation for your exact model.', 'Check maintenance notices and contact support if the status is unexpected.'],
    notes: ['Demonstration guidance only; indicator meanings vary by product.', 'Do not reset, disassemble or repeatedly power-cycle equipment based on this sample.'],
    escalation: 'Contact the equipment team for an unexpected persistent status or signs of damage.' },
  { id: 'KA-0214', title: 'Restore sensor reporting after an update', category: 'equipment', label: 'Equipment', minutes: 6,
    description: 'Review connectivity and post-update synchronization before requesting diagnostics.',
    keywords: 'sensor readings reporting firmware update sync connection gateway offline',
    applies: ['Edge Gateway 500', 'Climate Sensor Array'],
    symptoms: ['Gateway appears online but readings are stale.', 'Reporting stopped after an update.'],
    steps: ['Review the update and maintenance notices for your device.', 'Record the last successful reading and affected sensor identifiers.', 'Check whether a related case already exists.', 'Share your observations with support through an approved channel.'],
    notes: ['Do not remove, re-pair or factory-reset sensors based on this demonstration.', 'Follow approved product procedures for operational troubleshooting.'],
    escalation: 'Contact support when reporting does not resume within your documented reporting interval.' },
  { id: 'KA-0341', title: 'Change the name on an event ticket', category: 'events', label: 'Events & bookings', minutes: 3,
    description: 'Prepare the booking details required for an attendee-name update.',
    keywords: 'name change ticket booking identity passport event summit attendee seattle',
    applies: ['Northwind event tickets', 'Partner Summit bookings'],
    symptoms: ['Your ticket name no longer matches your booking details.', 'An existing case requests more information.'],
    steps: ['Locate your booking reference and event date.', 'Check My cases for an existing request.', 'Review the specific evidence requested by the support team.', 'Provide evidence only through an approved secure channel.', 'Wait for written confirmation before assuming the change is complete.'],
    notes: ['Do not create a duplicate case.', 'Never enter real identity evidence into this demonstration.'],
    escalation: 'Contact support if your event is approaching or you cannot supply the requested evidence.' },
  { id: 'KA-0408', title: 'What Business Care includes', category: 'account', label: 'Account & billing', minutes: 4,
    description: 'Understand coverage, response targets, escalation and proactive monitoring.',
    keywords: 'business care coverage warranty response target entitlement escalation support plan',
    applies: ['Business Care customers'], symptoms: ['You want to understand coverage or response expectations.'],
    steps: ['Open Account & support and review coverage.', 'Check the stated response target and remaining case allowance.', 'Review equipment warranties.', 'Contact support when the displayed coverage differs from your agreement.'],
    notes: ['A response target is not a guaranteed resolution time.', 'The plan and allowance in this sample are not contractual entitlements.'],
    escalation: 'Contact support for a coverage discrepancy or overdue response.' },
  { id: 'KA-0430', title: 'Resolve an invoice or duplicate-charge question', category: 'account', label: 'Account & billing', minutes: 5,
    description: 'Gather invoice and payment references so support can review a billing question.',
    keywords: 'invoice billing duplicate charge charged payment refund receipt',
    applies: ['Northwind invoices', 'Account billing'],
    symptoms: ['A charge appears twice.', 'An invoice differs from your service confirmation.'],
    steps: ['Locate the invoice number and payment date.', 'Compare the amount with the order confirmation.', 'Check for an existing billing case.', 'Prepare a message with the reference and discrepancy.'],
    notes: ['Never share a full payment-card number or security code.', 'This demonstration does not process payments or refunds.'],
    escalation: 'Contact a billing specialist if you cannot reconcile the charge.' },
  { id: 'KA-0362', title: 'Manage a Partner Summit booking', category: 'events', label: 'Events & bookings', minutes: 4,
    description: 'Review confirmation, transfer and attendee-support options.',
    keywords: 'partner summit booking confirmation transfer event attendee',
    applies: ['Partner Summit bookings'],
    symptoms: ['You need a booking confirmation.', 'An attendee or event detail needs review.'],
    steps: ['Find the booking reference.', 'Review event dates and attendee information.', 'Read the booking terms before requesting a change.', 'Check for an existing request or prepare a support message.'],
    notes: ['Transfers depend on the booking terms.', 'A requested change is not approved until confirmation arrives.'],
    escalation: 'Contact support if confirmation is missing or you need help before the event.' },
]
export const formatDate = (value: string, withTime = false) => new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' as const } : {}), timeZone: 'America/Los_Angeles',
}).format(new Date(value))
export const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value)
export type SearchResult = { id: string; title: string; kind: 'Case' | 'Article'; meta: string; path: string; score: number }
export function searchSupport(query: string, cases: SupportCase[], knowledge: Article[] = articles): SearchResult[] {
  const tokens = query.trim().toLocaleLowerCase('en-US').split(/\s+/).filter(token => token.length > 1)
  if (!tokens.length) return []
  const records = [
    ...cases.map(item => ({ id: item.id, title: item.title, kind: 'Case' as const, meta: item.statusLabel ?? statusLabels[item.status], path: `/cases/${item.id}`, text: `${item.id} ${item.title} ${item.summary} ${item.original}` })),
    ...knowledge.map(item => ({ id: item.id, title: item.title, kind: 'Article' as const, meta: item.label, path: `/articles/${item.id}`, text: `${item.id} ${item.title} ${item.keywords}` })),
  ]
  return records.map(({ text, ...item }) => ({ ...item, score: tokens.reduce((score, token) => score + (text.toLocaleLowerCase('en-US').includes(token) ? 1 : 0), 0) }))
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, 6)
}
