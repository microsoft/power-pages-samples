# Supplier Account provisioning and migration

A supplier business is a standard Dataverse Account with Account Category (`accountcategorycode`) set to Supplier (`132140000`).
The existing Preferred Customer (`1`) and Standard (`2`) categories remain unchanged.
The custom choice value follows the solution publisher's `13214` option-value prefix.
New purchase orders require an active Supplier Account (`statecode=0`).
Existing financial records may still refer to inactive suppliers for historical display.

The Account customization includes the Category column, native N:N relationship and filtered Management view.
It does not recreate the Account table, ship unrelated Account forms or views, or add custom versions of standard name, phone, email, address, or state columns.
Review the Category option value for collisions with target-environment customizations before importing.

## Fresh provisioning

Pack the shared unmanaged solution using the commands in the [template README](../../../../README.md).
Import the solution before importing `seed-data/data.json`.
The solution import does not import the JSON seed data.

Use the seed table order.
Sample Accounts come first, then Contacts, purchase orders, invoices, comments, and attachments.
The ten Account records retain the deterministic IDs of the former sample supplier records, now as `accountid`.
Every sample Account has Supplier Category and active Account state.
Later supplier lookup bindings use `/accounts(<accountid>)`.

Create or upsert sample Accounts by exact GUID only.
Never match a sample Account to an existing customer by name, email, or another loose key.
If an existing Account has the same GUID but is not the intended sample record, stop and review the conflict.
Do not overwrite its category or state.
Do not import demo data into a production environment.

The sample supplier Contact is linked to its demo Account through `parentcustomerid_account@odata.bind`.
That company association grants access to the company's purchase orders and invoices without requiring a primary-contact designation.
Supplier invoice access is company-wide, not restricted to the submitting Contact.
Comments and attachments inherit the Invoice's authorization.
The sample reviewer remains a separate Contact.
Assign web roles deliberately after provisioning; Account Category does not grant a portal role.

Reviewer assignments use the native `spnvc_account_contact` N:N relationship.
The sample Reviewer Contact is assigned two Supplier Accounts.
Fresh Contact creation includes `spnvc_account_contact@odata.bind` arrays after Account creation.
The sample Supplier's Company Name Account is also in N:N membership for scoped Account Read/AppendTo.
Runtime Company validation reads only the exact Company Name Account ID and rejects missing membership, inactive state, or non-Supplier category.
N:N scoped Account Read exposes associated records; it is not a per-role company restriction for dual-role Contacts.
Do not upsert the platform-managed intersect as a business table.
The current installer preserves collection bind arrays in Contact POSTs but skips existing Contact conflicts; it does not reconcile associations on replay.

For existing Contacts, administrators must review and add/remove assignments in Management.
A Dataverse association request can also use `POST /api/data/v9.2/contacts(<contactid>)/spnvc_account_contact/$ref`, with an **absolute** target URL in `@odata.id`.
For example, `{"@odata.id":"https://YOUR-ENVIRONMENT.crm.dynamics.com/api/data/v9.2/accounts(<accountid>)"}`.
Relative paths are supported for the seed's `@odata.bind` arrays, not for `$ref`'s `@odata.id`.
No such live request is run by this repository.

The fictional financial-example Contacts are normalized to the two seeded Contacts.
Money records omit source-environment currency GUIDs.
Review the importing user's target currency before importing the USD examples, and set an explicit target USD currency lookup in a prepared copy if needed.
Do not create arbitrary currency records from source-environment GUIDs.
Preserve financial amounts and relationships when preparing a target-specific copy.

Create attachment records before uploading the file-column binaries listed in `fileExports`.
Dataverse spreadsheet import does not preserve this seed format's lookup bindings or upload file-column binaries.

## Existing installations

The retired custom table is `spnvc_supplier`.
Its old invoice and purchase-order lookup column is `spnvc_supplierid`, with `spnvc_SupplierId` as the navigation property.
The replacement Account lookup is a new column, `spnvc_supplieraccountid`, with navigation property `spnvc_SupplierAccountId`.
These are new relationships, not a claim that an existing lookup can be retargeted in place.

An unmanaged solution update leaves retired tables, columns, data, site settings, and permissions in the environment.
It does not map old suppliers to Accounts or backfill new lookup columns.
Removing old components from this repository is not a destructive migration script.

1. Back up the environment and export existing supplier, Contact, PO, invoice, comment, and attachment records.
   Record the existing website version and permissions for rollback.
2. In a test environment, import the supporting solution and verify Category options and the new Account-targeted lookup metadata.
   Preserve existing custom Account categories and resolve any `132140000` collision before proceeding.
3. Build an explicit old-supplier-ID to Account-ID mapping.
   Reuse a real business Account only after a person verifies the business identity.
   If no approved match exists, create a new Account with standard fields and record the mapping.
   Do not match or overwrite customers automatically.
4. Set Supplier Category only on reviewed supplier businesses.
   Review legacy supplier statuses rather than treating Pending, Suspended, and Inactive as active suppliers.
   The new assignment rule uses standard Account state and has no separate pending or suspended status column.
5. Set each supplier Contact's Company Name to its approved Account.
   Multiple Contacts can share the same Account.
   A Contact's Supplier web role, business membership, and invoice ownership are separate decisions.
   Associate that Company Account in `spnvc_account_contact` for scoped Company validation and target binding.
   Supplier-only Contacts must have no extra memberships.
   Add each Reviewer's approved businesses through the separate N:N relationship.
   Dual-role users retain one Company Name affiliation and may have additional reviewer memberships.
   Run the assignment configuration validator with actual site role assignments.
6. Backfill the new PO and invoice Account lookups using the approved mapping.
   Verify every invoice's supplier matches its PO's supplier and preserve the invoice submitter.
   Keep invoice statuses Draft (`1`), Submitted (`2`), Approved (`5`), Rejected (`6`), and Paid (`7`) unchanged.
7. Verify Account-scoped Supplier PO/invoice access, Parent-scoped comments/attachments, reviewer assignment, downloads, and rejected-invoice edits with separate supplier Contacts.
   Check direct API requests as well as dropdowns.
   Confirm ordinary customer Accounts and other suppliers are inaccessible to supplier users.
   Test reviewer A/B assignment against unassigned C, missing membership, removed membership, and dual-role effective permissions.
   Reviewer N:N removal revokes reviewer access; changing Supplier Company Name changes supplier affiliation independently.
   Remove old default-authenticated and global grants that otherwise bypass the new scopes.
   Verify both-direction portal membership `$ref` operations fail because Account and Contact Append are denied.
8. Deploy the new website only after lookup backfill and permission checks pass.
   Retire old Supplier Web API settings and old global supplier/PO permissions explicitly.
   Keep a rollback plan until the new paths work in the target environment.
9. Delete retired schema or data only in a separately authorized cleanup after reviewing dependencies and retention requirements.
   Do not delete it as part of this template's installation.

No live import, deployment, or destructive migration is authorized or performed by the repository's build, tests, documentation generator, or solution packing.

## Management customization and configuration limits

The solution adds an **Assigned Supplier Accounts** subgrid to the **General** tab of the existing **Portal Contact (Enhanced)** form (`c1c97961-2d42-4103-abf8-2fe2bdf38224`).
It also ships the N:N Contact associated menu **Assigned supplier accounts** and a separate **Active supplier accounts** public view.
The form component is a native unmanaged differential export with one added section and control.
Company Name remains the single supplier affiliation; the grid manages the separate N:N memberships.
Existing controls, events, libraries, localizations and form security conditions remain in the installed base form.
The solution requires that first-party enhanced Contact form from Power Pages Runtime Core and does not clone or replace the Management app or sitemap.
Open that form in Power Pages Management and use the grid's native Add Existing Account and Remove commands.
Remove unlinks an N:N assignment without deleting the Account.
The default grid view selects active Supplier Accounts; administrators must still review assignment consistency.
If the target uses another Contact form, or a customization hides the General tab or its controls, review the form layers and app form selection before provisioning.
Publish the affected Account and Contact customizations after unmanaged import.
Table-level publication also publishes other pending customizations on those tables; obtain the environment owner's consent before doing so.

Administrators maintain valid Supplier categories, active Account state, and Company Name/membership consistency.
The scalar Company Name lookup provides one supplier affiliation; native N:N still allows multiple reviewer assignments.
Filtered views and local configuration validation assist administration but are not Dataverse-wide enforcement of every administrator or API edit.
There is no plug-in or preview authorization feature.
Status-based invoice editing restrictions remain UI behavior, not a row-status rule enforced by table permissions.

## Microsoft references

- [Account metadata and standard Category values](https://learn.microsoft.com/power-apps/developer/data-platform/reference/entities/account)
- [Create and customize choices](https://learn.microsoft.com/power-apps/maker/data-platform/create-edit-global-option-sets)
- [Use segmented tables in solutions](https://learn.microsoft.com/power-apps/maker/data-platform/create-solution#use-segmented-tables-in-a-solution)
- [Create table relationships](https://learn.microsoft.com/power-apps/maker/data-platform/create-edit-entity-relationships)
- [Power Pages table permissions](https://learn.microsoft.com/power-pages/security/table-permissions)
- [N:N associated navigation display options](https://learn.microsoft.com/power-apps/maker/data-platform/create-edit-nn-relationships-solution-explorer#edit-display-options)
- [Management Contact form and enhanced-model web role administration](https://learn.microsoft.com/power-pages/security/create-web-roles#from-the-contact-enhanced-data-model)
- [Native differential form export and form solution layers](https://learn.microsoft.com/power-platform/alm/form-alm)
- [Association on creation](https://learn.microsoft.com/power-apps/developer/data-platform/webapi/create-entity-web-api#associate-table-rows-on-create)
- [Collection-valued associations and absolute `$ref` targets](https://learn.microsoft.com/power-apps/developer/data-platform/webapi/associate-disassociate-entities-using-web-api#using-collection-valued-navigation-properties)
- [Portal association permission error codes](https://learn.microsoft.com/power-pages/configure/web-api-http-requests-handle-errors#error-codes)
