// Minimal typings for the Power Pages client objects this sample relies on.
// The Power Pages runtime injects `window.Microsoft.Dynamic365.Portal`; we only
// declare the pieces we read (the signed-in user's contact id).
export interface PowerPagesUser {
  userName: string;
  contactId: string;
}

declare global {
  interface Window {
    Microsoft?: {
      Dynamic365?: {
        Portal?: {
          User: PowerPagesUser | undefined;
        };
      };
    };
  }
}

export {};
