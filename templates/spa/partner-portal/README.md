# Partner Portal (Enhanced) template

The Partner Portal (Enhanced) is a React + Vite Power Pages SPA for partner onboarding, customer and opportunity management, and access administration. The local development app uses browser-backed mock data; deploying the website code enables live behavior through Power Pages, Dataverse, and server logic.

## Included

- React website code in [`variants/react/website-code/`](variants/react/website-code/), including the Power Pages site configuration and server logic.
- The supporting unmanaged Dataverse solution `SPAPartnerPortalSite` in [`solutions/`](solutions/).
- English (LCID 1033) site content.

The source environment's environment URL, generated environment manifests, and cloud-flow bindings are not included. Configure these for the target environment before enabling live features. The app's local mock data is in `src/data/seed.ts`; it is not Dataverse seed data.

The supported partner roles are Partner Admin, Partner Manager, and Partner Seller. Public onboarding, authentication, and profile pages remain available to visitors and non-partner users. Existing local mock databases discard retired workspace collections and contact selections without resetting sales edits. Unknown live web roles receive non-partner UX.

## Install manually

### Prerequisites

- Power Platform CLI and Node.js/npm.
- English (LCID 1033) installed in the target Dataverse environment.
- Permission to import solutions and upload Power Pages code sites.
- In Power Pages Admin Center, allow `*.js` files by removing that extension from **Blocked Attachments**.

### Import the supporting solution

From the repository root, pack and import the unmanaged solution:

```bash
temp_dir="$(mktemp -d)"
trap 'rm -rf "$temp_dir"' EXIT
pac solution pack --zipfile "$temp_dir/partner-portal-unmanaged.zip" --folder templates/spa/partner-portal/solutions/SPAPartnerPortalSite --packagetype Unmanaged
pac solution import --path "$temp_dir/partner-portal-unmanaged.zip" --publish-changes
```

### Configure and upload the website

1. Configure the target environment's `OnlineDomains` site setting.
2. If enabling invitation flows, create or import the Power Pages cloud-flow consumer in the target environment and set `VITE_FLOW_SEND_INVITATION=<target-environment-flow-id>` in a local, untracked `.env.production`. Do not commit environment-specific `.env.production` files.
3. Build and upload the site:

   ```bash
   cd templates/spa/partner-portal/variants/react/website-code
   npm ci
   npm run build
   pac pages upload-code-site --rootPath .
   ```

4. Review the shipped web roles, table permissions, Web API settings, and server-logic access in the target environment before granting users access.

## Develop locally

Run `npm ci` and `npm run dev` from `variants/react/website-code/`. Local development uses the mock data store. See the [website-code README](variants/react/website-code/README.md) for type-check, lint, formatting, and build commands.
