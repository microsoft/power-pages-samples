# Template review handoff

Run this handoff after every local design and quality gate passes and before selecting a Power Platform environment.
Its purpose is to let the contributor inspect the exact revision, understand the evidence, and decide whether any
Dataverse or Power Pages work should begin.

## Show the template

For an SPA, use the committed lockfile to restore dependencies when needed, build the production app, and start its
documented production preview command on an available loopback-only address such as `http://127.0.0.1:<port>`.
Verify the URL responds and that its source digest is the one recorded in `docs/quality-manifest.json` before presenting
the link. Never bind this review server to a public interface.

Keep the server available while the contributor reviews it. Also link the template's `previews/` directory and identify
the desktop and mobile image for every declared route. These images are the fallback when a local server cannot run.
For a non-SPA template, use an already verified local or inactive-site URL when available; otherwise present the
responsive preview images and state that the review is image-based.

If a server, URL, or image is unavailable, report the exact gap. Do not replace missing rendered evidence with a claim
that the template was reviewed.

## Executive summary

Present one compact summary with these sections:

1. **Template** — name, ID, framework, purpose, intended audience, and selected data scope.
2. **Experience** — every declared route and the primary workflow the contributor should try.
3. **Design review** — score out of 40, verdict, review rounds, category floor, and failed critical-gate count.
4. **Automated accessibility** — scanned route/state/viewport count, score, violations, incomplete checks, and report
   location. Say that this covers declared automated scans and is not proof of full WCAG compliance.
5. **CodeQL** — analyzed language, finding count, extraction/execution error count, and SARIF location.
6. **Functional quality** — unit, build/typecheck, Playwright workflow, responsive, keyboard, and console-error results.
7. **Evidence freshness** — whether the quality manifest, design review, source, and seed data share the current digest.
8. **Limitations** — anything not tested, manual checks still recommended, unsupported metadata, or known unrelated
   repository failures.
9. **Proposed environment work** — state exactly what the next stage would create:
   - `platform-only`: no custom business tables or seed package; create only the approved inactive Power Pages source
     site and its authoritative metadata.
   - `custom`: create the reviewed unmanaged solution, publisher, custom schema, permissions, seed records, and inactive
     Power Pages source site.

Use actual counts from the generated evidence and test output. A check with missing or stale evidence is not passing.

## Decision gate

After presenting the preview and summary, ask the contributor to choose exactly one:

- **Proceed to Power Platform setup** — stop the review server unless they ask to keep it running, then ask them to
  select an environment. Environment-bound plans and their separate approval hashes are still required.
- **Revise the template locally** — make no environment calls. Apply the requested changes, rerun every affected check,
  refresh source-bound evidence, and repeat this handoff.
- **Stop and preserve the draft** — make no environment calls, stop the review server, and report the draft and evidence
  locations for resumption.

A general request to create a template is not approval to proceed. Approval must come after this summary and applies
only to beginning the environment-planning stage; it does not replace later approval for any environment-bound write.
