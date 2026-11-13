# SPA previews

Use the variant's documented development command and prerequisites to start its server.
Check that it is ready, then inspect the actual pages in a browser at desktop and mobile viewport sizes.
For each page, capture real PNG screenshots under `templates/spa/<id>/previews/` named `desktop-<page-id>.png` and `mobile-<page-id>.png`.
List both paths with the page ID and display name in the manifest's `responsivePreviews`.
Keep `previewImages` on existing SPA manifest entries as a deprecated desktop-image fallback for released consumers; new entries do not add it.
Check for clipped, empty, loading, or error states and verify the site attribution is present.
Use safe, representative local data; do not expose credentials or personal data in images.
Stop the server after capture unless the contributor asks to keep it running.

If dependencies, the server, data, browser access, or a viewport prevents capture, report the exact blocker and missing images.
An empty preview list can satisfy the schema but does not complete this workflow.
