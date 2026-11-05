import type { Booking, BookingStatus, Database, ReplacementPart, ServiceOutcome, WorkOrder, WorkOrderPurchaseOrder } from '../../data/types'
import { newId, nowIso } from '../../lib/format'

/** Mock replacement-part catalog (mirrors the "Zava Replacement Parts" product family in PPCC-FO-2026). */
export const MOCK_REPLACEMENT_PARTS: ReplacementPart[] = [
  { id: '42be841a-ac43-4222-b372-4bcd6a74db03', name: 'Zava Replacement Cooling Compressor', number: 'datZAVA-SP-COMP-200' },
  { id: 'db1eb572-fd8d-4a77-aee1-76160b7ddd15', name: 'Zava Cooling System Controller', number: 'datZAVA-SP-CTRL-200' },
  { id: 'e2c301f2-1e70-45fc-b1e0-b3afd2a5098a', name: 'Zava Replacement Air-Filter Kit', number: 'datZAVA-SP-FILTER-200' },
]

export const WO_ROUTES = {
  home: '/work-orders/',
  details: (id: string) => `/work-orders/work-order-details/?id=${encodeURIComponent(id)}`,
}

/** The status step a technician takes next from a booking status (none once on site: diagnose, then report). */
export const NEXT_STATUS: Partial<Record<BookingStatus, { action: 'travel' | 'arrive'; label: string; pendingLabel: string; to: BookingStatus }>> = {
  Scheduled: { action: 'travel', label: 'Start travel', pendingLabel: 'Updating…', to: 'Traveling' },
  Traveling: { action: 'arrive', label: "I've arrived", pendingLabel: 'Updating…', to: 'In Progress' },
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export function isToday(iso: string) {
  const d = new Date(iso)
  return !Number.isNaN(d.getTime()) && sameDay(d, new Date())
}

/** Assigned or moved in the last 24 hours (e.g. after the dispatcher applied a Scheduling Operations Agent proposal). */
export function isRecentlyAssigned(b: Booking) {
  const t = new Date(b.assignedOn).getTime()
  return !Number.isNaN(t) && Date.now() - t < 24 * 60 * 60 * 1000
}

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const day = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

/** "Today, 10:30 AM – 12:30 PM" / "Fri, Oct 24, 9:00 AM – 11:00 AM". */
export function formatVisitWindow(b?: Pick<Booking, 'start' | 'end'>) {
  if (!b?.start) return '—'
  const start = new Date(b.start)
  if (Number.isNaN(start.getTime())) return '—'
  const label = isToday(b.start) ? 'Today' : day.format(start)
  return `${label}, ${time(b.start)}${b.end ? ` – ${time(b.end)}` : ''}`
}

/** The visit to show for a work order: the technician's own live booking, otherwise the latest booking. */
export function visitBooking(db: Database, workOrderId: string, contactId?: string): Booking | undefined {
  const bookings = db.bookings.filter(b => b.workOrderId === workOrderId && b.status !== 'Canceled').sort((a, b) => b.start.localeCompare(a.start))
  return bookings.find(b => b.resourceContactId === contactId) ?? bookings[0]
}

export const workOrderPlace = (w: WorkOrder) => w.siteName ?? w.customerName

/** Purchase order number for a work order, as work-order-actions names it ("PO-WO-<work order number>"). */
export const purchaseOrderNumber = (w: WorkOrder) => `PO-${w.number.startsWith('WO-') ? w.number : `WO-${w.number}`}`

/* ------------------------------- Mock mutations (mirror work-order-actions) ------------------------------- */

function event(wo: WorkOrder, text: string, by: string) {
  wo.timeline.push({ id: newId('ev'), at: nowIso(), text, by })
}

export function mockSetStatus(d: Database, workOrderId: string, bookingId: string, to: BookingStatus, by: string) {
  const wo = d.workOrders.find(w => w.id === workOrderId)
  const booking = d.bookings.find(b => b.id === bookingId)
  if (!wo || !booking) return
  booking.status = to
  if (to === 'In Progress') booking.arrivedOn = nowIso()
  wo.systemStatus = 'In Progress'
  event(wo, to === 'Traveling' ? 'Travel started' : 'Arrived on site', by)
}

export function mockDiagnose(
  d: Database,
  workOrderId: string,
  diagnosis: { fault: string; findings: string; partRequired: boolean; partId?: string; part?: string; partNumber?: string },
  by: string,
) {
  const wo = d.workOrders.find(w => w.id === workOrderId)
  if (!wo) return
  const updated = !!wo.diagnosis
  wo.diagnosis = { ...diagnosis, recordedOn: nowIso(), recordedBy: by }
  event(wo, `${updated ? 'Diagnosis updated' : 'Diagnosis recorded'}: ${diagnosis.fault}${diagnosis.partRequired ? ' (replacement part required)' : ''}`, by)
}

/** Mirrors work-order-actions "report": a diagnosis that needs a part first raises one Draft purchase order per visit. */
export function mockReport(
  d: Database,
  workOrderId: string,
  bookingId: string,
  report: { workPerformed: string; outcome: ServiceOutcome; customerSummary: string },
  by: string,
): WorkOrderPurchaseOrder | undefined {
  const wo = d.workOrders.find(w => w.id === workOrderId)
  const booking = d.bookings.find(b => b.id === bookingId)
  if (!wo || !booking) return undefined
  if (wo.diagnosis?.partRequired && wo.diagnosis.partNumber && !wo.purchaseOrder) {
    wo.purchaseOrder = { id: newId('po'), number: purchaseOrderNumber(wo), status: 'Draft', part: wo.diagnosis.part, createdOn: nowIso() }
    event(wo, `Purchase order ${wo.purchaseOrder.number} raised for the replacement part`, 'Zava')
  }
  wo.report = { ...report, submittedOn: nowIso(), submittedBy: by }
  booking.status = 'Completed'
  // A resolved visit completes the work order; a follow-up leaves it for Zava dispatch to schedule the next visit.
  wo.systemStatus = report.outcome === 'Resolved' ? 'Completed' : 'Unscheduled'
  event(wo, `Service report submitted (${report.outcome.toLowerCase()})`, by)
  return wo.purchaseOrder
}
