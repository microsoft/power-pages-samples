# Server logic samples

Server-side JavaScript that runs on the Power Pages runtime and is callable from
both code sites ([`../spa/`](../spa/)) and traditional sites
([`../traditional/`](../traditional/)). Server logic keeps secrets off the client
and lets a site reach services that the portal Web API can't.

| Sample | Integrates | Use this sample to learn |
| --- | --- | --- |
| [SharePoint Integration](sharepoint-integration/) | Microsoft Graph + SharePoint | Call Microsoft Graph and SharePoint Online from server logic using an Entra client-credentials app. Pairs with the [File Upload (SharePoint)](../spa/snippets/file-upload/sharepoint/) code-site sample. |
| [Unbound Custom API Invocation](unbound-custom-api/) | Dataverse Custom APIs | Invoke an unbound Custom Action with `POST` and a parameterized unbound Custom Function with `GET` from server logic using a ready-to-import solution. |
| [CSP Violation Reporting](csp-reporting/) | Reporting API + CSP | Receive browser-generated CSP violation reports in a defensive anonymous Server Logic endpoint while preserving antiforgery protection everywhere else. |

See the repository [CONTRIBUTING guide](../../CONTRIBUTING.md) for how the sample
categories are organized and where a new sample belongs.
