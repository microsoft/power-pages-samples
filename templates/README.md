# Power Pages templates

Templates are installable Power Pages starting points.
They are different from `samples/`: templates are meant to be imported into an environment, while samples are learning examples that explain a pattern or capability.

The central catalog is [`manifest.json`](manifest.json).
Each entry points to a solution zip, preview images, and optional seed data.
The schema for the catalog is [`schemas/templates-manifest.schema.json`](schemas/templates-manifest.schema.json).

## Template categories

- [SPA templates](spa/) - installable code-site templates built with frontend frameworks.

## Use a template

1. Open the template folder.
1. Follow the template README to import its unmanaged solution zip.
1. Import the seed data separately when the template includes `seed/data.json`.
1. Review any template-specific prerequisites, such as Dataverse features or Power Pages Admin Center settings.

The Power Platform CLI solution import command imports the solution zip only.
It does not import the JSON seed data.

## Validate templates

Run the validator from the repository root:

```bash
node templates/scripts/validate-templates.js
```

Run the validator tests when changing the contract:

```bash
node --test templates/scripts/validate-templates.test.js
```
