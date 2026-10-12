# Power Pages templates

Templates are Power Pages starting points that are either installed from repository artifacts or
provisioned by a documented platform API.
They are different from `samples/`: templates are meant to be imported into an environment, while samples are learning examples that explain a pattern or capability.

The central catalog is [`manifest.json`](manifest.json).
Each entry is a template family. Repository-artifact entries define one or more downloadable
variants, shared metadata, preview images, required Dataverse languages, and optional seed data.
The optional family-level `solutions` array defines publication behavior for unpacked solutions.
Each item names an exact, case-sensitive `solutions/<uniqueName>/` folder and sets `publishChanges` to `true` or `false`.
For `publishChanges: true`, consumers import that solution with `pac solution import --publish-changes`.
For `false` or an omitted `solutions` field, consumers import without the flag.
The PAC publication step can include other pending customizations in the target environment; it is not solution-scoped.
Platform-provisioned entries instead define the exact provisioning contract and presentation
metadata needed by catalog consumers.
The schema for the catalog is [`schemas/templates-manifest.schema.json`](schemas/templates-manifest.schema.json).

Repository-artifact templates use a fixed layout, so the manifest does not repeat derivable paths:

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

Each template family has one shared `solutions/` directory.
It must contain at least one unpacked solution as a direct child.
The folder name must exactly match the solution unique name in `Other/Solution.xml`.
When a family has multiple solutions, import them in case-insensitive lexical unique-name order.
Sibling solutions must be independently importable and must not depend on each other.
Framework variants contain only their `website-code/` directory.

Platform-provisioned traditional templates declare:

- `provisioning.type: "create-website-api"`
- the exact `provisioning.templateName` submitted to the Create Website API
- presentation metadata in `capabilities`, `requirements`, `warning`, and `responsivePreviews`

These entries do not define variants, required Dataverse languages, seed data, or flat
`previewImages`. Their directories contain only documentation and samples-owned presentation
assets such as the paired desktop/mobile images declared in `responsivePreviews`; they do not
duplicate the website source or solutions provisioned by the platform.

## Template categories

- [SPA templates](spa/) - installable code-site templates built with frontend frameworks.
- [Traditional templates](traditional/) - platform-provisioned Power Pages templates and
  traditional repository-artifact templates.

## Use a template

For a repository-artifact template:

1. Open the template folder.
1. Choose the variant you want to install.
1. Follow the template README to pack and import the family's shared unmanaged solutions.
1. Import the seed data separately when the template includes `seed-data/data.json`.
1. Deploy the website content from the variant's `website-code/` folder as described in the template README.
1. Review any template-specific prerequisites, such as Dataverse features or Power Pages Admin Center settings.

For a platform-provisioned traditional template, use a consumer that supports its declared
`provisioning.type`. The consumer must submit the exact `templateName`, enforce its own
documented creation prerequisites, and fetch the catalog and previews from the same immutable
revision.

The repository stores each unmanaged solution as reviewable source under the template family's `solutions/<solution-unique-name>/` directory.
Pack and import every direct solution folder in case-insensitive lexical unique-name order.
The Power Platform CLI solution import command imports the packed solution only.
It does not import the JSON seed data.
Dataverse export seed tables must use the exact logical name, entity set name, primary key, column logical names, and lookup navigation properties from the unpacked solution metadata.
Write lookups as `<NavigationProperty>@odata.bind` with `/<entitySetName>(<guid>)`, and order parent tables before tables that reference them.
For SPA templates, the shared solutions contain supporting Dataverse artifacts and do not contain the Power Pages website.
Traditional solutions may include Power Pages website components.

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
