# Supplier Invoice Portal template

This folder contains the Supplier Invoice Portal template entry for the installable `templates/` catalog.

The checked-in solution zip is the managed export supplied for this ticket.
The validator detects that status from `solution.xml` and prints a warning during normal validation.
If a downstream release gate requires unmanaged template solutions, replace `solution/supplier-invoice-portal-managed.zip` with an unmanaged export and update `templates/manifest.json`.

Preview PNGs and seed data are not included yet.
Add PNG screenshots under `previews/` and list them in `templates/manifest.json` when they are available.
If seed data is needed, add a JSON file whose shape is `{ "entitySetName": "<plural entity set>", "records": [...] }` and set `seedDataPath`.
