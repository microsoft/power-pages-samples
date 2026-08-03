---
name: add-power-pages-template
description: Power Pages template contributor. Use when the user wants to add, contribute, onboard, or register a new installable template or framework variant under templates/ from a Power Pages website or an unmanaged solution zip, including wiring up the badge, preview screenshots, seed data, README, and templates/manifest.json.
argument-hint: "[path or name of the solution zip]"
---

# Add a Power Pages template

Turn a Power Pages site into a committed, installable entry under `templates/`.

Someone who finds the template in the catalog has to understand what it does from the previews, import it without guessing at prerequisites, and land on a site with realistic data.
The step order below is what avoids rework: everything that changes the site itself happens before the zip is exported and the screenshots are taken.

The catalog is organised as **families and variants**.
A family is the scenario, such as `311-portal`, and owns the shared metadata, previews, and seed data.
A variant is one framework build of that scenario, such as `react`, and owns its own solution zip and version.
So there are two jobs this skill covers, and Step 1 decides which one you are doing:

- Adding a new family, which means all nine steps.
- Adding a variant to a family that already exists, which is a much shorter path described in [Adding a variant to an existing family](#adding-a-variant-to-an-existing-family).

Read [references/anatomy.md](references/anatomy.md) for the exact folder layout, README section order, manifest fields, and seed-data shapes.

## Step 1: Collect the inputs

Ask the user for the unmanaged solution zip if they have not already provided one.
Say what it needs to contain, because a zip that is missing the site or its dependencies wastes the rest of the workflow:

- The Power Pages website and its site components.
- Every dependency the site needs to run: Dataverse tables, cloud flows, connection references, security roles, environment variables.
- The site source files, when the template should be customizable after import. This part is optional, and Step 7 documents it when present.

Check `templates/manifest.json` for a family that already covers this scenario.
If one exists, this is a variant addition, so jump to [Adding a variant to an existing family](#adding-a-variant-to-an-existing-family).

Otherwise settle the family identity with the user:

- `id` in kebab-case, which is also the folder name under `templates/<kind>/<id>/`.
- `displayName` and a one-sentence `description` that names the scenario, not the technology.
- `kind`, either `spa` or `traditional`.
- The framework this first variant is built with: `react`, `vue`, `angular`, or `astro`.
- `keywords`, `audience`, and `author`.

Ask for the environment URL of a working deployment of the site too.
The badge and the previews both need a running site, so without one you will have to import the zip somewhere before you can finish.

Completion criterion: you know whether this is a new family or a new variant, and you have the zip on disk, the identity, and either a live site URL or an environment you can import into.

## Step 2: Inspect the zip before trusting it

Run the bundled inspector rather than unzipping by hand:

```bash
node .agents/skills/add-power-pages-template/scripts/inspect-solution-zip.js <path-to-zip>
```

Add `--list-source-files` to see the site source files, and `--json` when you want to pipe the result somewhere.

Read the output for six things:

- **Managed state.** Templates ship unmanaged so people can customize what they import. A managed zip is a blocker, not a warning to work around: ask the user for an unmanaged export.
- **Site presence.** Zero site components means the website was not added to the solution.
- **Site source files.** Their presence decides whether the README gets a "Customize this template" section in Step 7.
- **Missing dependencies.** These are prerequisites the target environment must already have. The 311 Portal template documents its knowledge-article dependency this way. Anything listed here belongs in the template README.
- **Solution version.** This becomes the variant's `templateVersion`, so the catalog and the zip agree.
- **Languages.** These LCIDs become `requiredDataverseLanguages`. They are the languages the target environment must have installed before the import will succeed, so reading them from the zip beats assuming `[1033]`.

The table list is your seed-data inventory for Step 6, so keep it.

If `--list-source-files` shows files that are not part of the app (planning notes, design docs, screenshots, test scripts, scratch JSON), tell the user.
Those get published to every environment that imports the template, so they are worth cleaning up at the source before re-exporting.

Completion criterion: the zip is unmanaged, contains a site, and you can list its tables, dependencies, version, languages, and whether it carries site source files.

## Step 3: Add the Power Pages badge

Every template in the catalog carries the "Built with Microsoft Power Pages" badge.
Follow [add-power-pages-badge](../add-power-pages-badge/SKILL.md) to add it.

Check first whether the site already has it.
A `PowerPages_scalable*.svg` entry in the inspector's file list, or the badge showing on the live site, means you can skip ahead.
Say so rather than repeating the work.

The badge lives in the site's own source, so it cannot be patched into the committed zip.
It has to go in before the export:

```bash
# find the site id if you do not have it
pac pages list

pac pages download-code-site --webSiteId <website-id> --path <download-path> --overwrite
# add the badge in the downloaded source, then build it
pac pages upload-code-site --rootPath <download-path>

# re-export so the committed zip contains the badge
pac solution export --name <solution-unique-name> --path <output-folder>/<name>-unmanaged.zip --managed false --overwrite
```

The solution unique name is in the inspector output.
Re-run Step 2 on the new zip so the rest of the workflow uses the artifact you are actually committing.

Completion criterion: the live site renders one badge, and the zip you are about to commit was exported after the badge went in.

## Step 4: Scaffold the folders and the manifest entry

Create the folders and register the family in the catalog together.
They have to move together, because the validator fails both on a folder with no manifest entry and on a manifest entry with no folder.

```
templates/<kind>/<id>/
├── previews/                    shared across variants
│   └── README.md
├── seed-data/                   shared, only when the family ships seed data
└── variants/<framework>/
    └── solution/<name>-unmanaged.zip
```

The validator checks every manifest path against the folder it is supposed to live in, so a zip in the wrong place fails even when the file exists.
Family previews and seed data belong to the family folder; anything under `variants/<framework>/` belongs to that one variant.

Then append the family entry to `templates/manifest.json`.
Paths in it are relative to `templates/`.
Set `requiredDataverseLanguages` from the inspector's language list.
Start `previewImages` as an empty array and fill it in Step 5, and omit `seedDataPath` until Step 6 produces a file.

Doing the manifest now rather than at the end matters because the preview skill in Step 5 starts from the manifest entry.

Completion criterion: the folders exist with the zip under `variants/<framework>/solution/`, and the manifest entry exists with a resolvable `variants.<framework>.solutionPath`.

## Step 5: Capture the previews

Follow [capture-power-pages-template-previews](../capture-power-pages-template-previews/SKILL.md).

Capture from the deployed site after the badge is in, so the screenshots match what someone actually installs.
Import the solution into a working environment first if no deployment exists yet:

```bash
pac auth create --url https://YOUR-ENVIRONMENT.crm.dynamics.com
pac solution import --path templates/<kind>/<id>/variants/<framework>/solution/<zip> --publish-changes
```

Put the screenshots in the family `previews/` folder and list them in the family `previewImages`.
Every framework variant of a family renders the same UI, so a second set of screenshots per variant is usually noise.
Add variant-level previews only when that variant genuinely looks different, and then they live under `variants/<framework>/previews/`.

Capture the pages that show the scenario, and skip the ones you cannot reach.
An empty list page tells a catalog visitor nothing, so import the seed data before capturing when the interesting pages are data-driven.
That can mean doing Step 6 first, which is fine.

Completion criterion: real PNGs exist under `previews/`, they are listed in `previewImages`, none of them leak tenant names, emails, or tokens, and none of them show a loading or error state.

## Step 6: Settle the seed data

Ask the user whether they already have seed data, want you to generate it, or want the template to ship without any.

Templates without seed data are allowed.
They are also less useful, because a fresh import lands on empty lists, so raise generation as the default when the site is data-driven.

Seed data belongs to the family, under `seed-data/`, because every variant of a scenario reads the same Dataverse tables.
Use a variant-level `seed-data/` folder only when one framework build genuinely needs different records.

### Where the values come from

The seed shape needs more than the table names the inspector printed.
Get the rest from the two places that already have it rather than guessing:

- **`customizations.xml` inside the zip** carries each table's `EntitySetName`, its column logical names, and the values of its choice columns. Unzip it and read the `<Entity>` block for each table the inspector listed. The primary key is the attribute whose `<Type>` is `primarykey`, and it is the `idColumn` the seed shape asks for.
- **The site source files** show which columns each page actually reads. Generating values for columns the UI never displays produces data that looks fine in Dataverse and empty in the previews.

If the solution is already imported somewhere, the environment is the fastest confirmation that a logical name is right:

```bash
pac env fetch --xml "<fetch><entity name='<logical-name>'/></fetch>"
```

### What good seed data looks like

- Enough records to fill a list page, with variety across the status, category, or state columns the UI filters on.
- Stable GUIDs, because later records refer to earlier ones by lookup ID and an importer needs to upsert safely.
- Tables ordered so parents come before the children that reference them.
- Fictional names, addresses, and emails only. Nothing from a real tenant.

Use the Dataverse export shape (`tables` plus optional `fileExports`) for anything with more than one table, and put file-column binaries under `seed-data/files/`.
[references/anatomy.md](references/anatomy.md) has the exact shape and the rules the validator enforces on it.

Use the `notes` array to record anything a person importing the data would otherwise find surprising, such as a lookup deliberately left empty.

Add `seedDataPath` to the manifest entry once the file exists.

Completion criterion: `seed-data/data.json` parses, its file references resolve, its records would make the site's main pages look populated, and the manifest points at it. Or the user chose no seed data, and neither the folder nor `seedDataPath` exists.

## Step 7: Write the template README

Write `templates/<kind>/<id>/README.md` following the section order in [references/anatomy.md](references/anatomy.md).

Three parts need judgment rather than copying:

**Prerequisites.** Fold in whatever Step 2 turned up. Missing dependencies become explicit setup steps, the way the 311 Portal README calls out the knowledge-article dependency. Required languages become a step too, since the import fails without them. If the template needs an API key, a connection, or an environment variable filled in after import, say so here.

**Variants.** Name the framework whose zip the import command points at, the way the 311 Portal README says "Import the React variant's unmanaged solution". A family README that says "the solution" leaves the reader guessing once a second variant lands.

**Customize this template.** Include this section when the zip contains site source files. That is what makes customization possible: the import carries the app source, not only the compiled bundle. Skip it when the zip has only built site components, since telling someone to download source that is not there wastes their time.

Also add `previews/README.md` with a one-line description of what the folder holds.

Completion criterion: someone who has never seen the template can import it and reach a working site by following the README alone.

## Step 8: Wire it into the indexes

The template is not discoverable until the index pages point at it.

Add a row to the table in `templates/<kind>/README.md` with the first family preview as the thumbnail, the variants the family ships, the scenario, and what the template includes.
If `templates/<kind>/README.md` does not exist yet, create it modelled on `templates/spa/README.md`.

Then check the pages above it.
`templates/README.md` lists the template categories, and today it links `spa/` only.
A new family in an existing category is already reachable through that link, so leave the page alone.
A family in a category that has no entry yet, which today means the first `traditional` template, needs a new bullet under "Template categories" or nothing links to it.

The root `README.md` currently indexes samples only.
Add the template there where the surrounding page already lists individual templates, and leave it alone where it does not, rather than inventing a new section for one template.

Completion criterion: the template is reachable by clicking from `templates/README.md`.

## Step 9: Validate and report

Run the same commands CI runs:

```bash
node --test templates/scripts/validate-templates.test.js
node templates/scripts/validate-templates.js
```

Fix what fails.
The catalog currently validates with zero warnings, so treat any new warning as something to resolve rather than accept.
A managed-solution warning here means Step 2 was skipped or the wrong zip was committed.

Then report to the user:

- Family id, the variant you added, and where they landed.
- What the zip contains: tables, dependencies, required languages, whether site source files are included.
- Whether the badge was added or was already there.
- Which previews were captured, and any page that could not be reached.
- Whether seed data was supplied, generated, or skipped.
- Validation output.
- Anything left open, such as a page blocked by permissions or a prerequisite the user still has to document.

Do not report the template as done if validation failed or a preview is still a placeholder.

## Adding a variant to an existing family

When the family already exists, most of the work is done.
The scenario, previews, seed data, and README are shared, so only the framework-specific pieces are new.

1. **Inspect the zip.** Step 2 applies unchanged. The version becomes this variant's `templateVersion`.
2. **Add the badge.** Step 3 applies unchanged. This is a different codebase from the sibling variants, so its badge is its own work.
3. **Drop the zip in.** `templates/<kind>/<id>/variants/<framework>/solution/<name>-unmanaged.zip`.
4. **Add the variant to the manifest.** A new key under the family's `variants`, with `templateVersion` and `solutionPath`. Leave the family metadata alone.
5. **Check the shared parts still hold.** If the new variant's languages differ from the family's `requiredDataverseLanguages`, set `variants.<framework>.requiredDataverseLanguages` for it rather than changing the family default. Same for previews and seed data: override at the variant only when it genuinely differs.
6. **Update the READMEs.** Add the variant's import command to the family README, and update the Variants column in `templates/<kind>/README.md`. Check the rest of the family README for text that silently assumed one framework: the "Customize this template" section names the source language, and the import step names the variant. Both need to cover the new variant rather than read as if the family were still single-framework.
7. **Validate and report** as in Step 9.

Do not capture a second set of previews just because a variant is new.
Variants of one family render the same UI, so duplicate screenshots add weight to the repository without telling a catalog visitor anything new.
