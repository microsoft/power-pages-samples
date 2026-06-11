export interface PowerPagesUser {
  userName: string
  firstName: string
  lastName: string
  email: string
  contactId: string
  userRoles: string[]
}

export interface PowerPagesPortal {
  User: PowerPagesUser | undefined
  version: string
  type: string
  id: string
  geo: string
  tenant: string
  correlationId: string
  orgEnvironmentId: string
  orgId: string
  portalProductionOrTrialType: string
  isTelemetryEnabled: boolean
  InstrumentationSettings: Record<string, unknown>
  timerProfileForBatching: Record<string, unknown>
  activeLanguages: unknown[]
  isClientApiEnabled: boolean
}

interface MicrosoftNamespace {
  Dynamic365: {
    Portal: PowerPagesPortal
  }
}

declare global {
  interface Window {
    Microsoft: MicrosoftNamespace
  }
}

export {}
