# Power Pages templates

Templates are Power Pages starting points that are either installed from repository artifacts or
provisioned by a documented platform API.
They are different from `samples/`: templates are meant to be imported into an environment, while samples are learning examples that explain a pattern or capability.

The central catalog is [`manifest.json`](manifest.json).
Each entry is a template family. Repository-artifact entries define one or more downloadable
variants, shared metadata, preview images, required Dataverse languages, and a `dataModel` scope.
`platform-only` templates use the SDM/EDM Power Pages platform tables already present in Dataverse
and add no custom business solution or seed package. `custom` templates add template-owned
Dataverse tables through unpacked supporting solutions and representative seed data.
Every template uses `responsivePreviews` with a desktop/mobile pair for each page.
Existing SPA entries retain `previewImages` as a deprecated fallback for released consumers.
The optional family-level `solutions` array defines publication behavior for unpacked solutions.
Each item names an exact, case-sensitive `solutions/<uniqueName>/` folder and sets `publishChanges` to `true` or `false`.
For `publishChanges: true`, consumers import that solution with `pac solution import --publish-changes`.
For `false` or an omitted `solutions` field, consumers import without the flag.
The PAC publication step can include other pending customizations in the target environment; it is not solution-scoped.
Platform-provisioned entries instead define the exact provisioning contract and presentation
metadata needed by catalog consumers.
New React SPA templates generated through the repository skill set `qualityStandard: 1`.
Those variants must include standard build/test/accessibility/quality scripts, Playwright axe-core
results rendered with Microsoft's `accessibility-insights-report`
package under `docs/a11y-reports/`, a zero-finding CodeQL SARIF under `docs/codeql-reports/`,
an exceptional-web-design scorecard under `docs/design-review/`, and a source-bound quality manifest.
The design scorecard must cover all declared routes at desktop and mobile, score every rubric
category at least 3, total at least 30/40, and pass every critical gate.
Custom templates additionally require representative Dataverse seed data; platform-only templates
may use local fixture data but must not ship `solutions/` or `seed-data/`.
The validator rejects missing, failing, or stale evidence, and template CI runs each declared
quality-standard variant automatically.
Use the repository-local `test-template` skill to validate either an integrated family or an independently authored
template project. It discovers React, Angular, Vue, Astro, generic package-based SPA, and PAC-downloaded non-SPA
projects, then runs the checks supported by that project without substituting package managers or inventing evidence.
`add-template` invokes `test-template` for local, platform, and clean-consumer phases.
The schema for the catalog is [`schemas/templates-manifest.schema.json`](schemas/templates-manifest.schema.json).

The current create-site consumer clones repository templates, so every repository-artifact variant must include a real
PAC-generated `.powerpages-site`. Use `templates/scripts/code-site.js` to create an inactive source record and verify its
identity. This packaging step does not activate the site or create a public URL.

After authoritative site and Dataverse artifacts exist, the `add-template` workflow also runs the existing Power Pages
permission, security, and ALM reviews. A complete contribution requires a permissions audit with no major issues, a
Code & config security review with no unresolved blocking findings, and a complete `plan-alm` classification of
credential-style and environment-specific settings on the disposable consumer clone. After activation, the Release
readiness security review adds live-site, header, and firewall evidence. Review reports and environment-specific ALM
plans produced in a disposable clone remain verification artifacts; do not copy them into the template package.

Custom repository-artifact templates use a fixed layout, so the manifest does not repeat derivable paths:

```text
templates/<kind>/<template-id>/
├── previews/
├── seed-data/
├── solutions/
│   └── <solution-unique-name>/
└── variants/
    └── <framework>/
        └── website-code/
```

Each `custom` template family has one shared `solutions/` directory.
It must contain at least one unpacked solution as a direct child.
The folder name must exactly match the solution unique name in `Other/Solution.xml`.
When a family has multiple solutions, import them in case-insensitive lexical unique-name order.
Sibling solutions must be independently importable and must not depend on each other.
Framework variants contain only their `website-code/` directory.
Platform-only families contain `previews/` and `variants/` but omit `solutions/` and `seed-data/`.
Their deployed Power Pages site still has the platform SDM/EDM website records and tables.

Platform-provisioned non-SPA templates declare:

- `provisioning.type: "create-website-api"`
- the exact `provisioning.templateName` submitted to the Create Website API
- presentation metadata in `capabilities`, `requirements`, `warning`, and `responsivePreviews`

These entries do not define variants, required Dataverse languages, seed data, solution
publication metadata (`solutions`), or flat `previewImages`. Their directories contain only
documentation and samples-owned presentation assets such as the paired desktop/mobile images
declared in `responsivePreviews`; they do not duplicate the website source or solutions
provisioned by the platform.

## Template categories

- [SPA templates](spa/) - installable SPA templates built with frontend frameworks.
- [Non-SPA templates](non-spa/) - platform-provisioned Power Pages templates and
  non-SPA repository-artifact templates.

## Start a React template draft

Create an approved intent JSON file outside the repository with `schemaVersion`, a kebab-case `id`,
`displayName`, `description`, `author`, supported `audience` values, at least one route
(`id`, `path`, `displayName`, and `summary`), and `dataModel`.
Use `platform-only` with optional local `sampleData`, or `custom` with representative
Dataverse-shaped `seedData`.
Then run:

```powershell
node templates\scripts\create-template.js --spec <spec.json> --output <draft-parent>
```

The command refuses invalid input and existing targets. It creates the canonical React source,
Power Pages attribution, Playwright tests, automated accessibility reporting, preview capture,
quality contract, and family folders. It intentionally does not fabricate solution XML,
`.powerpages-site/`, preview PNGs, accessibility reports, or CodeQL results; downstream stages
must create those artifacts with their real tools.

## Automate a custom Dataverse solution

For supported custom metadata, create a Dataverse JSON specification outside the repository and run:

```powershell
node templates\scripts\dataverse-solution.js plan --spec <spec.json> --out <plan.json>
node templates\scripts\dataverse-solution.js approval --plan <plan.json> --environment <environment-url>
```

The plan supports publishers, unmanaged solutions, custom tables, common scalar columns, local
choices, and one-to-many relationships. It derives exact schema names and choice values, lists
every write, and produces an immutable content hash. The approval command binds that plan to one
normalized environment URL.

After reviewing the environment and execution hash, use the `apply` command only with explicit
approval. It uses PAC environment selection plus an environment-scoped Azure CLI token without
printing the token, calls Dataverse `WhoAmI` before writes, associates metadata with the unmanaged
solution, fails closed on existing target tables or relationships, publishes, and writes a
partial-progress journal. The `export` command uses PAC to export and unpack the real
unmanaged solution and verifies `Other/Solution.xml`; it never synthesizes solution XML locally.

## Use a template

For a repository-artifact template:

1. Open the template folder.
1. Choose the variant you want to install.
1. For `custom`, follow the template README to pack and import the family's shared unmanaged solutions.
1. For `custom`, import the seed data separately when the template includes `seed-data/data.json`.
1. For `platform-only`, skip custom solution and seed import; the deployed site still uses its Power Pages SDM/EDM platform tables.
1. Deploy the website content from the variant's `website-code/` folder as described in the template README.
1. Review any template-specific prerequisites, such as Dataverse features or Power Pages Admin Center settings.

For a platform-provisioned non-SPA template, use a consumer that supports its declared
`provisioning.type`. The consumer must submit the exact `templateName`, enforce its own
documented creation prerequisites, and fetch the catalog and previews from the same immutable
revision.

For `custom`, the repository stores each unmanaged solution as reviewable source under the template family's `solutions/<solution-unique-name>/` directory.
Pack and import every direct solution folder in case-insensitive lexical unique-name order.
The Power Platform CLI solution import command imports the packed solution only.
It does not import the JSON seed data.
For a reviewed custom-template environment, use `templates/scripts/seed-data.js plan` to verify the seed package against
live metadata and select an existing currency when money columns are present. Apply only the approved immutable plan;
the importer upserts stable IDs in authored table order and verifies scalar values and lookups after every write.
Dataverse export seed tables must use the exact logical name, entity set name, primary key, column logical names, and lookup navigation properties from the unpacked solution metadata.
Write lookups as `<NavigationProperty>@odata.bind` with `/<entitySetName>(<guid>)`, and order parent tables before tables that reference them.
For SPA templates, the shared solutions contain supporting Dataverse artifacts and do not contain the Power Pages website.
Non-SPA solutions may include Power Pages website components.

Catalog paths are relative to `templates/manifest.json`.
Consumers must resolve a release tag to a commit SHA and fetch the manifest and applicable template assets from that same immutable revision.

## Validate templates

Run the validator from the repository root:

```bash
node templates/scripts/validate-templates.js
```

Run the validator tests when changing the contract:

```bash
node --test templates/scripts/validate-templates.test.js
```
