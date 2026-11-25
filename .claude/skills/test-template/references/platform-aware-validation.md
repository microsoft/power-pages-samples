# Platform-aware validation

These reviews validate the Power Pages and Dataverse configuration that cannot exist during the initial local-only
quality phase. Run them after authoritative `.powerpages-site` and supporting solution artifacts exist, and repeat them
against the clean consumer installation where specified.

This requirement maps the requested "plan LLM" review to the existing Power Pages **`plan-alm`** skill. `plan-alm`
classifies credential-style and environment-specific site settings; `configure-env-variables` performs writes and is
not invoked automatically by this validation gate.

## Evidence handling

The existing skills own their report formats and internal workflows. Invoke them rather than reimplementing their
checks. Record the report paths, result counts, exact immutable revision, environment, site ID, and disposition in the
verification journal and final contributor summary.

Reports and ALM plans created in a disposable consumer clone are verification artifacts. Do not copy them into the
template source package or commit them unless the repository contract explicitly requires that artifact.

If a skill cannot run, produces a partial/degraded result, skips a required check, or cannot establish that it examined
the current site identity, report the blocker and leave the template incomplete.

## 1. Permissions audit

Invoke the Power Pages `audit-permissions` skill from the project that contains the authoritative
`powerpages.config.json` and `.powerpages-site` metadata. The skill compares source behavior, web roles, table
permissions, Web API settings, and live Dataverse metadata.

Run it:

- once after the authored inactive source site and its permissions/configuration are complete.

The later `security-review` Code & config and Release readiness runs each include their own consumer-site permissions
audit. Do not invoke a separate duplicate audit on the consumer clone unless the security report's permissions section
is skipped/partial or remediation changes permissions, roles, Web API settings, routes, or data access after that report.

The gate passes only when:

- the audit is complete and has a deterministic scorecard, not a partial-audit notice;
- its verdict is **Safe to go**;
- the consolidated issue list contains zero **major** issues; and
- every required user-facing table and operation is covered by the intended role and least-privilege scope.

Report minor issues. Fix minor issues that contradict the approved experience, indicate invalid YAML or unresolved
role references, or reveal drift between source, permissions, and the documented plan. Other minor issues require an
explicitly documented disposition before completion.

`platform-only` does not skip this audit. A platform-only template must prove either that it uses no custom table access,
or that any standard-table access and roles are correctly configured.

## 2. Security review

Invoke the Power Pages `security-review` skill with an explicit goal so it does not need to ask which review to run:

1. **Code & config** after the authored `.powerpages-site` metadata exists and before catalog/consumer acceptance.
   This covers source and dependency scanning, authentication configuration, roles, and table permissions.
2. **Release readiness** after the clean consumer site is activated. This adds live-site, browser-header, firewall, and
   another current permissions check to the code/config evidence.

The gate passes only when:

- every required selected check completes; a `skipped` or failed section is a blocker;
- the consolidated report has no unresolved critical finding;
- source/dependency tools have no unresolved high-severity security finding when the underlying tool reports that
  severity; and
- every warning is either fixed and verified by a rerun or explicitly recorded as a non-blocking limitation with
  evidence and contributor approval.

Do not add severity to inventory-only findings from permissions, authentication, headers, or firewall checks. Preserve
the security skill's severity policy and report its output faithfully.

The release-readiness review requires a deployed/activated verification site. If activation is declined or blocked,
record that the live security review did not run and leave end-to-end completion blocked.

## 3. ALM and environment-variable review

Run the existing Power Pages `plan-alm` skill on the **disposable clean consumer clone**, after its solution and inactive
website identity exist. Ask the contributor which supported promotion strategy the plan should model. Saving the plan
as Draft is sufficient for this validation; do not execute deployment skills.

Use the plan's site-setting classification:

- `credentialNeedsDecision` — credential-like settings such as client secrets, API keys, passwords, client IDs, or
  consumer keys;
- `promoteToEnvVar` — authentication or environment-specific settings with development values;
- `authNoValue` — settings that require a value in each target environment;
- `keepAsIs` — settings that are expected to remain static.

The gate passes only when:

- `PLAN_QUALITY` is complete, not degraded;
- the environment-match guard confirms the clone belongs to the reviewed environment;
- site-setting discovery succeeds and is not `null`;
- no secret or credential value is committed in source, seed data, solution metadata, reports, or site-setting YAML;
- every `credentialNeedsDecision` item is removed, replaced with a non-secret placeholder, or mapped to the appropriate
  Secret/String environment-variable strategy;
- every `promoteToEnvVar` item has an explicit disposition: environment variable, intentionally static with a reason,
  or target-environment setup requirement; and
- every `authNoValue` item is documented as a target-environment prerequisite.

Do not automatically invoke `configure-env-variables`; it creates Dataverse definitions and deployment settings and
requires its own ALM plan and approval gates. If the contributor chooses to configure variables during verification,
follow that skill separately and journal every write.

Keep the clone's `docs/alm-plan.html`, `docs/.alm-plan-data.json`, and `docs/alm/alm-plan-context.json` with the disposable
verification evidence. Summarize candidate counts and dispositions in the test result and PR
validation notes, but do not copy environment-specific ALM files into the authored template.

## Remediation and reruns

Fix findings at their owning layer:

- permission YAML, roles, Web API settings, and access scope for permission findings;
- source, dependencies, auth settings, headers, or firewall configuration for security findings;
- source/configuration placeholders, site-setting values, solution contents, or documented prerequisites for ALM
  findings.

Any fix that changes template source, seed data, solution metadata, permissions, or website metadata invalidates the
relevant source-bound evidence. Rerun affected functional, accessibility, design, CodeQL, permission, security, ALM,
catalog, and consumer checks before completion.
