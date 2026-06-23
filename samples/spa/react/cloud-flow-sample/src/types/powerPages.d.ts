// Minimal typings for the Power Pages client objects this sample relies on.
// In a real site, `window.Microsoft.Dynamic365.Portal` is injected by the
// Power Pages runtime. We only declare what we use here.
export interface PowerPagesPortal {
  User: { userName: string } | undefined
}

declare global {
  interface Window {
    Microsoft?: {
      Dynamic365?: {
        Portal?: PowerPagesPortal
      }
    }
  }
}

export {}
