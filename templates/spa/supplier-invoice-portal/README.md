# Supplier Invoice Portal template

This folder contains the Supplier Invoice Portal template entry for the installable `templates/` catalog.

The checked-in solution zip is the managed export supplied for this ticket.
The validator detects that status from `solution.xml` and prints a warning during normal validation.
If a downstream release gate requires unmanaged template solutions, replace `solution/supplier-invoice-portal-managed.zip` with an unmanaged export and update `templates/manifest.json`.

Preview PNGs are included under `previews/`.
The deployed preview URL redirects to Microsoft sign-in, so these screenshots were captured from the solution-bundled SPA assets served locally with mock data.
The local capture hides the AI summary panels because they call tenant APIs that are unavailable in a static preview server.
If seed data is needed, add a JSON file whose shape is `{ "entitySetName": "<plural entity set>", "records": [...] }` and set `seedDataPath`.
Seed-data records can include `fileAttachments` for local files.
Attachment `filePath` values are relative to the seed-data JSON file and must stay inside that seed-data folder.
