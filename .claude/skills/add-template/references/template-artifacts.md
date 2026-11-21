# Template artifacts

Use the repository's current manifest schema, validator, `templates/README.md`, and neighboring template as the contract.
Template contributions are distinct from learning samples.
Follow `CONTRIBUTING.md` for general contribution and CLA requirements.

## Plan and implement

- Choose a stable kebab-case ID and an appropriate family under `templates/spa/<id>/` or `templates/non-spa/<id>/`.
  This workflow produces repository-owned artifacts, not metadata for a platform-owned Create Website API template.
- Record `dataModel` as:
  - `platform-only` when the template relies only on the SDM/EDM Power Pages platform tables already created in Dataverse and adds no template-owned domain solution or seed package.
  - `custom` when the template adds custom business tables through a supporting unmanaged solution and ships representative Dataverse seed data.
  Platform-only does not mean "no Dataverse"; every Power Pages site has platform website metadata in Dataverse.
- Specify the pages, workflows, audience, accessibility, authentication, web roles, table permissions, languages, and every table, column, relationship, choice, and external dependency needed by the site.
  Confirm the publisher identity and any Dataverse publisher prefix with the contributor; do not attribute an external contribution to Microsoft by default.
- For a SPA, use a supported static framework and a runnable local development setup.
  New React drafts start with `node templates/scripts/create-template.js --spec <spec.json> --output <draft-parent>`.
  The spec contains the approved identity, audience, routes, page summaries, and representative seed data.
  The command refuses invalid input and existing targets, copies the canonical Power Pages attribution, and creates the standard Playwright, accessibility-report, preview, and quality configuration.
  Consult the [Power Pages create-site skill](https://github.com/microsoft/power-platform-skills/blob/main/plugins/power-pages/skills/create-site/SKILL.md) for discovery and scaffold guidance.
  For Liquid, use the [non-SPA workflow](https://github.com/microsoft/power-platform-skills/blob/main/plugins/power-pages/skills/create-site/workflows/non-spa-site.md) and a real Power Pages export rather than inventing platform metadata.
  These links are references, not an assumption that the plugin is installed; follow its instructions only when their prerequisites and user consent are satisfied.
- Include the attribution used by `templates/spa/311-portal/variants/react/website-code/src/components/PowerPagesBadge.tsx`, its CSS, and logo.
  Adapt it to the selected framework or shared Liquid layout, preserving accessible attribution and responsive usability without assuming React is available.
- Put website artifacts in `variants/<framework>/website-code/`; use `none` for a Liquid variant if the current contract permits it.
  The current non-SPA validator expects the export at `website-code/.powerpages-site/`, including `website.yml`.
  Follow the current validator's rules for site metadata and generated or local-only files.
  For `custom`, keep the family's supporting solutions and seed data shared across variants.
  For `platform-only`, omit `solutions/`, `seed-data/`, solution publication metadata, and `seedDataPath`.
  For both modes, follow [inactive code-site automation](code-site-automation.md) to obtain the real `.powerpages-site`
  required by the current clone-based installer without activating the authoring site.

## Solution and seed data

- For a `custom` data model, design the final schema before writing seed records.
  Include required customizations and site dependencies, such as roles, permissions, configuration, and website components where applicable, in the unmanaged solution or document external prerequisites that cannot be packaged.
  Use the [data model](https://github.com/microsoft/power-platform-skills/blob/main/plugins/power-pages/skills/setup-datamodel/SKILL.md), [solution](https://github.com/microsoft/power-platform-skills/blob/main/plugins/power-pages/skills/setup-solution/SKILL.md), and [sample data](https://github.com/microsoft/power-platform-skills/blob/main/plugins/power-pages/skills/add-sample-data/SKILL.md) references when relevant.
  Before any Dataverse write, show the environment, schema, and changes and obtain explicit approval.
  For supported custom metadata, use [Dataverse solution automation](dataverse-solution-automation.md) to create an immutable local plan, apply only an explicitly approved plan hash, and export the resulting authoritative unmanaged solution.
- Export and unpack an **unmanaged** solution into `solutions/<uniqueName>/`, with an exact match to `Other/Solution.xml`.
  Use PAC help and current official documentation for the installed version.
  Keep temporary ZIPs outside the repository.
  Include dependencies or document prerequisites; sibling solutions must be independently importable.
  The template README must explain import order, publication, setup, and any required privileges.
- Create representative, non-sensitive seed data for the final schema in `seed-data/`.
  Match actual solution metadata for logical names, entity sets, IDs, columns, navigation properties, lookup bindings, and parent-before-child ordering.
  Include required file-column assets and document how to import data separately from the solution.
  Confirm the seed records make the intended flows usable rather than merely passing structural validation.
  After the solution export validates, follow [seed data automation](seed-data-automation.md) to plan against live metadata, obtain approval for the exact record plan, and verify every upserted record and lookup.

## Catalog and checks

- Add a repository-artifact entry to `templates/manifest.json`, including actual author, languages, variants, previews, and seed path.
  Always include the approved `dataModel`; include solution and seed metadata only for `custom`.
  New React SPA templates generated through this workflow set `qualityStandard: 1` and follow [template quality gates](quality-gates.md).
  Every template uses per-page desktop/mobile pairs in `responsivePreviews`.
  Keep `previewImages` on the existing SPA entries as a deprecated fallback for released consumers; new entries use only `responsivePreviews`.
  Add solution publication metadata when needed.
  Do not use `provisioning.type: create-website-api` for a repository-owned site.
- Update the relevant template index and any directly affected contribution documentation.
  The GitHub Pages catalog is generated by `site/build.mjs` from the manifest.
  Inspect its handling of the new entry and its generated create-site prompt.
  Repository-artifact non-SPA entries use `responsivePreviews` and link to their installation README rather than using a platform provisioning prompt.
  Verify that the entry's real previews, publisher, and install path are represented accurately.
- Run the repository-local exceptional-web-design skill after real previews exist. Fix every critical gate and category below 3, then bind the final scorecard to the current source with `templates/scripts/write-design-review.js`.
- Run `node templates/scripts/validate-templates.js` and `node site/build.mjs --out <temporary-output-directory>`.
  Run the relevant website build, lint and tests, plus focused catalog tests if catalog behavior changed.
  Inspect the generated catalog entry and previews.
