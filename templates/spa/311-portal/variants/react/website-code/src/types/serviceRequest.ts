// src/types/serviceRequest.ts
// TypeScript types for the spa311_servicerequest Dataverse table.
//
// NOTE: Column logical names are from the data model manifest. API metadata
// verification was not available at generation time -- names may need correction
// if Dataverse auto-generated different logical names.
// Navigation property names (spa311_ServiceTypeId, spa311_CategoryId, spa311_ContactId)
// are assumed PascalCase per convention.

import { getFormattedValue } from '../shared/powerPagesApi'
import type { ServiceTypeEntity } from './serviceType'
import type { CategoryEntity } from './category'
import type { ContactEntity } from './contact'

// -- Status Picklist ----------------------------------------------------------

export const ServiceRequestStatusMap = {
  100000000: 'submitted',
  100000001: 'reviewed',
  100000002: 'assigned',
  100000003: 'in-progress',
  100000004: 'resolved',
  100000005: 'closed',
} as const

export const ServiceRequestStatusReverse: Record<string, number> = {
  submitted: 100000000,
  reviewed: 100000001,
  assigned: 100000002,
  'in-progress': 100000003,
  resolved: 100000004,
  closed: 100000005,
}

export type RequestStatus = 'submitted' | 'reviewed' | 'assigned' | 'in-progress' | 'resolved' | 'closed'

export const mapStatusFromPicklist = (value?: number): RequestStatus =>
  (value !== undefined && value in ServiceRequestStatusMap)
    ? ServiceRequestStatusMap[value as keyof typeof ServiceRequestStatusMap]
    : 'submitted'

export const mapStatusToPicklist = (status: RequestStatus): number =>
  ServiceRequestStatusReverse[status] ?? 100000000

// -- Urgency Picklist ---------------------------------------------------------

export const UrgencyMap = {
  100000000: 'low',
  100000001: 'medium',
  100000002: 'high',
} as const

export const UrgencyReverse: Record<string, number> = {
  low: 100000000,
  medium: 100000001,
  high: 100000002,
}

export type Urgency = 'low' | 'medium' | 'high'

export const mapUrgencyFromPicklist = (value?: number): Urgency =>
  (value !== undefined && value in UrgencyMap)
    ? UrgencyMap[value as keyof typeof UrgencyMap]
    : 'medium'

export const mapUrgencyToPicklist = (urgency: Urgency): number =>
  UrgencyReverse[urgency] ?? 100000001

// -- Raw OData Entity ---------------------------------------------------------
// Matches Dataverse column logical names exactly.

export interface ServiceRequestEntity {
  spa311_servicerequestid: string
  spa311_requestnumber?: string
  spa311_description?: string
  spa311_address?: string
  spa311_latitude?: number
  spa311_longitude?: number
  spa311_status?: number
  spa311_urgency?: number
  spa311_department?: string
  spa311_dateobserved?: string
  // Lookup raw GUIDs (used in $select)
  _spa311_servicetypeid_value?: string
  _spa311_categoryid_value?: string
  _spa311_contactid_value?: string
  // Expanded navigation properties (when $expand is used)
  spa311_ServiceTypeId?: ServiceTypeEntity
  spa311_CategoryId?: CategoryEntity
  spa311_ContactId?: ContactEntity
  createdon?: string
  modifiedon?: string
  // Index signature for OData formatted value annotations
  [key: string]: unknown
}

// -- Domain Type --------------------------------------------------------------
// Clean application type for UI consumption.
// NOTE: timeline is intentionally excluded -- status updates live in a separate
// spa311_statusupdate table and will be integrated via a separate hook.

export interface ServiceRequest {
  id: string
  requestNumber: string
  description: string
  address: string
  latitude: number
  longitude: number
  status: RequestStatus
  urgency: Urgency
  department: string
  dateObserved: string
  serviceTypeId: string
  serviceTypeName: string
  categoryId: string
  categoryName: string
  contactId: string
  createdOn: string
  modifiedOn: string
}

// -- Input Types --------------------------------------------------------------

export interface CreateServiceRequestInput {
  serviceTypeId: string
  serviceTypeName?: string
  categoryId: string
  categoryName?: string
  contactId?: string
  description: string
  address: string
  latitude?: number
  longitude?: number
  urgency: Urgency
  dateObserved?: string
}

export interface UpdateServiceRequestInput {
  status?: RequestStatus
  urgency?: Urgency
  department?: string
  description?: string
  address?: string
}

// -- Annotation (Notes/Attachments) Types ------------------------------------

export interface CreateAnnotationInput {
  subject: string
  filename: string
  mimetype: string
  documentbody: string // base64-encoded file content
  objectId: string // parent service request ID
  notetext?: string
}

export interface AnnotationEntity {
  annotationid: string
  subject?: string
  filename?: string
  mimetype?: string
  documentbody?: string
  isdocument?: boolean
  notetext?: string
  objectid?: string
}

// -- Entity-to-Domain Mapper --------------------------------------------------

export const mapServiceRequestEntity = (entity: ServiceRequestEntity): ServiceRequest => ({
  id: entity.spa311_servicerequestid,
  requestNumber: entity.spa311_requestnumber ?? '',
  description: entity.spa311_description ?? '',
  address: entity.spa311_address ?? '',
  latitude: entity.spa311_latitude ?? 0,
  longitude: entity.spa311_longitude ?? 0,
  status: mapStatusFromPicklist(entity.spa311_status),
  urgency: mapUrgencyFromPicklist(entity.spa311_urgency),
  department: entity.spa311_department ?? '',
  dateObserved: entity.spa311_dateobserved ?? '',
  serviceTypeId: entity._spa311_servicetypeid_value ?? '',
  serviceTypeName:
    getFormattedValue(entity, '_spa311_servicetypeid_value') ??
    entity.spa311_ServiceTypeId?.spa311_name ??
    '',
  categoryId: entity._spa311_categoryid_value ?? '',
  categoryName:
    getFormattedValue(entity, '_spa311_categoryid_value') ??
    entity.spa311_CategoryId?.spa311_name ??
    '',
  contactId: entity._spa311_contactid_value ?? '',
  createdOn: entity.createdon ?? '',
  modifiedOn: entity.modifiedon ?? '',
})
