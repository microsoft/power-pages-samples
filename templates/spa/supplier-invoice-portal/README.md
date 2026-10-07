# Supplier Invoice Portal template

This folder contains the Supplier Invoice Portal template entry for the installable `templates/` catalog.

The checked-in supporting solution source is reviewable unmanaged source under `solutions/SupplierInvoiceSPAPortal/`.
Its folder name matches the `SupplierInvoiceSPAPortal` unique name in `Other/Solution.xml`.
It uses the `spnvc` publisher prefix.
The validator detects the managed state from `solutions/SupplierInvoiceSPAPortal/Other/Solution.xml`.
It is shared by every framework variant and contains Dataverse artifacts only.
The React Power Pages website project is stored separately under `variants/react/website-code/`.
The SPA uses a Segoe UI-first font stack for headings, body text, controls and error details, with system-font fallbacks where Segoe UI is not installed.

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

PO **Invoiced** totals are derived from linked invoices in Submitted, Approved or Paid status; Draft and Rejected invoices do not contribute.
List and detail reads use the actual purchase-order lookup, explicit existing read fields and all continuation pages under the caller's table permissions.
Bulk reads group up to 50 visible PO IDs within the fixed reader's filter budget rather than issuing a request per PO.
The linked-invoice detail table also filters by that lookup instead of a loose PO-number search.
The displayed Invoiced amount remains the actual sum, available Remaining stops at zero, and any excess is shown separately as **Over-invoiced**.
The progress track is capped visually without hiding the amount or percentage above the PO total.
Amounts use the existing monetary values without currency conversion or stored balance/status updates.
Historical records need no migration; the totals are recalculated when read.
Failed or malformed invoice reads surface an error instead of a successful zero balance.

The shipping solution retains the existing Information card/main/quick forms, seven saved views and ribbon metadata for each of the four website-used business tables.
It also includes **Active supplier accounts** and the additive **Portal Contact (Enhanced)** assignment grid.
The package contains 13 forms and 29 views in total.
Cleanup excludes unused tables and unrelated feature components; it preserves table-owned UI exports when the website uses the table.
Primary keys/names, state/status, ownership/audit metadata, currency/base amounts and file-column relationships remain because they support Dataverse storage and the website's API paths.
The existing solution contract and actual ZIP tests require the exact retained table/UI component sets, validate their field references and reject unrelated components.
These are source/package selections; they do not remove schema, forms, views, records or permissions from an existing environment.

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
   Also associate that same Account in **Assigned supplier accounts** so Company validation and Invoice Account lookup binding have scoped Read/Append eligibility.
   A supplier-only Contact must not have extra memberships.
5. For a Contact with both roles, Company Name remains its single supplier affiliation.
   N:N membership may include additional reviewer businesses.
   Permissions are additive across assigned roles; switching the UI role mode does not revoke server privileges.
   Invoice submission requires the actual Supplier role; dual-role Contacts can submit in either presentation mode, while Reviewer-only Contacts cannot open the submission form.
   In Supplier presentation mode, **My POs** excludes Draft records in the request filter and status selector.
   Reviewer presentation retains Draft visibility.
   This list behavior does not change table permissions or revoke a dual-role Contact's Reviewer grants.
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
The local source grants scoped Append on the business Account roots, business Self Contact and Supplier-only PO permission, while omitting AppendTo on those four records.
The captured PO validator requires AppendTo on the primary PO and Append on its referenced Account; the deployed grants in that trace denied the latter.
Reviewer PO Append/AppendTo/Create/Write remain unchanged.
The corrected flags have been deployed; the tested create paths and remaining negative association gates are described below.
Account Read exposes minimal identity/category/state fields for associated Accounts.
The Supplier service validates the exact Company Name Account by ID and fails on a missing, inaccessible, inactive or non-Supplier company; it never substitutes another reviewer assignment.
Direct portal association/disassociation requests in either direction must not be used to administer memberships.

Run `npm run assignments:validate` from `website-code/` to check the shipped sample roles and affiliations.
For an administrator-exported snapshot, run `scripts/validate-assignments.mjs` with `--input=<file>` and explicit `--supplier-contact=<guid>` / `--reviewer-contact=<guid>` arguments from that site's role assignments.
The snapshot uses the seed/export table shape and collection-valued Account bind arrays.
This local check does not mutate or audit a live environment.
It reports the specific Account and whether Category or state excludes it, including Company Name diagnostics.

Power Pages documents a [known OData GET issue with N:N/Parent permission chains](https://learn.microsoft.com/power-pages/configure/web-api-overview#known-issues).
Supplier and Contact reads use the [Power Pages Web API](https://learn.microsoft.com/power-pages/configure/read-operations) with explicit OData `$select`, typed `$filter` and `$orderby` options.
Invoice and purchase-order collections and counts use the `invoice-po-reads` server-logic GET endpoint because the shipped N:N/Parent permission graph reproduces the documented OData relationship-query failure.
Comment and attachment collections and counts also use that endpoint after their invoice-filtered OData requests returned HTTP 400.
That endpoint accepts only those four tables, whitelisted read projections, typed filters, supported sorts and bounded paging parameters.
It uses the same caller-scoped Dataverse connector as the working dashboard aggregates, with internal SDK FetchXML rather than browser-generated XML.
The server projects lookup IDs and formatted names back to the same OData-shaped domain contract.
Single-record reads retain ordinary OData; invoice and purchase-order reads use that server endpoint only for the exact captured relationship-error signature.
Lookup reads and filters use enabled `_name_value` properties; relationship bindings retain their metadata-defined, case-sensitive navigation names such as `spnvc_SupplierAccountId`.
Do not replace a lookup read alias with its logical column name or widen the field list to `*`.
Ordinary OData page size uses `Prefer: odata.maxpagesize`; `$top` is reserved for bounded queries such as counts.
Scoped server reads preserve paging cookies or probe full simple-paging pages rather than silently returning one page.
Continuation links stay on the portal origin and original entity set, and malformed responses or pagination limits fail explicitly.
The platform caps OData `$count` at 5,000 matching rows; grouped dashboard totals remain on server logic.
Supplier-mode lists and list summaries filter by the validated Self Contact Company Name Account.
Reviewer reads rely on existing N:N assignments; permissions remain additive for dual-role Contacts.
The existing `dashboard-aggregates` server logic handles grouped counts and amount totals through the caller-scoped Dataverse connector; its internal aggregate queries are unchanged.
The read endpoint uses the existing server-logic runtime and business roles.
No privileged backend, Global business permission, column profile, Account membership change or new cloud dependency is introduced.
Server-script prefix checks use `indexOf` because a captured hosting-validation trace rejected a standard string-prefix method before the handler executed.
The regression checks the exact case-insensitive matcher from that trace.
Keep this compatibility workaround until the host's [restricted-pattern validation](https://learn.microsoft.com/power-pages/configure/author-server-logic#limitations) checks keyword boundaries.

The captured PO `403 / 90040101` reported the unenabled logical `spnvc_supplieraccountid` selected by the retired FetchXML builder.
The OData path preserves the enabled `_spnvc_supplieraccountid_value` read alias.
The captured invoice `500 / 9004010A` was generic and did not establish a root cause.
The follow-on OData capture reports invoice and PO `400 / 9004010D`, with inner code `0x80040216` and message `entityRelationshipRole for given navigation property not found`.
Live invoice and Account/Contact navigation metadata matched the source contract; no relationship or table permission was widened to work around that query failure.
The later invoice-detail capture identifies HTTP 400 on comment and attachment collection requests, with the same enabled fields and invoice-ID filters used by the source.
Their response bodies were not captured, so their inner platform error remains unknown.
Local request fixtures reproduce those errors and check the migrated wire contract; they do not prove live OData compatibility or table-permission enforcement.
Verify the deployed lists, record reads, comments, attachments and summaries using assigned and unassigned portal Contacts before relying on the change.
API failures are surfaced to the UI rather than displayed as empty data or successful zero totals.
Create-response handling accepts the native Power Pages `entityid` GUID header as well as OData record URLs, then reads back the created record before reporting success.
Permission-denied requests fail without automatic replay.
Only safe reads retry transient responses; writes retry only an explicit anti-forgery rejection, which occurs before persistence.
Mutating server-logic RPCs never retry, including on a hosting `90040107` response, because the client cannot establish whether the handler already performed work.
These client fixes do not resolve a server-side association denial.
Earlier captured creates returned `403 / 90040106` for Contact-to-Invoice and Account-to-PO associations.
The request-correlated PO trace grants Create and AppendTo on the primary PO, then denies Append on the referenced Account.
Its `CreateRecord` stack reaches the same native Web API association validator, so the SDK does not bypass that denial.
The corresponding invoice Contact Append check has not been established by an invoice-correlated SDK trace.
Do not widen grants beyond the reviewed four-record correction or remove provenance links to hide the failure.
The local correction changes only `Append: false` to `true` and `AppendTo: true` to `false` on these records:

| Permission | Role | Scope |
| --- | --- | --- |
| Account - Supplier Binding | Supplier | Contact through Account-Contact N:N |
| Account - Reviewer Assignments | Reviewer | Contact through Account-Contact N:N |
| Contact - Self | Supplier and Reviewer | Self |
| Purchase Order - Read | Supplier | Account through the supplier lookup |

Read/Write/Create/Delete, roles, IDs, relationships, parents, scopes and Web API fields are unchanged.
The Supplier-only PO flag matters because an invoice references that PO; a dual-role test could conceal a missing Supplier grant through additive Reviewer permissions.
Source regressions model the captured POST privilege direction and the Supplier-only, Reviewer-only, dual-role and default Authenticated cases, including comment and attachment lookup edges.
They do not prove native creation, new-row scope enforcement or Company/N:N protection.
Root AppendTo remains unavailable in all exported Contact/Account grants, but the separate PATCH, PUT/POST `$ref` and DELETE validators still need native negative evidence in both relationship directions.
Same-value bindings, duplicate associations and nonexistent-link probes can return an idempotent success or conflict before checking the relevant privilege, so those outcomes are inconclusive.
Every live write probe needs separate bounded consent; do not clear a real Company affiliation or remove a real membership to test denial.

The create prototype uses separate `submit-invoice` (Supplier role) and `create-purchase-order` (Reviewer role) server-logic endpoints.
They call the documented caller-scoped Dataverse `CreateRecord` connector under the existing table permissions.
Invoice requests contain only the invoice number, description, amount, due date, selected PO ID and initial Draft/Submitted status.
The server derives the submitter from `Server.User.contactid`, verifies its Self Contact read, and derives Company from that Contact's Account-type Company Name lookup.
It requires an accessible active Supplier Account and an accessible Issued/Partially Invoiced PO belonging to that Company, derives the PO number, and assigns submission time on the server.
Browser-supplied Contact/Company/PO-number/time hints are not forwarded as authority.
PO requests contain the PO number, description, positive amount, optional delivery date and selected Supplier Account ID; new POs start as Draft.
The Reviewer endpoint independently reads and validates that active Supplier Account in the caller's existing assignment scope, without restricting reviewers to their single Company.
Both endpoints also provide a fixed read-only GET preflight: `submit-invoice?purchaseOrderId=<id>` or `create-purchase-order?supplierId=<id>`.
Selecting a PO or Supplier in the corresponding form runs that preflight and blocks submission when the prerequisites cannot be verified.
The preflight verifies the exact server identity accessor, Self Contact and related records without invoking `CreateRecord`; it returns only readiness with `creationVerified: false`, never tokens, identities or record dumps.
A preflight pass does not prove that the native association/create check succeeds.
Both endpoints reject unknown fields and malformed values, create at most once, extract a real SDK-created ID, and read back the persisted fields and associations before returning success.
SDK denials remain explicit; ambiguous or accepted-but-unverified results tell the user to check existing records before resubmitting, with no automatic create retry or OData fallback.
The captured SDK association failure is thrown as an `Error executing POST request to '<entity set>': {"error":...}` wrapper rather than returned as a failure envelope.
The local classifier recognizes only the expected operation/table prefix, captured `90040106` inner signature and schema-only association message, and reports `httpStatus: 403` with `persistence: "rejected"`.
Malformed or unrecognized exceptions remain unknown; errors after create acceptance remain accepted-but-unverified.
The RPC host can still return HTTP 200 with its outer `success: true` wrapper, so clients must inspect the application result rather than treat HTTP status as persistence proof.
The exception-classifier correction does not change grants or enable creation.
The host blocks runtime imports, so `scripts/postbuild.js` generates both role-bound scripts from one `scripts/business-create-server.js` source.
Use `npm run build` to regenerate those exports; do not edit their generated `.js` files directly.
Both endpoints have been deployed, and captured read-only preflights returned `ready: true` with `creationVerified: false`.
Before the association-flag correction, the tested creates did not establish successful persistence; narrow searches observed no matching record, and the PO trace confirmed an association rejection.
The exception-classifier and four scoped association-flag corrections have since been deployed.
One separately approved PO create and one invoice submission succeeded through the normal forms for a Contact with both Supplier and Reviewer roles.
The scoped lists showed the new Draft PO and Submitted invoice, and their detail pages retained the approved values after full browser reloads.
Independent bounded receipts found exactly one matching record each and verified the approved fields, actual currency and invoice Contact/Company/PO associations.
The create HTTP response bodies were not captured, so no exact POST status is claimed.
Existing invoice detail, comments and attachment reads also passed on the tested path.
These positive results do not establish Supplier-only, Reviewer-only, unassigned-Contact or cross-Company enforcement.
Native Company updates and N:N association/disassociation denial in both directions remain unverified.
Any further create or negative association probe requires fresh, bounded consent; local fixtures and successful preflights do not prove creation success or native ACL enforcement.
Invoice-list AI summarization is intentionally absent because both the native collection query and Company-record expansion reproduce the nested relationship permission limitation.
The invoice list has no AI card, loading/error state, refinement controls or hidden summarization requests when its filters change.
Normal Company scoping, list counts, search, sorting and pagination are unchanged.
The Reviewer queue continues to use its existing collection-summary path and can still encounter that compatibility error.
Single-invoice and single-PO summaries are unchanged.
Their shared native AI service, enablement and prompt settings remain intact.

Run `node --test tests/odataRequests.test.mjs tests/businessReads.test.mjs tests/supplierService.test.mjs tests/invoiceService.test.mjs` from `website-code/` for request regressions.
The retained HAR-derived fixture contains only endpoint paths, status codes and schema/error names, without headers, cookies, tokens or record data.

Invoice comments use the signed-in Contact's display name and initials for optimistic rendering, matching the existing caller Contact bindings instead of a fictional demo author.
After a comment is saved, detail readback runs in the background without replacing the page or resetting a new unsent comment.
A failed refresh retains the displayed detail and shows an explicit error; a failed create removes the optimistic entry without replaying the write.
The existing parent-scoped comment and attachment permissions are unchanged.

## Edit your profile

The `/myprofile` page loads the signed-in portal Contact and saves First Name, Last Name, Email Address, Phone Number and Job Title through the Power Pages Web API.
This SPA route avoids the host-owned `/profile` route, whose full-page navigation redirects to the native `/profile/` page.
The native route and site configuration are unchanged.
First Name and Last Name are separate fields because Dataverse computes `fullname`; the form never writes it or splits a display name.
Last Name is required.
The page waits for the Contact PATCH and a fresh Contact read before showing success, then refreshes the profile header and sidebar identity.
Failed reads or saves show an error instead of a success message.
If the PATCH succeeds but the readback fails, the error explains that the change was saved but could not be reloaded.
Switching Supplier/Reviewer presentation mode preserves the Contact, its saved profile and its existing web-role grants.

Company Name is read-only and comes from the Contact's formatted Company Name lookup.
Company assignments, Account memberships, ownership, roles and sign-in credentials are intended to remain administrator-managed.
The form writes only `firstname`, `lastname`, `emailaddress1`, `telephone1` and `jobtitle`.
It does not submit login identifiers, password fields or identity-provider settings.
Real profiles show empty fields when Contact data is missing; they do not substitute fictional company details.
On `localhost` or `127.0.0.1`, demo profiles are stored separately per fictional Contact in this browser's local storage and never update Dataverse.

Every signed-in Contact receives the site's default Authenticated Users role.
A separate Contact permission grants that role Self Read/Write for its own profile, without Append, AppendTo, Create or Delete.
It grants no Account, invoice, purchase-order, comment or attachment access.
Supplier and Reviewer retain Self Contact Read/Write; the local association correction enables Self Append and omits Self AppendTo for business-record references.
The page hides invoice statistics and business navigation for users without either business role and labels them Authenticated User.
Signing in does not assign Supplier or Reviewer, and the UI must not infer those grants from a selected presentation mode.
This template ships no column permission profiles.
Self access restricts rows to the signed-in Contact; it does not restrict which fields on that row are writable.
The Contact Web API field list therefore contains only eight explicit properties: the five editable fields, `contactid`, `fullname` and `_parentcustomerid_value`.
Keep `Webapi/contact/UseFieldsFromView` disabled or absent (its default is false); view-derived fields would be combined with the list and could widen this exposure.
The Contact ID and computed Full Name are not valid for update.
Dataverse documents [lookup properties](https://learn.microsoft.com/power-apps/developer/data-platform/webapi/web-api-properties#lookup-properties) such as `_parentcustomerid_value` as computed, read-only values.
Changing a lookup uses its separate single-valued navigation property.
The writable logical `parentcustomerid` and its Account/Contact navigation properties are deliberately absent from the field list.
No caller in this template needs the logical lookup name for a Contact read.
An `Attribute _parentcustomerid_value ... is not enabled for Web Api` error means the lookup read alias is missing from the deployed field setting.
Keep that read alias without restoring `parentcustomerid`, enabling navigation write properties or using a wildcard.
Account and membership relationships, roles, scopes, CRUD and field exposure are unchanged; only the four reviewed association-flag pairs differ locally.
Business Self Contact Append is a relationship privilege, not a general field guard, and the default Authenticated grant still denies Append and AppendTo.
The five-field client PATCH and read-only Company card are also not server authorization.
Before relying on Company being administrator-managed, verify the target portal rejects direct Company updates and both navigation bindings and `$ref` changes under each supported role.
Read-only Dataverse metadata establishes primitive mutability; it does not prove how the portal maps a permitted read alias into navigation authorization.
The source tests model explicit field exposure and documented read-only properties, not that live mapping.
If the portal permits a Company mutation through an allowed lookup alias, use a trusted server endpoint that accepts only the five profile fields and leave the Contact Web API read-only.
Do not deploy a wider field list or treat the absence of an editable Company control as protection.

Deploy the Self grants and narrow field setting together.
Uploading only the rebuilt frontend does not establish portal authorization.
If Profile reports a Contact read denial, confirm the authenticated Contact ID, the active site's default Authenticated Users role, its Self grant and the Web API enabled/field settings.
An external login identifier or a Supplier label in the client is not proof of Contact identity or server permission.
Configuration changes must reach the portal's server-side cache before retesting; a browser reload alone does not prove that happened.

Confirm the target authorization mode and test the exact exposed operations with dedicated test Contacts before production use.
The enhanced data model used to store website components is separate from the authorization model.
Source tests, offline PAC serialization and locally routed browser fixtures do not prove a deployed site's permissions or relationship-write restrictions.
Live save and denial checks require separate authorization and are not performed by repository tests.

Run the profile caller and permission regressions from `website-code/`:

```bash
node --test tests/profile.test.mjs tests/profilePermissions.test.mjs tests/profilePacImport.test.mjs
```

The browser fixtures route every request locally, including the real-authentication code path.
They check first-sign-in profile access without business roles, persistence, response-before-success, failure states, duplicate submissions, identity refresh, role-mode switching, desktop/mobile layout and browser-only demo isolation.
The PAC regression invokes the installed importer's directory parser offline and checks the eight-property Contact field setting and narrow Authenticated Users Self grant.
It skips when the .NET 10 PAC tool or required runtime is unavailable; source permission checks still run.
No test uploads configuration or changes live records.

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
The unreleased candidate also needs an authorized fresh-environment import check; warning-free packing is not proof of a successful import.
Repository tests and local mock UI checks do not prove live Dataverse import or portal authorization.
The existing status-based UI edit locks are preserved; table permissions do not enforce invoice-status transitions.
