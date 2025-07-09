import { Configuration, PopupRequest } from "@azure/msal-browser";

// MSAL configuration
export const msalConfig: Configuration = {
    auth: {
        clientId: "40763894-698b-42b8-b4cc-60b897a88f2e", // Replace with your app's client ID from Azure Portal
        authority: "https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47", // This allows users from any tenant to sign in
        redirectUri: window.location.origin, // This should be the URL where your app runs
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
};

// Add here scopes for id token to be used at MS Identity Platform endpoints.
export const loginRequest: PopupRequest = {
    scopes: ["User.Read"]
};

// Add here the endpoints for MS Graph API services you would like to use.
export const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me"
}; 