# Power Pages templates

Templates are installable Power Pages starting points.
They are different from `samples/`: templates are meant to be imported into an environment, while samples are learning examples that explain a pattern or capability.

The central catalog is [`manifest.json`](manifest.json).
Each entry is a template family with one or more variants.
The family defines shared metadata, preview images, required Dataverse languages, and optional seed data.
Each variant defines its template version.
The schema for the catalog is [`schemas/templates-manifest.schema.json`](schemas/templates-manifest.schema.json).

Variant artifacts use a fixed layout, so the manifest does not repeat derivable paths:

```text
templates/<kind>/<template-id>/variants/<variant>/
├── website-code/
└── solutions/
    └── <solution-unique-name>/
```

The `solutions/` directory must contain at least one unpacked solution as a direct child.
The folder name must exactly match the solution unique name in `Other/Solution.xml`.
When a variant has multiple solutions, import them in case-insensitive lexical unique-name order.
Sibling solutions must be independently importable and must not depend on each other.

## Template categories

- [SPA templates](spa/) - installable code-site templates built with frontend frameworks.

## Use a template

1. Open the template folder.
1. Choose the variant you want to install.
1. Follow the template README to pack and import the variant's unmanaged solutions.
1. Import the seed data separately when the template includes `seed-data/data.json`.
1. Deploy the website content from the variant's `website-code/` folder as described in the template README.
1. Review any template-specific prerequisites, such as Dataverse features or Power Pages Admin Center settings.

The repository stores each unmanaged solution as reviewable source under the variant's `solutions/<solution-unique-name>/` directory.
Pack and import every direct solution folder in case-insensitive lexical unique-name order.
The Power Platform CLI solution import command imports the packed solution only.
It does not import the JSON seed data.
Dataverse export seed tables must use the exact logical name, entity set name, primary key, column logical names, and lookup navigation properties from the unpacked solution metadata.
Write lookups as `<NavigationProperty>@odata.bind` with `/<entitySetName>(<guid>)`, and order parent tables before tables that reference them.
For SPA templates, the solution contains supporting Dataverse artifacts and does not contain the Power Pages website.
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
