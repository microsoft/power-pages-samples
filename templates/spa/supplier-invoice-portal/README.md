# Supplier Invoice Portal template

This folder contains the Supplier Invoice Portal template entry for the installable `templates/` catalog.

The checked-in solution zip is an unmanaged export with the `spnvc` publisher prefix.
The validator detects the managed state from `solution.xml` during validation.

## Previews

| Home | Dashboard |
| --- | --- |
| ![Supplier Invoice Portal home page](previews/home.png) | ![Supplier Invoice Portal dashboard](previews/dashboard.png) |

| Invoice list | Submit invoice |
| --- | --- |
| ![Supplier Invoice Portal invoice list](previews/list.png) | ![Supplier Invoice Portal submit invoice form](previews/form.png) |

| Purchase orders | Review queue |
| --- | --- |
| ![Supplier Invoice Portal purchase orders](previews/purchase-orders.png) | ![Supplier Invoice Portal review queue](previews/review.png) |

## Use this template manually

Use these steps if you want to install the template yourself instead of using an installer skill.

1. Install the [Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction).
2. Allow `*.js` files by removing it from `Blocked Attachments` in `Privacy + Security` settings for your environment from Power Pages Admin Center.
3. Make sure English (LCID 1033) is installed in the target Dataverse environment.
4. Sign in to the target environment:

   ```bash
   pac auth create --url https://YOUR-ENVIRONMENT.crm.dynamics.com
   ```

5. Import the React variant's unmanaged solution from the repository root:

   ```bash
   pac solution import --path templates/spa/supplier-invoice-portal/variants/react/solution/supplier-invoice-spa-portal-unmanaged.zip --publish-changes
   ```

6. Confirm the site and Dataverse tables were created in the target environment.
7. Import `seed-data/data.json` after the solution import completes.
   The Power Platform CLI solution import command does not import this JSON file.
   Use an installer or a Dataverse import script that understands the seed-data shape below.

Seed data is included under `seed-data/`.
The seed data uses a Dataverse export shape with `tables` and `fileExports`.
Files referenced from `fileExports` are stored under `seed-data/files/`.

If you import the seed data without an installer, create or upsert records table by table using the order in `seed-data/data.json`.
Preserve the IDs in each table because later records refer to earlier records by lookup ID.
After the `spnvc_invoiceattachment` records exist, upload each `fileExports` file to the listed Dataverse file column.
Do not use Dataverse's spreadsheet import for this file because it will not preserve lookup IDs or upload file-column binaries.

## Customize this template

The solution includes the SPA source code, not just the compiled site assets.
After you import the solution, download the code site:

```bash
pac pages download-code-site --webSiteId <website-id> --path <download-path> --overwrite
```

The downloaded folder includes the full React source code.
Make your changes there, run the build command from the downloaded site's README or `package.json`, and upload the updated code site when you are ready:

```bash
pac pages upload-code-site --rootPath ./supplier-invoice-portal
```
