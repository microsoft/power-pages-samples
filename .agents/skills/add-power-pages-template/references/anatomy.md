# Template anatomy

Reference for the exact shapes the `templates/` catalog expects.
Read this when writing the folder, the README, the manifest entry, or the seed data.

## Contents

- [Folder layout](#folder-layout)
- [Manifest entry](#manifest-entry)
- [README structure](#readme-structure)
- [Seed data shapes](#seed-data-shapes)
- [What the validator enforces](#what-the-validator-enforces)

## Folder layout

```
templates/
├── manifest.json                     catalog, one entry per template
├── schemas/templates-manifest.schema.json
├── scripts/validate-templates.js     validator run by CI
├── <kind>/README.md                  index table for that kind
└── <kind>/<id>/
    ├── README.md
    ├── solution/<name>-unmanaged.zip
    ├── previews/
    │   ├── README.md
    │   └── *.png
    └── seed/                         optional
        ├── data.json
        └── files/                    only when file columns are seeded
```

`<kind>` is `spa` or `traditional`.
The folder name under `<kind>/` must equal the manifest `id`, and the id must be stable kebab-case, because installers and links reference it.

`templates/traditional/` does not exist yet.
Create it when the first traditional template ships.

## Manifest entry

```json
{
  "id": "supplier-invoice-portal",
  "displayName": "Supplier Invoice Portal",
  "description": "A Power Pages SPA template for supplier onboarding, purchase orders, invoice submission, invoice review, and invoice tracking.",
  "kind": "spa",
  "framework": "react",
  "keywords": ["supplier", "invoice", "portal", "purchase-order", "approval"],
  "audience": ["makers", "developers"],
  "previewImages": [
    "spa/supplier-invoice-portal/previews/home.png",
    "spa/supplier-invoice-portal/previews/list.png"
  ],
  "solutionPath": "spa/supplier-invoice-portal/solution/supplier-invoice-spa-portal-unmanaged.zip",
  "seedDataPath": "spa/supplier-invoice-portal/seed/data.json",
  "templateVersion": "1.0.0.1",
  "author": "Microsoft"
}
```

Field rules:

| Field | Rule | Enforced by |
| --- | --- | --- |
| `id` | kebab-case | schema |
| `id` | unique, and matches the folder name under `<kind>/` | validator |
| `displayName`, `description`, `author` | required, non-empty | schema |
| `kind` | `spa` or `traditional` | schema |
| `framework` | `angular`, `react`, `vue`, `none`, or `other` | schema |
| `keywords` | at least one, no duplicates | schema |
| `audience` | at least one of `admins`, `developers`, `makers`, `partners` | schema |
| `previewImages` | `.png` paths, no duplicates | schema |
| `previewImages` | each path resolves to a committed file under `templates/` | validator |
| `solutionPath` | `.zip` path | schema |
| `solutionPath` | resolves to a real, non-empty zip containing `solution.xml` | validator |
| `seedDataPath` | `.json` path, omit when unused | schema |
| `templateVersion` | `1.0.0` or `1.0.0.1` | schema |

All fields except `seedDataPath` are required.
No other properties are allowed.
Paths are relative to `templates/`.
Order the preview images the way you want them read: the first one is the thumbnail used in index tables.

## README structure

Follow the order the existing templates use, so readers can move between templates without relearning the layout.

```markdown
# <Display Name> template

<One paragraph: what this folder is.>

<One or two lines of facts about the zip: unmanaged, publisher prefix,
and any dependency the solution metadata declares.>

## Previews

<Two-column tables of the preview PNGs, with descriptive alt text.>

## Use this template manually

<Numbered steps: install pac, unblock *.js in Power Pages Admin Center,
confirm English LCID 1033, pac auth create, pac solution import,
verify, then import seed data.>

<Prose about the seed data shape, where files live, and why Dataverse
spreadsheet import will not work for it.>

## Customize this template
<Only when the solution contains site source files.>
```

Notes on individual sections:

**Facts about the zip.** State the managed state and publisher prefix, and mention dependencies the target environment needs. The 311 Portal README does this for its knowledge-article dependency.

**Previews.** Two per row reads well. Use alt text that describes the page, not the file name.

**Use this template manually.** These steps exist because the Power Platform CLI imports the solution zip but not the seed JSON, and because `*.js` is blocked by default in Power Pages environments. Both trip people up, so both are called out every time.

**Customize this template.** Include only when the zip has files under `powerpagessourcefiles/`. The point of the section is that the import carries the app source, so a person can round-trip it:

```bash
pac pages download-code-site --webSiteId <website-id> --path <download-path> --overwrite
# edit and build
pac pages upload-code-site --rootPath ./<id>
```

## Seed data shapes

The validator accepts two shapes.

### Dataverse export shape

Use this for anything with more than one table, or with file columns.

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-06-04T09:29:14.250Z",
  "sourceEnvironmentUrl": "https://example.crm.dynamics.com",
  "notes": [
    "Records use stable GUIDs so an importer can safely upsert them."
  ],
  "tables": {
    "suppliers": {
      "logicalName": "spnvc_supplier",
      "entitySet": "spnvc_suppliers",
      "idColumn": "spnvc_supplierid",
      "records": []
    }
  },
  "fileExports": [
    {
      "attachmentId": "00000000-0000-0000-0000-000000000000",
      "fileColumn": "spnvc_file",
      "fileName": "contract.pdf",
      "contentType": "application/pdf",
      "size": 12345,
      "path": "files/00000000-0000-0000-0000-000000000000-contract.pdf"
    }
  ]
}
```

Table keys are friendly names you choose.
`logicalName` and `entitySet` are required per table and must be non-empty.

`fileExports[].size` must match the real byte size of the file on disk, and `path` is relative to `data.json` and must stay inside the seed folder.
Prefixing file names with the attachment id keeps them unique when two records attach files with the same name.

Order matters: `tables` is read top to bottom, so parents come before the children that look them up.

### Single-entity shape

Use this only when the template seeds one table and needs nothing else.

```json
{
  "entitySetName": "accounts",
  "records": [
    {
      "name": "Contoso",
      "fileAttachments": [
        {
          "columnName": "sample_contract",
          "filePath": "files/contract.pdf",
          "fileName": "contract.pdf",
          "mimeType": "application/pdf"
        }
      ]
    }
  ]
}
```

`fileAttachments` is optional, and `columnName` plus `filePath` are required when present.

## What the validator enforces

`node templates/scripts/validate-templates.js` fails on:

- A manifest entry that breaks the schema, including unknown properties.
- A folder under `templates/<kind>/` with no manifest entry, and the reverse.
- A `previewImages` path that is not a `.png` or does not exist.
- A `solutionPath` that is missing, empty, a Git LFS pointer, not a real zip, or has no `solution.xml`.
- A `solution.xml` with no readable `<Managed>` value.
- Seed data that is not an object, or a table entry missing `logicalName`, `entitySet`, or a `records` array.
- A seed file reference that does not exist, is empty, escapes the seed folder, or whose declared `size` disagrees with the file on disk.
- Any referenced path that escapes `templates/`.

Managed solutions are a warning by default and an error under `--enforce-unmanaged`.
Ship unmanaged either way, so people can customize what they import.
