# Dataverse solution automation

Use `templates/scripts/dataverse-solution.js` only when `dataModel` is `custom`, to plan, apply, and export the template-owned Dataverse schema.
Do not run this workflow for `platform-only`; Power Pages still creates and uses its SDM/EDM platform website tables, but the template adds no custom supporting solution.
Do not select or modify an environment until the local exceptional-web-design gate, functional tests, automated
accessibility, and CodeQL checks have passed and the contributor has explicitly chosen to proceed during the
[template review handoff](template-review-handoff.md).
The supported contract is intentionally bounded: publishers, unmanaged solutions, custom tables, common scalar columns,
local choices, and one-to-many relationships. Unsupported metadata must stop the workflow instead of being guessed.

## Plan

Create a JSON specification outside the repository, then run:

```powershell
node templates\scripts\dataverse-solution.js plan `
  --spec <dataverse-spec.json> `
  --out <dataverse-plan.json>
```

Review every operation and the generated content hash with the contributor. The plan derives exact schema and logical
names from the publisher prefix and assigns deterministic local choice values from the publisher option-value prefix.

Bind the immutable plan to the selected environment:

```powershell
node templates\scripts\dataverse-solution.js approval `
  --plan <dataverse-plan.json> `
  --environment <environment-url>
```

Show the normalized environment and execution approval hash to the contributor.

## Apply

Show the selected environment, tenant, publisher, solution, tables, columns, relationships, publishing operation, and
partial-failure behavior. Obtain explicit approval for the execution hash that binds the immutable plan to that exact
environment before running:

```powershell
node templates\scripts\dataverse-solution.js apply `
  --plan <dataverse-plan.json> `
  --environment <environment-url> `
  --approve <approval-hash> `
  --journal <apply-journal.json>
```

The command uses PAC to select the approved environment, acquires an environment-scoped Dataverse token from Azure CLI
without printing it, and calls `WhoAmI` before any write. It associates created metadata with the unmanaged solution
through `MSCRM.SolutionUniqueName`, fails when a target table or relationship already exists, publishes the customizations,
and writes a local journal. Column, relationship, and publish operations use bounded retries only for recognized
transient Dataverse customization conditions (throttling, server errors, metadata propagation error `0x80040216`, or
an already-running customization/publish operation). Before retrying a column or relationship, the script checks whether
Dataverse created it despite the error; every retry and delay is recorded in the journal. Validation, collision,
authorization, and other permanent failures are never retried.

A failed apply can leave partial environment state; report the journal and obtain separate cleanup approval rather than
deleting automatically. If metadata reads disagree across requests, stop and treat the environment as unstable instead
of repeatedly deleting or recreating resources.

## Export

After apply and verification, export and unpack the authoritative unmanaged solution:

```powershell
node templates\scripts\dataverse-solution.js export `
  --plan <dataverse-plan.json> `
  --environment <environment-url> `
  --approve <approval-hash> `
  --family-root <template-family>
```

Temporary ZIPs remain outside the repository and are removed. The command refuses an existing target folder and verifies
the unpacked `Other/Solution.xml` unique name and unmanaged state.
