---
name: add-template
description: Create and contribute an installable Power Pages template to this repository. Use when adding a community SPA or Liquid/web-template non-SPA template to the templates catalog.
compatibility: Requires a checkout of microsoft/power-pages-samples. PAC CLI, a browser, and a suitable Power Platform environment are needed for packaging and live previews.
---

# Contribute a Power Pages template

1. Read `CONTRIBUTING.md`, `templates/README.md`, the manifest schema, and [template artifacts](references/template-artifacts.md).
   Ask for any missing template name, purpose, audience, and publisher.
   Microsoft is the default for Microsoft contributions; ask external contributors for their own publisher.
   Ask for the framework: React, Angular, Vue, Astro, or non-SPA Liquid/web templates, in that order.
   If another framework is requested, check the current schema and validator before proceeding; explain unsupported choices and ask for a supported choice or an explicitly approved contract change.
   Confirm the template ID and scope with the contributor.
2. Plan the website, data model, permissions, dependencies, and seed records together.
   Obtain approval before making changes to an environment.
   Create the site and complete the shared unmanaged solution, seed data, website artifacts, documentation, manifest entry, and catalog integration using [template artifacts](references/template-artifacts.md).
   Include the existing Power Pages attribution badge on every site, including Liquid sites.
3. Capture real previews by following [SPA previews](references/spa-previews.md) for a framework variant or [non-SPA previews](references/non-spa-previews.md) for Liquid.
   If a prerequisite, approval, deployment, or screenshot is blocked, retain the local work and report what is missing; do not invent images or claim completion.
4. Run the template validator, relevant site tests, and catalog build as described in [template artifacts](references/template-artifacts.md).
5. Ask the contributor to select an environment and complete [end-to-end verification](references/end-to-end-verification.md) against this authored revision.
   Fix and repeat the consumer path until a full clean pass finds no gaps.
   If access, prerequisites, or consent block verification, report the blocker and leave the work incomplete.
6. After verification passes, summarize the changes and validation.
   Ask for explicit approval before creating a pull request.
   If approved, create the pull request and report its URL.
   If declined, leave the work local and explain how to continue later.

Completion means the approved scope is implemented, all required artifacts and real previews are present, checks pass, and the actual consumer path succeeds against this revision.
