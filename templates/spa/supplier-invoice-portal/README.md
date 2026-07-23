# Supplier Invoice Portal template

This folder contains the Supplier Invoice Portal template entry for the installable `templates/` catalog.

The checked-in solution zip is an unmanaged export with the `spnvc` publisher prefix.
The validator detects the managed state from `solution.xml` during validation.

Preview PNGs are included under `previews/`.
The deployed preview URL redirects to Microsoft sign-in, so these screenshots were captured from the supplied local site build at `~/Downloads/templates-work/supplier-invoice-portal/Site/supplier-invoice-portal`.
The local capture hides the AI summary panels because they call tenant APIs that are unavailable in a static preview server.

Seed data is included under `seed/`.
The seed data uses a Dataverse export shape with `tables` and `fileExports`.
Files referenced from `fileExports` are stored under `seed/files/`.
