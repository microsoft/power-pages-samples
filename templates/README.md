# Power Pages templates

Templates are installable Power Pages starting points.
They are different from `samples/`: templates are meant to be imported into an environment, while samples are learning examples that explain a pattern or capability.

The central catalog is [`manifest.json`](manifest.json).
Each entry is a template family with one or more framework variants.
The family defines shared metadata, preview images, required Dataverse languages, and optional seed data.
Each variant defines its template version, supporting solution zip, and downloadable SPA code project.
The schema for the catalog is [`schemas/templates-manifest.schema.json`](schemas/templates-manifest.schema.json).

## Template categories

- [SPA templates](spa/) - installable code-site templates built with frontend frameworks.

## Use a template

1. Open the template folder.
1. Choose the framework variant you want to install.
1. Follow the template README to import that variant's unmanaged supporting solution zip.
1. Import the seed data separately when the template includes `seed-data/data.json`.
1. Upload the code site from the variant's `spa-code/` folder.
1. Review any template-specific prerequisites, such as Dataverse features or Power Pages Admin Center settings.

The Power Platform CLI solution import command imports the solution zip only.
It does not import the JSON seed data.
The solution contains supporting Dataverse artifacts and does not contain the Power Pages website.

Catalog paths are relative to `templates/manifest.json`.
Consumers must resolve a release tag to a commit SHA and fetch the manifest, solution, SPA code, seed data, and previews from that same immutable revision.

## Validate templates

Run the validator from the repository root:

```bash
node templates/scripts/validate-templates.js
```

Run the validator tests when changing the contract:

```bash
node --test templates/scripts/validate-templates.test.js
```
