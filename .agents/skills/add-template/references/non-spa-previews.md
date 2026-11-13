# Non-SPA previews

Liquid and web templates need a real Power Pages runtime.
Use [PAC pages documentation](https://learn.microsoft.com/power-platform/developer/cli/reference/pages), [PAC power-pages documentation](https://learn.microsoft.com/power-platform/developer/cli/reference/power-pages), and the installed `pac ... help` for current commands and options.
The [Power Pages create-site non-SPA workflow](https://github.com/microsoft/power-platform-skills/blob/main/plugins/power-pages/skills/create-site/workflows/non-spa-site.md) explains Enhanced data model prerequisites; [activate-site](https://github.com/microsoft/power-platform-skills/blob/main/plugins/power-pages/skills/activate-site/SKILL.md) explains provisioning an existing website record.

1. Check PAC authentication and list/select a Dataverse environment with `pac auth who`, `pac env list`, and `pac env select`; confirm the selected environment with `pac env who`.
   Ask the contributor to choose the exact environment and an appropriate test site.
   Verify the tenant, site identity, data model, and prerequisites, including administrator confirmation of the Enhanced data model setting when creating a new Enhanced site.
2. Show the environment, website, intended solution and seed imports, upload, any provisioning, public visibility, and possible shared-environment impact.
   Obtain explicit approval before external changes.
   Use `pac pages upload` with the actual export path and model version supported by the installed CLI.
   Check its result and resolve the uploaded website record in the selected environment.
3. If the selected site is already provisioned, use its existing URL.
   If the uploaded record needs activation, confirm the record ID, site name, language, subdomain, environment, cloud, and exact operation; obtain explicit approval for activation.
   Use a currently documented provisioning method that supports that existing record, such as the installed `pac power-pages create-website` when its help and prerequisites support the operation.
   Creating a website from a platform template already provisions it; starting a stopped website is a different operation and does not activate a new record.
   Poll the accepted operation and verify the resulting URL before proceeding.
4. Inspect the live site at desktop and mobile viewport sizes and capture representative real PNGs in `templates/non-spa/<id>/previews/`.
   For each page, save `desktop-<page-id>.png` and `mobile-<page-id>.png`, then declare the pair in `responsivePreviews` with its page ID and display name.
   Confirm the badge and content render correctly.
   Use only safe, non-sensitive preview data.

If access, approval, environment selection, upload, activation, browser access, or screenshots are blocked, report the failing step and retain local artifacts.
Do not substitute mock images or claim the site was activated.
