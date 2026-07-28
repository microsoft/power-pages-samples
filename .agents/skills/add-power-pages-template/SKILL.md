---
name: add-power-pages-template
description: Power Pages template contributor. Use when the user wants to add, contribute, onboard, or register a new installable template under templates/ from a Power Pages website or an unmanaged solution zip, including wiring up the badge, preview screenshots, seed data, README, and templates/manifest.json.
argument-hint: "[path or name of the solution zip]"
---

# Add a Power Pages template

Turn a Power Pages site into a committed, installable entry under `templates/`.

Someone who finds the template in the catalog has to understand what it does from the previews, import it without guessing at prerequisites, and land on a site with realistic data.
The step order below is what avoids rework: everything that changes the site itself happens before the zip is exported and the screenshots are taken.

Read [references/anatomy.md](references/anatomy.md) for the exact folder layout, README section order, manifest fields, and seed-data shapes.

## Step 1: Collect the inputs

Ask the user for the unmanaged solution zip if they have not already provided one.
Say what it needs to contain, because a zip that is missing the site or its dependencies wastes the rest of the workflow:

- The Power Pages website and its site components.
- Every dependency the site needs to run: Dataverse tables, cloud flows, connection references, security roles, environment variables.
- The site source files, when the template should be customizable after import. This part is optional, and Step 7 documents it when present.

Then settle the catalog identity with the user:

- `id` in kebab-case, which is also the folder name under `templates/<kind>/<id>/`.
- `displayName` and a one-sentence `description` that names the scenario, not the technology.
- `kind` (`spa` or `traditional`) and `framework`.
- `keywords`, `audience`, and `author`.

Ask for the environment URL of a working deployment of the site too.
The badge and the previews both need a running site, so without one you will have to import the zip somewhere before you can finish.

Completion criterion: you have the zip on disk, the catalog identity, and either a live site URL or an environment you can import into.

## Step 2: Inspect the zip before trusting it

Run the bundled inspector rather than unzipping by hand:

```bash
node .agents/skills/add-power-pages-template/scripts/inspect-solution-zip.js <path-to-zip>
```

Add `--list-source-files` to see the site source files, and `--json` when you want to pipe the result somewhere.

Read the output for five things:

- **Managed state.** Templates ship unmanaged so people can customize what they import. A managed zip is a blocker, not a warning to work around: ask the user for an unmanaged export.
- **Site presence.** Zero site components means the website was not added to the solution.
- **Site source files.** Their presence decides whether the README gets a "Customize this template" section in Step 7.
- **Missing dependencies.** These are prerequisites the target environment must already have. The 311 Portal template documents its knowledge-article dependency this way. Anything listed here belongs in the template README.
- **Solution version.** This becomes `templateVersion` in the manifest, so the catalog and the zip agree.

The table list is your seed-data inventory for Step 6, so keep it.

If `--list-source-files` shows files that are not part of the app (planning notes, design docs, screenshots, test scripts, scratch JSON), tell the user.
Those get published to every environment that imports the template, so they are worth cleaning up at the source before re-exporting.

Completion criterion: the zip is unmanaged, contains a site, and you can list its tables, its dependencies, its version, and whether it carries site source files.

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

## Step 4: Scaffold the folder and the manifest entry

Create the folder and register it in the catalog together.
They have to move together, because the validator fails both on a folder with no manifest entry and on a manifest entry with no folder.

```
templates/<kind>/<id>/
├── solution/<solution-name>-unmanaged.zip
├── previews/README.md
└── seed/            (only when the template ships seed data)
```

Copy the zip in with a descriptive file name ending in `-unmanaged.zip`.

Then append the entry to `templates/manifest.json`.
Paths in it are relative to `templates/`.
Start `previewImages` as an empty array and fill it in Step 5, and omit `seedDataPath` until Step 6 produces a file.

Doing the manifest now rather than at the end matters because the preview skill in Step 5 starts from the manifest entry.

Completion criterion: the folder exists with the zip under `solution/`, and the manifest entry exists with a resolvable `solutionPath`.

## Step 5: Capture the previews

Follow [capture-power-pages-template-previews](../capture-power-pages-template-previews/SKILL.md).

Capture from the deployed site after the badge is in, so the screenshots match what someone actually installs.
Import the solution into a working environment first if no deployment exists yet:

```bash
pac auth create --url https://YOUR-ENVIRONMENT.crm.dynamics.com
pac solution import --path templates/<kind>/<id>/solution/<zip> --publish-changes
```

Capture the pages that show the scenario, and skip the ones you cannot reach.
An empty list page tells a catalog visitor nothing, so import the seed data before capturing when the interesting pages are data-driven.
That can mean doing Step 6 first, which is fine.

Completion criterion: real PNGs exist under `previews/`, they are listed in `previewImages`, none of them leak tenant names, emails, or tokens, and none of them show a loading or error state.

## Step 6: Settle the seed data

Ask the user whether they already have seed data, want you to generate it, or want the template to ship without any.

Templates without seed data are allowed.
They are also less useful, because a fresh import lands on empty lists, so raise generation as the default when the site is data-driven.

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

Use the Dataverse export shape (`tables` plus optional `fileExports`) for anything with more than one table, and put file-column binaries under `seed/files/`.
[references/anatomy.md](references/anatomy.md) has the exact shape and the rules the validator enforces on it.

Use the `notes` array to record anything a person importing the data would otherwise find surprising, such as a lookup deliberately left empty.

Add `seedDataPath` to the manifest entry once the file exists.

Completion criterion: `seed/data.json` parses, its file references resolve, its records would make the site's main pages look populated, and the manifest points at it. Or the user chose no seed data, and neither the folder nor `seedDataPath` exists.

## Step 7: Write the template README

Write `templates/<kind>/<id>/README.md` following the section order in [references/anatomy.md](references/anatomy.md).

Two parts need judgment rather than copying:

**Prerequisites.** Fold in whatever Step 2 turned up. Missing dependencies become explicit setup steps, the way the 311 Portal README calls out the knowledge-article dependency. If the template needs an API key, a connection, or an environment variable filled in after import, say so here.

**Customize this template.** Include this section when the zip contains site source files. That is what makes customization possible: the import carries the app source, not only the compiled bundle. Skip it when the zip has only built site components, since telling someone to download source that is not there wastes their time.

Also add `previews/README.md` with a one-line description of what the folder holds.

Completion criterion: someone who has never seen the template can import it and reach a working site by following the README alone.

## Step 8: Wire it into the indexes

The template is not discoverable until the index pages point at it.

Add a row to the table in `templates/<kind>/README.md` with the first preview as the thumbnail, the framework, the scenario, and what the template includes.
If `templates/<kind>/README.md` does not exist yet, create it modelled on `templates/spa/README.md`.

Then check the pages above it.
`templates/README.md` lists the template categories, and the root `README.md` currently indexes samples only.
Add the template where the surrounding page already lists individual templates, and leave the page alone where it does not, rather than inventing a new section for one template.

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

- Template id and where it landed.
- What the zip contains: tables, dependencies, whether site source files are included.
- Whether the badge was added or was already there.
- Which previews were captured, and any page that could not be reached.
- Whether seed data was supplied, generated, or skipped.
- Validation output.
- Anything left open, such as a page blocked by permissions or a prerequisite the user still has to document.

Do not report the template as done if validation failed or a preview is still a placeholder.
