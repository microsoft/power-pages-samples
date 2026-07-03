import { Configuration, PopupRequest } from "@azure/msal-browser";

// Read env var in a way Vite can statically replace; fallback guards for non-Vite environments.
// Direct property access allows inlining during build; optional chaining prevents runtime errors elsewhere.
const env = (import.meta as ImportMeta).env;
const clientId = env?.VITE_CLIENT_ID || (typeof process !== 'undefined' ? (process as unknown as { env?: { [k: string]: string | undefined } })?.env?.VITE_CLIENT_ID : undefined) || "";
const tenantId = env?.VITE_TENANT_ID || (typeof process !== 'undefined' ? (process as unknown as { env?: { [k: string]: string | undefined } })?.env?.VITE_TENANT_ID : undefined);
const authority = tenantId && tenantId.trim().length > 0
    ? `https://login.microsoftonline.com/${tenantId}`
    : "https://login.microsoftonline.com/common";
if (!clientId) {
    console.error("VITE_CLIENT_ID is missing. Add VITE_CLIENT_ID to the .env file at project root and restart the dev server.");
}

// MSAL configuration
export const msalConfig: Configuration = {
    auth: {
        clientId: clientId,
        authority,
        redirectUri: window.location.origin,
        postLogoutRedirectUri: window.location.origin
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
};

// Add here scopes for id token to be used at MS Identity Platform endpoints.
export const loginRequest: PopupRequest = {
    scopes: ["User.Read"],
};

// Add here the endpoints for MS Graph API services you would like to use.
export const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me"
};
