# File Upload to SharePoint Sample (React + Vite)

This sample shows how to **upload, list, download, and delete files in a
SharePoint document library** from a Power Pages **code site (SPA)** — using
**server logic** + **Microsoft Graph**.

Two halves:
- **The SPA** (`src/`) — a file manager that calls the server logic. The key file
  is [`src/sharePointService.ts`](src/sharePointService.ts).
- **The server logic** ([`server-logic/sharepointDocuments.js`](server-logic/sharepointDocuments.js))
  — server-side JavaScript that holds an Entra app (client-credentials) and calls
  Microsoft Graph to do the SharePoint work.

## Why server logic (and not `/_api` or a cloud flow)?

SharePoint can't be reached from a code site with the portal Web API (`/_api` is
Dataverse-only), and code sites can't host the native Liquid/basic-form subgrid
([code sites don't support Liquid, lists, or forms](https://learn.microsoft.com/power-pages/configure/create-code-sites#differences-from-existing-power-pages-sites)).
A Power Automate cloud flow can bridge it, but the flow trigger caps payloads at a
small size. **Server logic** runs server-side, keeps the Graph secret off the
client, and gives a clean SPA-callable API — a better fit than the cloud-flow
bridge for this scenario.

## How it works

```
SPA  --(CSRF)-->  <METHOD> /_api/serverlogics/sharepointdocuments
                    GET  (no id)        -> list the user's files
                    GET  (?id=...)      -> download one file
                    POST {fileName,fileContent} -> upload
                    DELETE (?id=...)    -> delete
Server logic  -->  Microsoft Graph (client-credentials, Sites.ReadWrite.All)
              -->  SharePoint document library  (folder per signed-in user)
```

- Every call carries the `__RequestVerificationToken` (CSRF) header; the server
  logic is invoke-protected by its assigned **web role** (Authenticated Users
  here). There are **no table permissions** — nothing is stored in Dataverse, so
  the SharePoint document library (via Graph) is the only backing store.
- The server logic returns a `{ Success, Data, Error }` envelope — the payload is
  in `Data`.
- Each user is fenced **server-side** to their own folder (`user-<id>`), derived
  from the authenticated `Server.User` — never a client-supplied id. Item ids are
  not a trust boundary, so download/delete **re-verify server-side** that the
  target item lives in the caller's own folder (blocks IDOR); the server logic
  also validates the file name, type, and size independently of the SPA.

## ⚠️ Important limitation: text documents only

Power Pages server logic's `HttpClient` accepts **only** `application/json`,
`text/html`, and `application/x-www-form-urlencoded` request bodies — there is **no
`application/octet-stream`**. So this sample handles **text-based documents**
(`.txt`, `.csv`, `.json`, `.md`, `.html`, `.xml`): they upload as real,
natively-usable SharePoint files and round-trip cleanly.

**Binary files (PDF, PNG, Office docs) can't be streamed as raw bytes through this
path today.** Options if you need binary: store the content base64-encoded (the
SharePoint file then holds base64 text, not the native file), or use a different
upload transport. This is a current platform constraint, not a sample choice — call
it out when you evaluate the approach.

> **File size — cap at 2 MB.** The whole file is sent inline (as a JSON string) in a
> single server-logic request, so it is bounded by the runtime's request-body cap
> (~2.5 MB observed). Two runtime details make this work:
> - **Uploads use a `text/plain` request content type, not `application/json`.** The
>   runtime enforces a ~2 MB limit when it validates an `application/json` request
>   body, so larger JSON uploads fail with HTTP 500. `text/plain` passes the body
>   through untouched (the server logic still `JSON.parse`s it).
> - **Downloads carry an `encoding` flag.** `HttpClient` returns a response body as a
>   plain string for text-like content types but **base64** for anything else (Graph
>   serves `.md`, `.csv`, … as `application/octet-stream`). The server logic reports
>   `encoding: "text" | "base64"` so the SPA decodes correctly.
>
> For larger files, Graph supports [upload sessions](https://learn.microsoft.com/graph/api/driveitem-createuploadsession)
> (chunked) from the server logic — out of scope here.

## Screenshot

![SharePoint file upload sample screenshot](screenshot.png)

## Set up

### 1. Register an Entra app for Microsoft Graph

1. In the [Azure portal](https://portal.azure.com) → **App registrations** →
   **+ New registration**. Name it (e.g. `PowerPages-Graph-SharePoint`), single
   tenant, no redirect URI. **Register**.
2. **API permissions** → **Add a permission** → **Microsoft Graph** →
   **Application permissions** → add **`Sites.ReadWrite.All`** → **Grant admin
   consent**.
3. **Certificates & secrets** → **+ New client secret** → copy the value.
4. Collect **Client ID**, **Tenant ID**, **Client secret**.

### 2. Identify your SharePoint site

- **Hostname** (e.g. `contoso.sharepoint.com`) and **site path** (e.g.
  `/sites/Documents`). The site's default **Documents** library is used.

### 3. Set the site settings

Edit the placeholder values shipped under `.powerpages-site/site-settings/`:

| Site setting | Value |
| --- | --- |
| `SharePoint/ClientId` | your app's client ID |
| `SharePoint/TenantId` | your tenant ID |
| `SharePoint/ClientSecret` | your client secret *(see security note)* |
| `SharePoint/Hostname` | e.g. `contoso.sharepoint.com` |
| `SharePoint/SitePath` | e.g. `/sites/Documents` |
| `ServerLogic/Enabled` | `true` (shipped) |

> 🔐 **Security:** don't commit a real secret. For production, keep
> `SharePoint/ClientSecret` in **Azure Key Vault**, surface it through an
> **environment variable**, and reference that from the site setting. The shipped
> `SharePoint/ClientSecret` value is intentionally empty.

### 4. Create the server logic

The server logic is authored in JavaScript and runs server-side (it isn't part of
the SPA bundle). The **canonical, readable source** is
[`server-logic/sharepointDocuments.js`](server-logic/sharepointDocuments.js).

You get it onto the site one of two ways:

- **Declarative deploy (recommended).** A copy of the same code ships in the site
  snapshot at
  `.powerpages-site/server-logic/sharepointdocuments/sharepointdocuments.js`, so
  `pac pages upload-code-site` (see **Running on Power Pages** below) deploys the
  server logic **for you** — no manual paste. If you edit the source, re-copy it
  into that snapshot file so the two stay in sync (they are kept byte-identical).
- **Manual, in the design studio.** If you'd rather create it by hand: **Set up →
  Server logic → + New server logic**, name it **`sharepointdocuments`** (must
  match `SERVER_LOGIC_NAME` in [`src/config.ts`](src/config.ts)); **+ Add roles →
  Authenticated Users**; then **… → Edit code → Open Visual Studio Code** and paste
  the contents of
  [`server-logic/sharepointDocuments.js`](server-logic/sharepointDocuments.js).
  Save/publish.

Either way, confirm the published server logic has the **Authenticated Users** role
assigned before you test.

## Sign-in is required

Every operation runs as the signed-in user (the server logic derives their folder
from `Server.User`). Anonymous visitors see a **Sign in** button.

- ⚠️ **Testing gotcha:** previewing a brand-new **trial** site *as its owner* gives a
  contactless "previewer" session, so the server logic can't resolve a user. Sign in
  as a real authenticated user — on a trial site that can require converting it to
  production. On a production site, an authenticated sign-in creates the contact
  automatically.

## Scripts

- `npm run dev` – Start the local dev server (in-memory mock — no server logic
  needed). The mock covers the CRUD UI only; it does **not** exercise the server
  logic's Graph calls, the base64 download decode, CSRF, or authentication — test
  those on a deployed site.
- `npm run build` – Type-check and build for production into `dist/`.
- `npm run preview` – Preview the production build locally.

## Running on Power Pages

1. Install [Microsoft Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction?tabs=windows#install-microsoft-power-platform-cli) (>= 1.47.1).
1. Complete **Set up** above (Entra app, SharePoint, site settings, server logic).
1. Allow `*.js` files by removing it from **Blocked Attachments** in **Privacy + Security** for your environment.
1. `cd` into this `sharepoint` folder and run `pac auth create --environment <Environment URL>`.
1. Run `npm install` then `npm run build`, then `pac pages upload-code-site --rootPath .`.
1. In Power Pages, **Inactive sites → Reactivate** **File Upload (SharePoint) Sample**.
1. Confirm the server logic is published with the **Authenticated Users** role and the
   site settings point at your app + SharePoint site. **Preview**, **sign in as an
   authenticated user**, then upload a text document and download/delete it.
