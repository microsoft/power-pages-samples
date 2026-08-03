---
name: capture-power-pages-template-previews
description: Power Pages template preview capture. Use when the user wants to capture, refresh, or validate PNG preview screenshots for installable Power Pages templates, especially template previews folders or templates/manifest.json previewImages.
---

# Capture Power Pages template previews

Capture real PNG previews for an installable Power Pages template and wire them into `templates/manifest.json`.

## Step 1: Identify the preview source

Find the template entry in `templates/manifest.json` and the matching folder under `templates/spa/<id>/` or `templates/traditional/<id>/`.

Each manifest entry is a template family with one or more framework variants under `variants`.
The previews you capture describe the family, so note which variant you are capturing from and whether the family already has previews you would be replacing.

Decide where the screenshots should come from:

- Prefer a running local app when the template source can be run locally.
- Use a deployed Power Pages URL when local source is not available or the template is only available as a solution zip.
- Ask the user for a URL if neither source is discoverable.

Completion criterion: you know the template id, the site URL to capture, and the preview output folder.

## Step 2: Choose the preview set

Capture a small set of screenshots that show the template's actual installable experience.

Use stable, lowercase file names:

- `home.png` for the landing page or dashboard.
- `list.png` for a table, queue, gallery, or browse page.
- `detail.png` for a details page.
- `form.png` for create, edit, submit, or review flows.

Do not invent previews for pages you cannot reach.
If authentication, seed data, or permissions block a page, capture the reachable page and document the blocked one in the template README.

Completion criterion: every planned screenshot maps to a reachable route or the blocker is recorded.

## Step 3: Capture the PNGs

Use browser automation rather than manual screenshots.

Recommended capture settings:

- Desktop viewport: `1440x1000`.
- PNG format.
- Capture the visible viewport unless the page is intentionally scroll-led.
- Wait for network idle or the main content landmark before taking the screenshot.
- Remove transient UI first: cookie banners, chat widgets, dev overlays, toasts, and loading spinners.

If the page has responsive behavior worth showing, capture one extra mobile preview named `mobile.png` at `390x844`.
Only add it when mobile layout materially differs from desktop.

Completion criterion: the PNG files exist under the template's `previews/` folder and show real UI, not placeholders, loading skeletons, blank pages, or error states.

## Step 4: Check visual quality

Open or inspect the screenshots before editing the manifest.

Look for:

- Page content is loaded and readable.
- The image is not cropped in a way that hides the main task.
- The browser chrome is absent.
- No personal data, tenant names, access tokens, emails, or secrets are visible.
- The UI looks polished enough for a catalog preview.

If a screenshot exposes sensitive data, delete it and recapture with safe sample data.

Completion criterion: each screenshot is safe to commit and represents the template clearly.

## Step 5: Update the template contract

Add each preview path to the template's `previewImages` array in `templates/manifest.json`.

Previews belong to the template family, so they normally go in the family-level `previewImages` and live under `templates/<kind>/<id>/previews/`.
Every framework variant of a family renders the same UI, so add `variants.<framework>.previewImages` only when that variant genuinely looks different, and put those files under `variants/<framework>/previews/`.
The validator checks each path against the folder it belongs to, so a family preview listed under a variant fails even when the file exists.

Paths are relative to `templates/`, for example:

```json
"previewImages": [
  "spa/supplier-invoice-portal/previews/home.png",
  "spa/supplier-invoice-portal/previews/list.png"
]
```

Remove stale preview paths when the file no longer exists.
Do not list placeholder README files or non-PNG images.

Completion criterion: every manifest preview path points to a committed `.png` file.

## Step 6: Validate

Run the template validator:

```bash
node templates/scripts/validate-templates.js
```

If the repo has a PR workflow for template validation, make sure the local command matches what the workflow runs.

Completion criterion: validation passes, except for known managed-solution warnings already documented by the template.
