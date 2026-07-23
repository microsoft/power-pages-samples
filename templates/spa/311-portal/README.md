# 311 Portal template

This folder contains the 311 Portal template entry for the installable `templates/` catalog.

The checked-in solution zip is an unmanaged export with the `spa311` publisher prefix.
The solution metadata lists a dependency on Dataverse knowledge articles through `msdynce_KnowledgeManagementFeatures`.

Preview PNGs are included under `previews/`.
They were captured from the supplied local site build at `~/Downloads/templates-work/311-portal/Site/Zava 311 wo Node`.
The service catalog and service detail pages were not used for previews because they need Dataverse data at runtime.

Seed data is included under `seed/`.
The seed data uses a Dataverse export shape with `tables`.
It does not include file exports.
