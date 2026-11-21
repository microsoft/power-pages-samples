---
name: add-template
description: Create and contribute an installable Power Pages template to this repository. Use when adding a community SPA or Liquid/web-template non-SPA template to the templates catalog.
compatibility: Requires a checkout of microsoft/power-pages-samples. PAC CLI, Azure CLI, Node.js, Playwright Chromium, CodeQL CLI, and a suitable Power Platform environment are needed for complete verification.
---

# Contribute a Power Pages template

1. Read `CONTRIBUTING.md`, `templates/README.md`, the manifest schema, and [template artifacts](references/template-artifacts.md).
   Ask for any missing template name, purpose, audience, and publisher.
   Microsoft is the default for Microsoft contributions; ask external contributors for their own publisher.
   Ask for the framework: React, Angular, Vue, Astro, or non-SPA Liquid/web templates, in that order.
   Ask for the data scope:
   - **Power Pages platform tables only (frontend-led)** — the site still uses the SDM/EDM Dataverse website tables created by Power Pages, but the template adds no custom business tables, supporting solution, or Dataverse seed package.
   - **Platform tables plus custom Dataverse tables** — the template adds an unmanaged supporting solution, custom domain schema, permissions as needed, and representative seed data.
   If another framework is requested, check the current schema and validator before proceeding; explain unsupported choices and ask for a supported choice or an explicitly approved contract change.
   Confirm the template ID, data scope, and feature scope with the contributor.
2. Plan the website experience, pages, states, data scope, permissions, dependencies, and representative fixture/seed records together without selecting or modifying an environment.
   For a React SPA, write the approved intent as a temporary JSON spec outside the repository and run `node templates/scripts/create-template.js --spec <spec.json> --output <draft-parent>`.
   Implement the full local website experience and include the existing Power Pages attribution badge. The scaffolder and implementation must not fabricate solution metadata or `.powerpages-site`.
3. For a new React SPA, set `qualityStandard: 1`, create the required `docs/`, test, and report structure, and follow [template quality gates](references/quality-gates.md).
   Use representative non-sensitive local data derived from the approved scope; do not require production names or records.
   Run unit, build, functional Playwright, and [automated accessibility](references/automated-accessibility.md) locally until they pass.
4. Capture real local previews by following [SPA previews](references/spa-previews.md) for a framework variant or [non-SPA previews](references/non-spa-previews.md) for Liquid.
   If a prerequisite, browser, or viewport is blocked, retain the local work and report what is missing; do not invent images or claim completion.
5. Before any environment selection or write, run the repository-local [exceptional-web-design](../exceptional-web-design/SKILL.md) review using the desktop/mobile previews, accessibility summary, and current source.
   Fix every critical gate and every category below 3, regenerate affected previews and accessibility evidence, and repeat for at most three rounds.
   Write the final source-bound scorecard with `node templates/scripts/write-design-review.js`.
   The local design gate passes only when all ten categories score 3 or 4, total score is 30-40, every critical gate passes, and every declared route has desktop/mobile evidence.
6. Run the remaining local gates, including CodeQL, source-digest refresh, and focused quality validation. Do not select a Power Platform environment or create Dataverse/Power Pages records until steps 2-6 all pass.
7. After every local design and quality gate passes, complete the [template review handoff](references/template-review-handoff.md).
   Give the contributor a verified loopback preview URL when the site can run locally and direct links to the responsive preview evidence as a fallback.
   Present the fixed executive summary of the experience, checks, evidence freshness, limitations, and exact next environment stages.
   Ask whether to proceed, revise the template locally, or stop and preserve the draft. Do not select an environment or plan a write until the contributor explicitly chooses to proceed.
8. Only after the contributor approves the review handoff, ask them to select an environment and obtain explicit approval for each applicable write:
   - For **platform tables only**, skip custom solution and seed stages.
   - For **platform plus custom tables**, follow [Dataverse solution automation](references/dataverse-solution-automation.md), then [seed data automation](references/seed-data-automation.md).
   - For both modes, follow [inactive code-site automation](references/code-site-automation.md) without activating or assigning a public URL.
   Complete the applicable solution, seed data, website artifacts, documentation, manifest entry, and catalog integration using [template artifacts](references/template-artifacts.md).
9. Complete [end-to-end verification](references/end-to-end-verification.md) against this authored revision.
   Fix and repeat the consumer path until a full clean pass finds no gaps.
   If access, prerequisites, or consent block verification, report the blocker and leave the work incomplete.
10. Run the extension-free workflow in [automated accessibility](references/automated-accessibility.md) against the tested local app and final deployed site.
   Fix and repeat until every declared route, state, and viewport has zero axe-core violations, then generate self-contained HTML with Microsoft's `accessibility-insights-report` package and a deterministic summary under `website-code/docs/a11y-reports/`.
   Report the result as 100% of declared automated scans passed; never describe automated scans as proof of full WCAG compliance.
11. After verification passes, summarize the changes and validation.
   Ask for explicit approval before creating a pull request.
   If approved, create the pull request and report its URL.
   If declined, leave the work local and explain how to continue later.
12. After a pull request is created, offer the contributor the optional [verification cleanup](references/verification-cleanup.md).
   Preserve the verification environment by default. Delete only the exact solution, seed records, website records, and
   reversible environment-setting changes created by this verification run, and only after a separate destructive plan
   and approval hash are reviewed. Cleanup is not required for completion or PR review.

Completion means the approved scope is implemented, representative sample data and all required artifacts and real previews are present, the exceptional-design review has no failed critical gate and all categories score at least 3, deterministic and quality checks pass, all declared automated accessibility scans score 100 with zero violations and match the current source, CodeQL has zero findings, the contributor reviewed the local result and approved environment work, and the actual consumer path succeeds against this revision.
