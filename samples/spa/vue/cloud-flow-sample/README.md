# Cloud Flow Sample (Vue)

This sample shows how to **invoke a Power Automate cloud flow from a Power Pages
code site**. It is the smallest app that proves the concept: one form, one
button, one flow call.

The entire lesson is in [`src/cloudFlowClient.ts`](src/cloudFlowClient.ts) — the
rest of the app is just UI to trigger it and render the result.

## What this teaches

- Calling a registered cloud flow with `POST /_api/cloudflow/v1.0/trigger/<flowId>`.
- Sending the required cross-site request forgery (CSRF) token on the request.
- Matching the request body keys to the flow trigger's input parameter names.
- Reading the JSON returned by a **Respond to Power Pages** action.

## Key points

- You do **not** send an auth token — the site session handles authentication.
  Every call must include the `__RequestVerificationToken` (CSRF) header.
- The request body keys (`name`, `topic`) must match the input parameters you
  define on the **When Power Pages calls a flow** trigger.
- The flow's `FLOW_ID` is set in [`src/config.ts`](src/config.ts). It is unique
  per environment, so update it whenever you register the flow somewhere new.
- Running locally (`npm run dev`) returns a **mocked** response so you can work
  on the UI offline. The real call only runs on a deployed site.

## Scripts

- `npm run dev` – Start the local dev server (uses the mocked flow response).
- `npm run build` – Type-check and build for production into `dist/`.
- `npm run preview` – Preview the production build locally.

## Create and register the flow

This sample expects a flow that takes two text inputs (`name`, `topic`) and
returns three text outputs (`ticketNumber`, `message`, `estimatedCallback`).

1. In the Power Pages design studio, open **Set up → Cloud flows → + Create new flow**.
1. Choose the **When Power Pages calls a flow** trigger and add two **Text**
   inputs named `name` and `topic`.
1. Add your logic (for this demo, a **Compose**/expression is enough), then add a
   **Respond to Power Pages** action returning `ticketNumber`, `message`, and
   `estimatedCallback` as Text.
1. Save the flow, then **Set up → Cloud flows → + Add cloud flow**, pick the flow,
   add the web role(s) that may call it, and **copy the trigger URL**.
1. Paste the GUID at the end of that URL into `FLOW_ID` in `src/config.ts`.

> When you promote the site to another environment, the flow must be
> **registered** there too (Set up → Cloud flows → register), and `FLOW_ID`
> updated. See
> [Configure Power Automate cloud flows in Power Pages](https://learn.microsoft.com/power-pages/configure/cloud-flow-integration).

## Running on Power Pages

### Setup

1. Install [Microsoft Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction?tabs=windows#install-microsoft-power-platform-cli) (version >= 1.47.1).
1. Allow `*.js` files by removing it from **Blocked Attachments** in **Privacy + Security** settings for your environment in the Power Pages Admin Center.
1. Open a terminal and `cd` into this `cloud-flow-sample` folder.
1. Run `pac auth create --environment <Environment URL>` to log in to your environment.

### Uploading the site

1. Set `FLOW_ID` in `src/config.ts` (see above).
1. Run `npm install` then `npm run build`.
1. Run `pac pages upload-code-site --rootPath .` to upload the site.
1. Go to Power Pages home and click **Inactive sites**. Find **Cloud Flow Sample (Vue)**
   and click **Reactivate**.
1. Once active, click **Preview**, fill in the form, and click **Request callback**
   to see the live flow response.
