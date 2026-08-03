# Template anatomy

Reference for the exact shapes the `templates/` catalog expects.
Read this when writing the folder, the README, the manifest entry, or the seed data.

## Contents

- [Families and variants](#families-and-variants)
- [Folder layout](#folder-layout)
- [Manifest entry](#manifest-entry)
- [README structure](#readme-structure)
- [Seed data shapes](#seed-data-shapes)
- [What the validator enforces](#what-the-validator-enforces)

## Families and variants

A **family** is one scenario, such as `311-portal`.
It owns the metadata a catalog visitor reads: display name, description, keywords, audience, previews, required languages, and seed data.

A **variant** is one framework build of that scenario, such as `react`.
It owns the things that differ per build: the solution zip and its `templateVersion`.

A family needs at least one variant, and a variant's framework is the key it is stored under: `react`, `vue`, `angular`, or `astro`.

Previews, seed data, and required languages are declared once at the family level and can be overridden per variant.
Override only when a variant genuinely differs.
Duplicating identical previews across variants adds weight to the repository without helping anyone choose a template.

## Folder layout

```
templates/
├── manifest.json                     catalog, one entry per family
├── schemas/templates-manifest.schema.json
├── scripts/validate-templates.js     validator run by CI
├── <kind>/README.md                  index table for that kind
└── <kind>/<id>/
    ├── README.md
    ├── previews/                     shared across variants
    │   ├── README.md
    │   └── *.png
    ├── seed-data/                    optional, shared across variants
    │   ├── data.json
    │   └── files/                    only when file columns are seeded
    └── variants/<framework>/
        ├── solution/<name>-unmanaged.zip
        ├── previews/                 optional, only when this variant differs
        └── seed-data/                optional, only when this variant differs
```

`<kind>` is `spa` or `traditional`.
The folder name under `<kind>/` must equal the manifest `id`, and the id must be stable kebab-case, because installers and links reference it.

`templates/traditional/` does not exist yet.
Create it when the first traditional template ships.

## Manifest entry

```json
{
  "id": "311-portal",
  "displayName": "311 Portal",
  "description": "A Power Pages SPA template for citizen service requests, request tracking, city service maps, knowledge articles, and 311 contact flows.",
  "kind": "spa",
  "keywords": ["311", "citizen-services", "service-requests"],
  "audience": ["makers", "developers"],
  "previewImages": [
    "spa/311-portal/previews/home.png",
    "spa/311-portal/previews/map.png"
  ],
  "seedDataPath": "spa/311-portal/seed-data/data.json",
  "requiredDataverseLanguages": [1033],
  "author": "Microsoft",
  "variants": {
    "react": {
      "templateVersion": "1.0.0.2",
      "solutionPath": "spa/311-portal/variants/react/solution/311-portal-unmanaged.zip"
    }
  }
}
```

### Family fields

| Field | Rule | Enforced by |
| --- | --- | --- |
| `id` | kebab-case | schema and validator |
| `id` | unique, and matches the folder name under `<kind>/` | validator |
| `displayName`, `description`, `author` | required, non-empty | schema |
| `kind` | `spa` or `traditional` | schema |
| `keywords` | at least one, no duplicates | schema |
| `audience` | at least one of `admins`, `developers`, `makers`, `partners` | schema |
| `previewImages` | `.png` paths, no duplicates | schema |
| `previewImages` | each resolves to a committed file under `<kind>/<id>/previews/` | validator |
| `seedDataPath` | `.json` path, omit when unused | schema |
| `seedDataPath` | resolves under `<kind>/<id>/seed-data/` | validator |
| `requiredDataverseLanguages` | required, at least one positive integer LCID, no duplicates | schema |
| `variants` | required, at least one entry | schema |
| `variants` keys | `angular`, `astro`, `react`, or `vue` | schema and validator |

Every family field except `seedDataPath` is required.
There is no top-level `framework`, `solutionPath`, or `templateVersion`. Those moved into the variants.

### Variant fields

| Field | Rule | Enforced by |
| --- | --- | --- |
| `templateVersion` | required, three or four dot-separated numbers, such as `1.0.0` or `1.0.0.2` | schema |
| `solutionPath` | required, `.zip` path | schema |
| `solutionPath` | resolves to a real, non-empty zip containing `solution.xml`, under `<kind>/<id>/variants/<framework>/solution/` | validator |
| `solutionPath` | points at an unmanaged export | validator warns by default, errors under `--enforce-unmanaged` |
| `previewImages` | optional override, `.png` paths | schema |
| `previewImages` | resolve under `variants/<framework>/previews/` | validator |
| `seedDataPath` | optional override, `.json` path | schema |
| `seedDataPath` | resolves under `variants/<framework>/seed-data/` | validator |
| `requiredDataverseLanguages` | optional override, same rules as the family field | schema |

No other properties are allowed at either level.
All paths are relative to `templates/`, and the validator checks each one against the folder it is supposed to live in, so a file in the wrong folder fails even when it exists.

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
confirm the required Dataverse languages, pac auth create,
pac solution import for a named variant, verify, then import seed data.>

<Prose about the seed data shape, where files live, and why Dataverse
spreadsheet import will not work for it.>

## Customize this template
<Only when the solution contains site source files.>
```

Notes on individual sections:

**Facts about the zip.** State the managed state and publisher prefix, and mention dependencies the target environment needs. The 311 Portal README does this for its knowledge-article dependency.

**Previews.** Two per row reads well. Use alt text that describes the page, not the file name.

**Use this template manually.** These steps exist because the Power Platform CLI imports the solution zip but not the seed JSON, because `*.js` is blocked by default in Power Pages environments, and because a missing Dataverse language fails the import. All three trip people up, so all three are called out every time.

Name the variant in the import step, the way the 311 Portal README says "Import the React variant's unmanaged solution". Once a family has two variants, "the solution" is ambiguous.

**Customize this template.** Include only when the zip has files under `powerpagessourcefiles/`. The point of the section is that the import carries the app source, so a person can round-trip it:

```bash
pac pages download-code-site --webSiteId <website-id> --path <download-path> --overwrite
# edit and build
pac pages upload-code-site --rootPath ./<id>
```

## Seed data shapes

The validator accepts two shapes.
Both attach files the same way, with the reserved `__files` key described in [Attaching files](#attaching-files).

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
    "invoiceAttachments": {
      "logicalName": "spnvc_invoiceattachment",
      "entitySet": "spnvc_invoiceattachments",
      "idColumn": "spnvc_invoiceattachmentid",
      "records": [
        {
          "spnvc_invoiceattachmentid": "791bafe1-da26-f111-8341-000d3a37e531",
          "spnvc_name": "laptop-order-receipt.pdf",
          "__files": {
            "spnvc_file": "files/791bafe1-da26-f111-8341-000d3a37e531-laptop-order-receipt.pdf"
          }
        }
      ]
    }
  }
}
```

Table keys are friendly names you choose.
`logicalName` and `entitySet` are required per table and must be non-empty.

Order matters: `tables` is read top to bottom, so parents come before the children that look them up.

### Single-entity shape

Use this only when the template seeds one table and needs nothing else.

```json
{
  "entitySetName": "accounts",
  "primaryKey": "accountid",
  "records": [
    {
      "accountid": "11111111-1111-1111-1111-111111111111",
      "name": "Contoso",
      "__files": {
        "sample_contract": "files/contract.pdf"
      }
    }
  ]
}
```

`primaryKey` is only required when a record uses `__files`.

### Attaching files

`__files` is a reserved key on a record that maps a Dataverse **file column** logical name to a path relative to the seed-data JSON file.
File columns are the only attachment target supported today.

```json
"__files": { "spnvc_file": "files/contract.pdf" }
```

The importer uploads each file against the record it belongs to, addressed by primary key, so two things have to be true:

- The seed file declares its primary key column: top-level `primaryKey` in the single-entity shape, or the table's `idColumn` in the Dataverse export shape.
- Every record with `__files` spells out an explicit GUID in that column instead of letting Dataverse generate one.

Supported file types are `pdf`, `png`, `jpg`, `jpeg`, `txt`, `csv`, `json`, `docx`, `xlsx`.
Store the files under the seed-data folder, conventionally in `files/`.
Prefixing each file name with the owning record id keeps names unique when two records attach files that are otherwise named the same.

The retired `fileAttachments` array and top-level `fileExports` array are rejected by the validator.
Neither is read by the create-site runtime, so a template using them would import with no files attached.

## What the validator enforces

`node templates/scripts/validate-templates.js` fails on:

- A manifest entry that breaks the schema, including unknown properties at the family or variant level.
- A folder under `templates/<kind>/` with no manifest entry, and the reverse.
- A variant key that is not `angular`, `astro`, `react`, or `vue`.
- A path that resolves outside the folder it belongs to, such as a solution zip that is not under `variants/<framework>/solution/`.
- A `previewImages` path that is not a `.png` or does not exist.
- A `solutionPath` that is missing, empty, a Git LFS pointer, not a real zip, or has no `solution.xml`.
- A `solution.xml` with no readable `<Managed>` value.
- Seed data that is not an object, or a table entry missing `logicalName`, `entitySet`, or a `records` array.
- A record using the retired `fileAttachments` array, or a seed file using the retired top-level `fileExports` array.
- A `__files` value that is not a non-empty object.
- A record attaching files when the seed data declares no primary key column, or when that column does not hold an explicit GUID.
- A `__files` path that does not exist, is empty, is a Git LFS pointer, escapes the seed-data folder, or uses a file type outside `pdf`, `png`, `jpg`, `jpeg`, `txt`, `csv`, `json`, `docx`, `xlsx`.
- Any referenced path that escapes `templates/`.

Managed solutions are a warning by default and an error under `--enforce-unmanaged`.
Ship unmanaged either way, so people can customize what they import.
