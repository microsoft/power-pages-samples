// Technician workspace (Partner Technician web role) – live data access. Everything goes through two Server Logic
// endpoints bound to that role only; they run in the caller's table-permission context and return a safe
// projection (no pricing, no customer account/contact records).
import {
  SERVICE_OUTCOMES,
  type Booking,
  type BookingStatus,
  type ReplacementPart,
  type ServiceOutcome,
  type WorkOrder,
  type WorkOrderPurchaseOrder,
  type WorkOrderStatus,
} from '../data/types'
import { serverLogic, serverLogicPost } from './http'
import type { CachePatch } from './loaders'

type Dto = Record<string, unknown>

const BOOKING_STATUSES: BookingStatus[] = ['Scheduled', 'Traveling', 'In Progress', 'On Break', 'Completed', 'Canceled']
const WORK_ORDER_STATUSES: WorkOrderStatus[] = ['Unscheduled', 'Scheduled', 'In Progress', 'Completed', 'Posted', 'Canceled']

const str = (v: unknown) => (typeof v === 'string' && v ? v : undefined)
const oneOf = <T extends string>(v: unknown, values: readonly T[], fallback: T): T => (values.includes(v as T) ? (v as T) : fallback)

export function toWorkOrder(d: Dto): WorkOrder {
  const address = (d.address ?? {}) as WorkOrder['address']
  const diagnosis = d.diagnosis as Dto | undefined
  const report = d.report as Dto | undefined
  const purchaseOrder = d.purchaseOrder as Dto | undefined
  const asset = d.asset as Dto | undefined
  const contact = d.siteContact as Dto | undefined
  return {
    id: String(d.id),
    number: str(d.number) ?? '—',
    title: str(d.title) ?? 'Work order',
    customerName: str(d.customerName) ?? '—',
    siteName: str(d.siteName),
    address,
    siteContact: contact && str(contact.name) ? { name: String(contact.name), phone: str(contact.phone) } : undefined,
    priority: str(d.priority) ?? 'Normal',
    type: str(d.type) ?? '—',
    incidentType: str(d.incidentType) ?? '—',
    caseNumber: str(d.caseNumber),
    caseTitle: str(d.caseTitle),
    asset:
      asset && str(asset.name)
        ? { name: String(asset.name), model: str(asset.model), serialNumber: str(asset.serialNumber), location: str(asset.location) }
        : undefined,
    instructions: str(d.instructions),
    servicePartnerId: str(d.servicePartnerId),
    systemStatus: oneOf(d.systemStatus, WORK_ORDER_STATUSES, 'Scheduled'),
    diagnosis: diagnosis
      ? {
          fault: str(diagnosis.fault) ?? '—',
          findings: str(diagnosis.findings) ?? '',
          partRequired: diagnosis.partRequired === true,
          part: str(diagnosis.part),
          partNumber: str(diagnosis.partNumber),
          recordedOn: str(diagnosis.recordedOn) ?? '',
          recordedBy: str(diagnosis.recordedBy) ?? '',
        }
      : undefined,
    report: report
      ? {
          workPerformed: str(report.workPerformed) ?? '',
          outcome: oneOf(report.outcome, SERVICE_OUTCOMES, 'Resolved'),
          customerSummary: str(report.customerSummary) ?? '',
          submittedOn: str(report.submittedOn) ?? '',
          submittedBy: str(report.submittedBy) ?? '',
        }
      : undefined,
    purchaseOrder: purchaseOrder && str(purchaseOrder.number) ? toPurchaseOrder(purchaseOrder) : undefined,
    timeline: Array.isArray(d.timeline)
      ? (d.timeline as Dto[]).map((e, i) => ({ id: str(e.id) ?? `${d.id}-ev-${i}`, at: str(e.at) ?? '', text: str(e.text) ?? '', by: str(e.by) }))
      : [],
    createdOn: str(d.createdOn) ?? '',
  }
}

function toPurchaseOrder(d: Dto): WorkOrderPurchaseOrder {
  return { id: String(d.id), number: String(d.number), status: str(d.status) ?? 'Draft', part: str(d.part), createdOn: str(d.createdOn) ?? '' }
}

export function toBooking(d: Dto): Booking {
  return {
    id: String(d.id),
    workOrderId: String(d.workOrderId),
    resourceContactId: str(d.resourceContactId),
    resourceName: str(d.resourceName) ?? '—',
    status: oneOf(d.status, BOOKING_STATUSES, 'Scheduled'),
    start: str(d.start) ?? '',
    end: str(d.end) ?? '',
    arrivedOn: str(d.arrivedOn),
    assignedOn: str(d.assignedOn) ?? str(d.start) ?? '',
  }
}

interface WorkOrderResponse {
  status: string
  workOrders?: Dto[]
  bookings?: Dto[]
  parts?: Dto[]
}

/** All work orders visible to the signed-in technician (theirs + their partner organization's). */
export async function loadTechnicianWorkOrders(signal?: AbortSignal): Promise<CachePatch> {
  const res = await serverLogic<WorkOrderResponse>('technician-work-orders', {}, signal)
  return {
    workOrders: (res.workOrders ?? []).map(toWorkOrder),
    bookings: (res.bookings ?? []).map(toBooking),
    // The list is authoritative: drop anything the technician can no longer see (e.g. reassigned visits).
    replace: { workOrders: () => true, bookings: () => true },
  }
}

/**
 * One work order with its bookings; `found` is false when it doesn't exist or isn't visible to the caller. `parts` is
 * the replacement-part catalog for the diagnosis picker.
 */
export async function loadTechnicianWorkOrder(id: string, signal?: AbortSignal): Promise<{ patch: CachePatch; found: boolean; parts: ReplacementPart[] }> {
  const res = await serverLogic<WorkOrderResponse>('technician-work-orders', { id }, signal)
  const workOrders = (res.workOrders ?? []).map(toWorkOrder)
  return {
    found: workOrders.some(w => w.id === id),
    patch: { workOrders, bookings: (res.bookings ?? []).map(toBooking), replace: { bookings: b => b.workOrderId === id } },
    parts: (res.parts ?? []).filter(p => str(p.id) && str(p.name)).map(p => ({ id: String(p.id), name: String(p.name), number: str(p.number) })),
  }
}

export type WorkOrderAction =
  | { action: 'travel' | 'arrive'; workOrderId: string; bookingId: string }
  | { action: 'diagnose'; workOrderId: string; bookingId: string; fault: string; findings: string; partRequired: boolean; partId?: string }
  | { action: 'report'; workOrderId: string; bookingId: string; workPerformed: string; outcome: ServiceOutcome; customerSummary: string }

/**
 * Validated technician write; the server re-checks that the booking belongs to the caller. A service report for a
 * diagnosis that needs a replacement part also returns the purchase order raised for it.
 */
export async function workOrderAction(input: WorkOrderAction): Promise<{ status: string; purchaseOrder?: { number: string; part?: string } }> {
  const res = await serverLogicPost<{ status: string; purchaseOrder?: Dto }>('work-order-actions', input)
  const po = res.purchaseOrder
  return { status: res.status, purchaseOrder: po && str(po.number) ? { number: String(po.number), part: str(po.part) } : undefined }
}
