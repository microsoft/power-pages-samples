# Supplier Invoice Portal template

This folder contains the Supplier Invoice Portal template entry for the installable `templates/` catalog.

The checked-in supporting solution source is reviewable, minimized unmanaged source under `solutions/SupplierInvoiceSPAPortal/`.
Its folder name matches the `SupplierInvoiceSPAPortal` unique name in `Other/Solution.xml`.
It uses the `spnvc` publisher prefix.
The validator detects the managed state from `solutions/SupplierInvoiceSPAPortal/Other/Solution.xml`.
It is shared by every framework variant and contains Dataverse artifacts only.
The React Power Pages website project is stored separately under `variants/react/website-code/`.

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

## Data model

The supporting solution contains four custom tables and segmented Account and Contact customizations:

- `account` represents the supplier business.
  The solution adds Supplier (`132140000`) to the existing Account Category (`accountcategorycode`) choice.
  Preferred Customer (`1`) and Standard (`2`) remain unchanged.
  Only Supplier Accounts with `statecode=0` are assignable to new purchase orders.
- `spnvc_purchaseorder` stores purchase orders and their supplier lookup.
- `spnvc_invoice` stores invoices and the exact contact, supplier, and purchase-order lookups used by the site.
- `spnvc_invoicecomment` stores the invoice discussion thread and its permission-scope contact lookup.
- `spnvc_invoiceattachment` stores uploaded files and links them to an invoice or comment.

The standard Dataverse `contact` table supplies portal identity and reviewer or supplier ownership.
A business Account, a portal Contact, and the Supplier web role are separate concepts.
Multiple Contacts can belong to the same business through the standard Contact Company Name (`parentcustomerid_account`) link.
Supplier invoices and purchase orders are Account-scoped to the Contact's Company Name.
Supplier invoice access is company-wide, including invoices submitted by another Contact in the same business.
Comments and attachments inherit access from the Invoice.
Reviewer access follows assigned Accounts through a native Account-Contact many-to-many relationship, then Parent-scoped PO and Invoice permissions.
The template adds no custom Account name, contact-detail, address, or status columns.
Unchanged Account and Contact metadata remain standard Dataverse dependencies.
The expected custom columns, relationships, and case-sensitive lookup navigation properties are declared in [`dataverse-solution-contract.json`](variants/react/website-code/dataverse-solution-contract.json).
Template validation rejects solution components that drift from this contract.
The [data model plan](variants/react/website-code/docs/data-model-plan.html) includes the shipped columns, choices, and relationship diagram.

The shipping solution includes only one authored view, **Active supplier accounts**, and one authored form customization, the additive **Portal Contact (Enhanced)** assignment grid.
Invoice, PO, comment and attachment screens are implemented by the React website; their generic exported Information forms, saved views and empty ribbon diffs are not shipped.
Primary keys/names, state/status, ownership/audit metadata, currency/base amounts and file-column relationships remain because they support Dataverse storage and the website's API paths.
The existing solution contract and actual ZIP tests reject extra custom tables, fields, relationships and UI assets.
This trims the release artifact; it does not remove schema, forms, views, records or permissions from an existing environment.

## Assign contacts in Power Pages Management

The solution ships the native `spnvc_account_contact` N:N relationship, an **Active supplier accounts** view, and an **Assigned Supplier Accounts** subgrid on the existing **Portal Contact (Enhanced)** form.
The relationship's Contact-side associated menu is **Assigned supplier accounts**.
The Contact form component is a native unmanaged differential export containing only the added section and subgrid.
It preserves Company Name, existing controls, handlers, localizations and form security conditions instead of copying the full source form.
It requires the installed first-party enhanced Contact form from Power Pages Runtime Core.
It does not replace Microsoft's Management app, sitemap or unrelated Account views.

1. Review each intended business Account first.
   Set **Account Category** to **Supplier** (`132140000`) and confirm the Account is **Active**.
   Do not reclassify a customer merely to make it appear in the grid.
2. In Power Pages Management, open **Security > Contacts** and the Contact's **Portal Contact (Enhanced)** form.
3. For a Reviewer, open the **General** tab's **Assigned Supplier Accounts** subgrid.
   Use **Add Existing Account** and the **Active supplier accounts** view to associate the businesses this Contact may review.
   The equivalent **Related > Assigned supplier accounts** navigation remains available.
   Use **Remove** to revoke an assignment, then verify access after the portal cache refresh.
4. For a Supplier, set **Company Name** to one active Supplier Account.
   Also associate that same Account in **Assigned supplier accounts** so Company validation and Invoice Account lookup binding have scoped Read/AppendTo eligibility.
   A supplier-only Contact must not have extra memberships.
5. For a Contact with both roles, Company Name remains its single supplier affiliation.
   N:N membership may include additional reviewer businesses.
   Permissions are additive across assigned roles; switching the UI role mode does not revoke server privileges.
6. Assign the appropriate site web roles from the Contact's **Web Roles** section.
   Account assignments do not assign web roles automatically.

Administrators maintain the category, active-state, and Company Name/membership consistency rules.
The filtered view assists selection; it is not a universal restriction on administrator API edits.
The native lookup's **Recent** list can offer Accounts outside the filtered view.
Selecting one can create an N:N association while the grid remains empty because its Category or state does not match.
If Add Existing closes but no row appears, check the Account's Category, state and existing membership before repeating the action.
Refresh the grid after an approved Category correction; the existing association does not need to be recreated.
Do not treat Recent selections as proof of Supplier eligibility.
There is no new plug-in, Global Account permission, primary-contact requirement, or enhanced-authorization dependency.
The template denies Account and Contact Append while granting only the target AppendTo needed by business-record lookups.
Account Read exposes minimal identity/category/state fields for associated Accounts.
The Supplier service validates the exact Company Name Account by ID and fails on a missing, inaccessible, inactive or non-Supplier company; it never substitutes another reviewer assignment.
Direct portal association/disassociation requests in either direction must not be used to administer memberships.

Run `npm run assignments:validate` from `website-code/` to check the shipped sample roles and affiliations.
For an administrator-exported snapshot, run `scripts/validate-assignments.mjs` with `--input=<file>` and explicit `--supplier-contact=<guid>` / `--reviewer-contact=<guid>` arguments from that site's role assignments.
The snapshot uses the seed/export table shape and collection-valued Account bind arrays.
This local check does not mutate or audit a live environment.
It reports the specific Account and whether Category or state excludes it, including Company Name diagnostics.

Power Pages documents a [known OData GET issue with N:N/Parent permission chains](https://learn.microsoft.com/power-pages/configure/web-api-overview#known-issues).
The data services use FetchXML with typed, XML-escaped filters and paging cookies.
FetchXML controls query shape and selection; table permissions enforce the caller's actual access.

## Existing installations

This is a fresh-install model, not an automatic migration of the retired custom Supplier table.
Importing an unmanaged solution update does not delete old components or move their data.
Do not retarget existing lookup columns by editing XML or deploy the new website before backfilling its replacement schema.
Follow the [migration checklist](variants/react/website-code/docs/dataverse-data-migration.md), including a reviewed supplier-to-Account mapping, Contact company membership, lookup backfill, and permission cutover.
No migration command in this repository changes live environments automatically.

## Use this template manually

Use these steps if you want to install the template yourself instead of using an installer skill.

1. Install the [Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction).
2. Allow `*.js` files by removing it from `Blocked Attachments` in `Privacy + Security` settings for your environment from Power Pages Admin Center.
3. Make sure English (LCID 1033), Power Pages Management and its **Portal Contact (Enhanced)** form are installed in the target Dataverse environment.
4. Sign in to the target environment:

   ```bash
   pac auth create --url https://YOUR-ENVIRONMENT.crm.dynamics.com
   ```

5. Pack and import the template family's supporting unmanaged solution from the repository root:

   ```bash
   temp_dir="$(mktemp -d)"
   trap 'rm -rf "$temp_dir"' EXIT
   pac solution pack --zipfile "$temp_dir/supplier-invoice-spa-portal-unmanaged.zip" --folder templates/spa/supplier-invoice-portal/solutions/SupplierInvoiceSPAPortal --packagetype Unmanaged
   pac solution import --path "$temp_dir/supplier-invoice-spa-portal-unmanaged.zip" --publish-changes
   ```

6. Confirm the four custom tables, Supplier Account Category option, Active supplier accounts view and Contact form subgrid exist in the target environment.
   Check for a conflicting preexisting `132140000` option before importing.
7. Import `seed-data/data.json` after the solution import completes.
   The Power Platform CLI solution import command does not import this JSON file.
   Use an installer or a Dataverse import script that understands the seed-data shape below.

Seed data is included under `seed-data/`.
The seed data uses a Dataverse export shape with `tables` and `fileExports`.
Files referenced from `fileExports` are stored under `seed-data/files/`.

If you import the seed data without an installer, create or upsert records table by table using the order in `seed-data/data.json`.
Import sample Accounts before Contacts and purchase orders.
Preserve the IDs in each table because later records refer to earlier records by lookup ID.
Identify sample Accounts by their deterministic `accountid`, never by company name.
If an existing Account already uses a sample ID, stop and review the conflict instead of overwriting it.
Do not classify or update unrelated customer Accounts.
The sample supplier Contact has a Company Name link and N:N target-binding membership for its demo Account.
The reviewer Contact has two separate Account assignments.
The Contact POST payload uses `spnvc_account_contact@odata.bind` arrays to create these native associations.
An importer that skips an already-existing Contact does not reconcile its N:N memberships; use an explicit reviewed association migration instead.
Financial-example Contact lookups use only the two fictional seeded Contacts.
Source-environment currency GUIDs are omitted.
Review the target/importing-user currency before importing the USD examples; use an explicit target USD currency lookup in a prepared seed copy if needed.
After the `spnvc_invoiceattachment` records exist, upload each `fileExports` file to the listed Dataverse file column.
Do not use Dataverse's spreadsheet import for this file because it will not preserve lookup IDs or upload file-column binaries.

8. Install dependencies, build the React project, and upload the code site:

```bash
cd templates/spa/supplier-invoice-portal/variants/react/website-code
npm ci
npm run build
pac pages upload-code-site --rootPath .
```

## Customize this template

The `website-code/` folder includes the React source, package files, Power Pages configuration, and `.powerpages-site` metadata.
Make changes there, rebuild, and run the upload command again.

After changing the solution contract or permissions, regenerate the model and permission documentation from `website-code/`:

```bash
npm run docs:generate
```

The generator reads repository metadata only.
Its permission report does not claim to verify a deployed site's authorization.
After a local build, refresh the checked-in compiled web files without connecting to a live site:

```bash
npm run site-assets:sync
```

This preserves the existing web-file IDs and updates hashed bundle filenames from `dist/`.
Review explicit removals if a bundle is no longer generated.
After reviewing obsolete generated bundles, use `npm run site-assets:sync -- --remove-stale` to remove only those exported bundle records.

Before production use, validate the packed solution and Management navigation in a target test environment, then test direct reads, writes, AppendTo, both-direction `$ref` denial, and membership revocation with separate Contacts.
The slimmer release candidate also needs an authorized fresh-environment import check; warning-free packing is not proof of a successful import.
Repository tests and local mock UI checks do not prove live Dataverse import or portal authorization.
The existing status-based UI edit locks are preserved; table permissions do not enforce invoice-status transitions.
