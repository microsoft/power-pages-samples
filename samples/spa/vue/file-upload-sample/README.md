# File Upload Sample (Vue)

This sample shows how to **upload, list, download, and delete files with the
Power Pages Web API**, built with **Vue 3 + Vite**. Files are stored as Dataverse
**notes (annotations)** attached to the signed-in user's own contact record.

The entire lesson is in [`src/fileService.ts`](src/fileService.ts) — the rest of
the app ([`src/App.vue`](src/App.vue)) is just UI around it.

## What this teaches

- Uploading a small file as a note with `POST /_api/annotations`, sending the
  content as a base64 `documentbody`.
- Listing a user's files with `$select`/`$filter`/`$orderby`.
- Downloading by reading `documentbody` and decoding the base64 to a Blob.
- Deleting with `DELETE /_api/annotations(<id>)`.
- Sending the CSRF token on every write, and guarding file size and type.

## Screenshot

![File upload sample screenshot](screenshot.png)

## Key points

- Notes are bound to the user's contact via
  `objectid_contact@odata.bind: /contacts(<contactId>)`. The contact id comes
  from `window.Microsoft.Dynamic365.Portal.User.contactId`, so the user must be
  signed in.
- Writes (`POST`, `DELETE`) require the `__RequestVerificationToken` header.
  Reads (`GET`) do not.
- This is the **single-request** pattern for small files (capped at ~3.5 MB).
  Larger files need the chunked
  [InitializeAnnotationBlocksUpload / UploadBlock / CommitAnnotationBlocksUpload](https://learn.microsoft.com/power-apps/developer/data-platform/attachment-annotation-files)
  flow.
- Running locally (`npm run dev`) uses an in-memory mock so you can exercise the
  whole UI offline.

## Scripts

- `npm run dev` – Start the local dev server (uses the in-memory mock store).
- `npm run build` – Type-check (`vue-tsc`) and build for production into `dist/`.
- `npm run preview` – Preview the production build locally.

## Required configuration

For the live calls to work, the site needs:

1. **Web API enabled for the annotation table.** This sample ships the site
   settings under `.powerpages-site/site-settings/`:
   - `Webapi/annotation/enabled = true`
   - `Webapi/annotation/fields = *`
2. **Table permissions** (shipped under `.powerpages-site/table-permissions/`):
   - A **Contact (Self)** permission so a user can read their own contact.
   - A **Notes on contact** permission (child of the contact-self permission,
     `Parent` scope) granting Create/Read/Write/Delete on the annotation table.
   Both are assigned to the **Authenticated Users** web role.
3. **Authentication** must be enabled so users have a contact record. Configure
   any identity provider (see the `authentication-sample`).

> Notes (annotations) are stored in Dataverse, not Azure Blob Storage. To store
> larger files in blob storage instead, see
> [Use Web API to upload files to Azure Blob Storage](https://learn.microsoft.com/power-pages/configure/webapi-azure-blob).

## Running on Power Pages

### Setup

1. Install [Microsoft Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction?tabs=windows#install-microsoft-power-platform-cli) (version >= 1.47.1).
1. Allow `*.js` files by removing it from **Blocked Attachments** in **Privacy + Security** settings for your environment in the Power Pages Admin Center.
1. Open a terminal and `cd` into this `file-upload-sample` folder.
1. Run `pac auth create --environment <Environment URL>` to log in to your environment.

### Uploading the site

1. Run `npm install` then `npm run build`.
1. Run `pac pages upload-code-site --rootPath .` to upload the site.
1. Go to Power Pages home and click **Inactive sites**. Find **File Upload Sample (Vue)**
   and click **Reactivate**.
1. Configure authentication and confirm the annotation Web API settings and table
   permissions above are present.
1. Click **Preview**, sign in, upload a file, then download and delete it.
