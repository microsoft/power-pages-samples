# Optional verification cleanup

Offer cleanup only after the clean consumer installation passes and its pull request has been created. Cleanup is
optional and is not a completion requirement. Preserve the verification environment when the contributor declines,
when ownership is uncertain, or when a bounded cleanup plan cannot be proven.

## Record during verification

Keep a local verification journal outside the repository with the immutable revision and exact target environment plus:

- imported solution unique names, IDs, versions, managed state, publishers, and publication behavior;
- every seed record table/entity set and stable record ID created by the run;
- cloned or created Power Pages website IDs, names, activation state, and public URLs;
- every environment setting changed for installation, with its exact before and after value;
- any partial import, upload, activation, or seed failure;
- resources that existed before the run and therefore must never be deleted by cleanup.

Never store tokens, credentials, or personal data in the journal.

## Offer

After reporting the pull request URL, show the contributor a cleanup inventory and ask them to choose:

- **Keep the verification resources (Recommended)** — make no environment calls and retain the journal for later use.
- **Delete this verification run** — generate the destructive plan below.

Do not infer cleanup approval from template-install, activation, pull-request, or earlier environment-write approval.

## Destructive plan

Bind one immutable plan to the exact environment and verification journal. Include:

1. Website deactivation when still active, followed by deletion of only the recorded verification website IDs and their
   platform-defined cascading children.
2. Seed deletion by the exact stable record IDs created by the run, in child-before-parent order, when the supporting
   tables will be retained.
3. Template-owned custom components in dependency-safe order when the run created the schema and the contributor chose
   full teardown.
4. The exact unmanaged solution and publisher created by the run, only after proving the publisher owns no unrelated
   solutions and the components have no unrelated dependencies.
5. Restoration of an environment setting only when the journal contains its exact pre-run value and the current value
   still matches the value written by the verification run.
6. Explicit exclusions for all pre-existing resources and for resources created by another run.
7. Expected postconditions and partial-failure behavior.

Before approval, run read-only identity, state, ownership, record-count, cascade, and dependency checks. Show the
environment URL, every resource ID, record count, cascading child count, environment-setting restoration, and plan hash.
State that deletion is irreversible except by reinstalling the template.

## Apply and verify

Require a separate explicit approval of the environment-bound destructive hash. Recheck the plan and current resource
state immediately before the first deletion. Stop on identity drift, new dependencies, unexpected records, publisher
ownership changes, or environment-setting drift.

Journal every completed deletion and restoration. On failure, stop without claiming rollback, report the exact partial
state, and require a new reviewed plan for any retry. On success, verify that the recorded website IDs, solution,
publisher, custom schema, and seed records are absent and that excluded pre-existing resources remain present.
