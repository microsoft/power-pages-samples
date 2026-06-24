# Cloud Flow Sample (Angular)

This sample shows how to **invoke a Power Automate cloud flow from a Power Pages
code site**. It is the smallest app that proves the concept: one form, one
button, one flow call.

The entire lesson is in
[`src/app/cloud-flow.service.ts`](src/app/cloud-flow.service.ts) — the rest of
the app is just UI to trigger it and render the result.

## What this teaches

- Calling a registered cloud flow with `POST /_api/cloudflow/v1.0/trigger/<flowId>`.
- Sending the required cross-site request forgery (CSRF) token on the request.
- Matching the request body keys to the flow trigger's input parameter names.
- Reading the JSON returned by a **Respond to Power Pages** action.

## Key points

- You do **not** send an auth token — the site session handles authentication.
  Every call must include the `__RequestVerificationToken` (CSRF) header **and**
  the `X-Requested-With: XMLHttpRequest` header (the endpoint only accepts AJAX
  requests; without it the call fails with a masked `500`).
- The request body keys (`name`, `topic`) must match the input parameters you
  define on the **When Power Pages calls a flow** trigger.
- The flow's `FLOW_ID` is set in [`src/app/config.ts`](src/app/config.ts) — the
  last segment of the flow's trigger URL. Import the bundled flow (Option A below)
  and it's already filled in; author your own (Option B) and you paste your GUID.
- Running locally (`npm start`) returns a **mocked** response so you can work on
  the UI offline. The real call only runs on a deployed site.

## Scripts

- `npm start` – Start the local dev server (`ng serve`, uses the mocked flow response).
- `npm run build` – Build for production (`ng build`) into `dist/cloud-flow-sample/browser/`.

## Set up the flow

The client calls a flow with two text inputs (`name`, `topic`) that returns three
text outputs (`ticketNumber`, `message`, `estimatedCallback`). Create it one of
two ways.

### Option A — import the bundled flow (fastest)

This folder ships the flow as an unmanaged solution
([`flow/CloudFlowSample_1_0_0_0.zip`](flow/CloudFlowSample_1_0_0_0.zip)) **and** its
site registration ([`.powerpages-site/cloud-flow-consumer/`](.powerpages-site/cloud-flow-consumer)),
so a normal deploy wires everything up — no manual studio step.

1. At [make.powerautomate.com](https://make.powerautomate.com), open **Solutions →
   Import solution** and import `flow/CloudFlowSample_1_0_0_0.zip`. Open the
   imported **Cloud Flow Sample - Request Callback** flow and turn it **On**.
1. Build and upload the site (see *Running on Power Pages* below). The bundled
   `cloud-flow-consumer` metadata registers the flow and grants the **Authenticated
   Users** role automatically — `pac pages upload-code-site` deploys it, so no
   **Set up → Cloud flows → Add cloud flow** step is needed.
1. An unmanaged import preserves the flow's GUID, so `FLOW_ID` in
   [`src/app/config.ts`](src/app/config.ts) **already matches** — no edit needed.

> The shipped registration grants only **Authenticated Users**. To let anonymous
> visitors call it (e.g. a public site), add the Anonymous Users role id to
> `adx_CloudFlowConsumer_adx_webrole` in
> `.powerpages-site/cloud-flow-consumer/cloud-flow-sample-request-callback.cloudflowconsumer.yml`.

### Option B — author the flow yourself

1. In the design studio: **Set up → Cloud flows → + Create new flow**.
1. Trigger: **When Power Pages calls a flow**. Add two **Text** inputs, titled
   exactly:
   - `name`
   - `topic`
1. Action: **Respond to Power Pages** (listed as *Return value(s) to Power Pages*).
   Add three **Text** outputs, titled exactly:
   - `ticketNumber`
   - `message`
   - `estimatedCallback`
1. Save, then **Set up → Cloud flows → + Add cloud flow**, pick the flow, add web
   role(s), and **copy the trigger URL**.
1. Paste the GUID at the end of that URL into `FLOW_ID` in `src/app/config.ts`.

> ⚠️ The input/output **titles must match exactly (case-sensitive)** the keys in
> [`src/app/cloud-flow.service.ts`](src/app/cloud-flow.service.ts) —
> `CallbackRequest` (`name`, `topic`) and `CallbackResponse` (`ticketNumber`,
> `message`, `estimatedCallback`). A typo or different casing breaks the
> round-trip silently.

> When you promote the site to another environment, the flow must be **registered**
> there too. Option A keeps the same GUID; Option B produces a new one, so update
> `FLOW_ID`. See
> [Configure Power Automate cloud flows in Power Pages](https://learn.microsoft.com/power-pages/configure/cloud-flow-integration).

## Authorization (who can call the flow)

Power Pages authorizes the call against **web roles**, and web roles attach to a
**contact**:

- When you register the flow you choose which web roles may call it.
- An **authenticated** visitor must be a registered **contact** holding one of
  those roles (the built-in **Authenticated Users** role covers every signed-in
  contact).
- For a quick public test, grant the **Anonymous Users** role and call it from a
  **public** site. Private/trial sites force sign-in, so anonymous requests can't
  reach the flow.

## Troubleshooting

**The call returns `500` with `0` flow runs.** The most common cause is a missing
**`X-Requested-With: XMLHttpRequest`** header — the cloud flow endpoint only
accepts AJAX requests and rejects anything else with a *masked* 500 (an internal
"view 'Error' not found" page) **before the flow runs**. This sample sends that
header in [`src/app/cloud-flow.service.ts`](src/app/cloud-flow.service.ts); if you
write your own caller, include it alongside the CSRF token.

Other things to check:

1. Confirm the flow is **On** and **registered** to this site (Set up → Cloud flows).
1. Check the signed-in user holds a **web role** the flow grants (web roles bind
   to a contact; an authenticated user with no contact holds none).
1. Open the flow's **run history** in Power Automate: **zero runs** means the call
   never reached the flow (header / registration / authorization); a **failed
   run** points at the flow's own logic.

**The response fields come back blank.** Power Pages returns the Respond action's
output property names **lowercased** (`ticketNumber` → `ticketnumber`). The service
maps them back to its typed shape — account for the lowercase keys if you add
fields.

## Running on Power Pages

### Setup

1. Install [Microsoft Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction?tabs=windows#install-microsoft-power-platform-cli) (version >= 1.47.1).
1. Allow `*.js` files by removing it from **Blocked Attachments** in **Privacy + Security** settings for your environment in the Power Pages Admin Center.
1. Open a terminal and `cd` into this `cloud-flow-sample` folder.
1. Run `pac auth create --environment <Environment URL>` to log in to your environment.

### Uploading the site

1. Set up the flow and `FLOW_ID` (see **Set up the flow** above — Option A needs no edit).
1. Run `npm install` then `npm run build`.
1. Run `pac pages upload-code-site --rootPath .` to upload the site.
1. Go to Power Pages home and click **Inactive sites**. Find **Cloud Flow Sample (Angular)**
   and click **Reactivate**.
1. Once active, click **Preview**, fill in the form, and click **Request callback**
   to see the live flow response.
