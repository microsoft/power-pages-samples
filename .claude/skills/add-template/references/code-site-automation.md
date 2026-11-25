# Inactive code-site automation

Use `templates/scripts/code-site.js` to create the authoritative Power Pages code-site metadata required by the current
clone-based template installer. This stage creates an inactive website record only. It never activates the site, chooses
a subdomain, or creates a public URL.
Run it only after the local exceptional-web-design and deterministic quality gates have passed and the contributor has
explicitly chosen to proceed during the [template review handoff](template-review-handoff.md).

## Plan

Build the project and confirm the target environment allows JavaScript uploads. Then run:

```powershell
node templates\scripts\code-site.js plan `
  --root <website-code> `
  --environment <environment-url> `
  --site-name "<template source name>" `
  --out <code-site-plan.json>
```

The immutable plan binds the normalized environment URL, site name, absolute source root, compiled output path, and a
digest of every upload-relevant source/build file. It refuses an existing `.powerpages-site`.

## Create

Show the exact inactive record write and obtain approval for the plan hash:

```powershell
node templates\scripts\code-site.js create `
  --plan <code-site-plan.json> `
  --approve <approval-hash> `
  --journal <code-site-journal.json>
```

The command rechecks the source digest, selects the approved PAC environment, runs `pac pages upload-code-site`, verifies
the PAC-generated `.powerpages-site/website.yml`, and confirms through `pac pages list -v` that the site is inactive.
Do not invoke activation in this workflow.

## Update an existing inactive source site

After a later local revision passes the quality gates and the contributor approves the review handoff, generate a new
source-and-identity-bound update plan:

```powershell
node templates\scripts\code-site.js plan-update `
  --root <website-code> `
  --environment <environment-url> `
  --out <code-site-update-plan.json>
```

The plan binds the environment, PAC-owned website ID and name, compiled output, and current source digest. Show the full
plan and obtain explicit approval for its hash before running:

```powershell
node templates\scripts\code-site.js update `
  --plan <code-site-update-plan.json> `
  --approve <approval-hash> `
  --journal <code-site-update-journal.json>
```

The update rechecks source and local identity, selects the approved environment, verifies the existing website is
inactive and has no public URL before upload, uploads without a new site name, and verifies the same inactive identity
afterward. It never creates a second site or activates the existing one.
