export interface Category {
  id: string
  name: string
  slug: string
  icon: string
  description: string
}

export interface ServiceType {
  id: string
  categoryId: string
  name: string
  slug: string
  icon: string
  description: string
  details: string
  whatYouNeed: string[]
  eligibility: string
  targetSLA: string
  slaDays: number
}

export type RequestStatus = 'submitted' | 'reviewed' | 'assigned' | 'in-progress' | 'resolved' | 'closed'

export interface StatusUpdate {
  status: RequestStatus
  date: string
  note: string
}

export interface ServiceRequest {
  id: string
  serviceTypeId: string
  categoryId: string
  description: string
  address: string
  lat: number
  lng: number
  status: RequestStatus
  urgency: 'low' | 'medium' | 'high'
  department: string
  createdAt: string
  updatedAt: string
  timeline: StatusUpdate[]
  contactEmail: string
  contactName: string
}

export interface KnowledgeArticle {
  id: string
  title: string
  slug: string
  summary: string
  content: string
  tags: string[]
  relatedServiceTypeIds: string[]
  publishedAt: string
}
