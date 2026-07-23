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

The deployed preview URL redirects to Microsoft sign-in, so these screenshots were captured from the supplied local site build at `~/Downloads/templates-work/supplier-invoice-portal/Site/supplier-invoice-portal`.
The local capture hides the AI summary panels because they call tenant APIs that are unavailable in a static preview server.

## Use this template manually

Use these steps if you want to install the template yourself instead of using an installer skill.

1. Install the [Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction).
2. Allow `*.js` files by removing it from `Blocked Attachments` in `Privacy + Security` settings for your environment from Power Pages Admin Center.
3. Sign in to the target environment:

   ```bash
   pac auth create --url https://YOUR-ENVIRONMENT.crm.dynamics.com
   ```

4. Import the unmanaged solution from the repository root:

   ```bash
   pac solution import --path templates/spa/supplier-invoice-portal/solution/supplier-invoice-spa-portal-unmanaged.zip --publish-changes
   ```

5. Confirm the site and Dataverse tables were created in the target environment.
6. Import `seed/data.json` after the solution import completes.
   The Power Platform CLI solution import command does not import this JSON file.
   Use an installer or a Dataverse import script that understands the seed-data shape below.

Seed data is included under `seed/`.
The seed data uses a Dataverse export shape with `tables` and `fileExports`.
Files referenced from `fileExports` are stored under `seed/files/`.

If you import the seed data without an installer, create or upsert records table by table using the order in `seed/data.json`.
Preserve the IDs in each table because later records refer to earlier records by lookup ID.
After the `spnvc_invoiceattachment` records exist, upload each `fileExports` file to the listed Dataverse file column.
Do not use Dataverse's spreadsheet import for this file because it will not preserve lookup IDs or upload file-column binaries.
