---
name: test-template
description: Independently validate a Power Pages template or website project across local quality, repository packaging, platform configuration, and clean consumer installation. Use for React, Angular, Vue, Astro, other package-based SPAs, and PAC-downloaded non-SPA templates.
compatibility: Local checks require the framework runtime and committed lockfile. Full verification additionally requires Playwright, CodeQL, PAC CLI, Azure CLI, the Power Pages plugin skills, and an approved Power Platform verification environment.
---

# Test a Power Pages template

Validate a template created by `add-template` or authored independently. Testing is fail-closed and does not create,
modify, activate, or delete Power Platform resources unless the contributor explicitly selects the consumer phase and
approves each external write through the owning skill.

**Input:** `$ARGUMENTS`

Accepted inputs:

- a template family root containing `variants/<framework>/website-code/`;
- one standalone SPA website project;
- one PAC-downloaded non-SPA project containing `.powerpages-site/website.yml`; or
- an integrated repository template path.

Optional phase hints: `local`, `platform`, `consumer`, or `all`. Without a hint, run `local`; offer later phases only
when their prerequisites exist.

## 1. Discover the template

If no path is supplied, ask for the template family or website-project path. Do not assume the current repository root
is the template.

Run:

```powershell
node templates\scripts\inspect-template.js --path <template-or-website-code>
```

When testing outside this repository, resolve the script from the repository checkout containing this skill.

The inspector is authoritative for:

- family and website-code roots;
- SPA versus non-SPA;
- framework (`react`, `angular`, `vue`, `astro`, `generic-spa`, or `none`);
- committed lockfile and package manager;
- exact dependency-restore and script commands;
- available quality/preview scripts;
- `template-quality.json` route/viewport coverage;
- repository integration and manifest context.

Stop on inspector errors. Multiple lockfiles, a missing SPA lockfile, a missing build script, or a framework-contract
mismatch must be fixed rather than guessed around.

## 2. Establish the test plan

Create one task per discovered variant plus tasks for evidence review and the final report. For each variant record:

- framework and site type;
- exact restore command;
- exact Playwright browser-install command when browser tests are present;
- selected check commands;
- preview command;
- declared routes/viewports or the route-discovery source;
- applicable local, repository, platform, and consumer phases;
- unavailable checks and why.

Framework support is capability-based, not a hardcoded React-only execution path:

| Framework | Discovery indicators | Expected build |
|---|---|---|
| React | React dependency or `react` variant | package `build` script |
| Angular | `angular.json` or `angular` variant | package `build` script |
| Vue | Vue dependency or `vue` variant | package `build` script |
| Astro | `astro.config.*` or `astro` variant | package `build` script |
| Generic SPA | package project with an unknown framework | package `build` script |
| Non-SPA | PAC website metadata and no SPA package | no package build required |

Repository `qualityStandard: 1` evidence is currently accepted only for React SPA variants by
`validate-templates.js`. This skill still tests Angular, Vue, Astro, generic SPA, and non-SPA projects, but must report
that contract limitation rather than claiming non-React `qualityStandard: 1` acceptance.

## 3. Local phase

Run independently for every discovered variant.

### 3.1 Restore and deterministic checks

Use the inspector's exact restore command. Do not substitute another package manager or install without the committed
lockfile.

- When the inspector returns `commands.installBrowser`, run it after dependency restore and before any Playwright-backed
  quality, E2E, accessibility, or preview command. A missing matching browser is a prerequisite gap, not a test failure.
- If the package defines `quality`, run only that aggregate command unless its documented contract omits a required
  check.
- Otherwise run available scripts in this order: `test`, `build`, `test:e2e`, `test:a11y`.
- A SPA build is mandatory.
- Missing unit, functional, accessibility, keyboard, responsive, or console-error coverage is a reported gap; do not
  fabricate a pass.
- Run the smallest relevant command again after a fix, then rerun the complete aggregate check before completion.

For non-SPA sites, validate the PAC export, page/template structure, Liquid/HTML/CSS/JavaScript source, site metadata,
and any repository-provided tests without inventing a package build.

### 3.2 Accessibility

Follow [automated accessibility](references/automated-accessibility.md).

When `template-quality.json` and `test:a11y` exist, require every declared route/state/viewport and validate the generated
summary and HTML reports. Otherwise discover routes from the framework router or PAC page metadata, start only the
project's documented loopback server, and run a generic Playwright/axe audit. Store generic audit output as session
evidence unless it satisfies the repository's exact committed report contract.

The automated completion claim is only: **100% of declared automated scans passed with zero axe-core violations.**

### 3.3 Responsive previews and visual design

Capture real desktop/mobile evidence with [SPA previews](references/spa-previews.md) or
[non-SPA previews](references/non-spa-previews.md).

Invoke the repository-local `exceptional-web-design` skill against the rendered routes and current source. Fix every
critical gate and every category below 3, regenerate affected accessibility/previews, and repeat for at most three
rounds. For quality-standard React templates, bind the final scorecard with `write-design-review.js`.

### 3.4 Static security and source evidence

- Run CodeQL JavaScript/TypeScript security-and-quality analysis when the variant contains supported JS/TS source.
- Require zero findings and no extraction/execution errors for `qualityStandard: 1`.
- For other source types, run the applicable repository/plugin scanner and report unsupported static-analysis coverage.
- Never include secrets, tokens, credentials, personal data, build output, caches, or local tool state in evidence.

For quality-standard React variants, refresh `docs/quality-manifest.json` only after all source/seed changes and confirm
that accessibility, design, CodeQL, source, and seed evidence share the current digest.

## 4. Repository phase

Run when the family is integrated under this repository:

```powershell
node templates\scripts\validate-templates.js
node site\build.mjs --out <temporary-output-directory>
```

Also run focused tests for changed template tooling and the variant's complete local checks. Inspect the generated
catalog entry, publisher, responsive previews, capabilities, install path, and one-line create-site prompt.

Do not treat schema-valid empty previews, an old published release, or a manual install as proof that the current
catalog revision is consumable.

## 5. Platform phase

Run only when authoritative `.powerpages-site` and Dataverse artifacts already exist. This phase is read-only unless a
separate remediation skill receives its own approval.

Follow [platform-aware validation](references/platform-aware-validation.md):

- invoke `audit-permissions` on the authored source site;
- require a complete scorecard, **Safe to go**, and zero major issues;
- report every partial, skipped, degraded, major, and minor result;
- rerun after permission, role, Web API, route, or data-access changes.

Do not create a site merely to make this phase available. If platform artifacts are absent, report the phase as not run.

## 6. Consumer phase

This phase can create external resources and is never implicit. Ask the contributor to select a verification environment
and show the complete import, seed, site, activation, visibility, and cleanup effects before invoking any owning skill.

Use an immutable revision of the authored template and follow the actual create-site consumer path. A diagnostic manual
install does not resolve a catalog-consumer incompatibility.

After the clean consumer clone and inactive site exist:

1. invoke `security-review` with the **Code & config** goal; its integrated permissions section is the consumer-clone
   permissions audit;
2. invoke `plan-alm` on the disposable clone and require complete, non-degraded site-setting classification;
3. keep security/ALM reports with disposable verification evidence rather than copying them into the source template;
4. block activation on failed/skipped required checks, major permissions issues, unresolved critical/high security
   findings, committed credentials, or unresolved environment-variable candidates.

After separately approved activation:

1. invoke the existing Power Pages `test-site` skill for live route/API/browser verification;
2. rerun deployed accessibility for every declared route/state/viewport;
3. invoke `security-review` with the **Release readiness** goal;
4. exercise approved journeys, permissions, seeded records, responsive layouts, and Power Pages attribution;
5. record every resource in the optional-cleanup journal.

Fix every gap at its owning layer and rerun from a clean target when source/package/install changes invalidate the run.

## 7. Result contract

Present one result table per variant and phase:

```text
Check | Status | Evidence | Blocking reason or limitation
```

Statuses are:

- **Passed** — executed successfully against the current revision;
- **Failed** — executed and found a blocking issue;
- **Blocked** — prerequisite, consent, environment, or tool unavailable;
- **Not applicable** — structurally irrelevant, with evidence;
- **Not run** — outside the selected phase.

The final summary must include:

- exact template path and immutable revision when applicable;
- framework/package manager per variant;
- commands executed and their outcomes;
- route/state/viewport coverage;
- accessibility score and claim boundary;
- design score and failed critical gates;
- CodeQL/security/permissions/ALM findings;
- repository/catalog result;
- consumer site identity and URL/activation state;
- evidence freshness;
- unresolved gaps and the next required action.

Do not collapse Blocked, Failed, or Not run into Passed. A template is complete only when every required local,
repository, platform, consumer, live accessibility, permissions, security, and ALM check passes against the same
authored revision.
