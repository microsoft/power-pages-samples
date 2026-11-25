# Seed data automation

Use `templates/scripts/seed-data.js` only for `custom` templates after the authoritative unmanaged solution has been
created, exported, and validated.
The local exceptional-web-design and deterministic quality gates must already have passed before this environment stage.

## Plan

Run a read-only live metadata plan:

```powershell
node templates\scripts\seed-data.js plan `
  --seed-file <seed-data\data.json> `
  --environment <environment-url> `
  --out <seed-plan.json>
```

The command verifies every table entity set and primary key against live Dataverse metadata, validates scalar fields and
exact lookup navigation properties, counts records, detects money columns, and lists active target currencies.
When money records exist, rerun with the contributor's selected existing currency:

```powershell
node templates\scripts\seed-data.js plan ... --currency-code USD
```

The ready plan binds normalized record payloads, live currency ID, target environment, verification fields, and operation
order into one immutable approval hash.

## Apply and verify

Show the environment, selected currency, table/record counts, upsert behavior, and approval hash. Obtain explicit approval,
then run:

```powershell
node templates\scripts\seed-data.js apply `
  --plan <seed-plan.json> `
  --approve <approval-hash> `
  --journal <seed-journal.json>
```

The command upserts stable GUID records table-by-table in authored order, normalizes Dataverse booleans, applies exact
`<NavigationProperty>@odata.bind` lookups and the approved active currency, retrieves every record by ID, compares scalar
values and lookup GUIDs, and writes progress after each upsert and verification. Any mismatch fails the stage.

This bounded importer does not yet support file-column uploads, state/status transitions, customer lookups, or native N:N
collection memberships. If those features occur, stop and use a reviewed extension rather than dropping data silently.
