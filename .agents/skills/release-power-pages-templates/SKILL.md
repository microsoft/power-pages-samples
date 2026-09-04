---
name: release-power-pages-templates
description: Power Pages template release workflow. Use when the user wants to create a GitHub release, tag, release notes, or release summary for installable templates under templates/.
---

# Release Power Pages templates

Create a GitHub release for installable Power Pages templates from the current repository state.

## Step 1: Confirm the release scope

Identify which templates are included in the release by reading `templates/manifest.json`.

Confirm the release target:

- Tag name, such as `templates-v1.0.0`.
- Target ref, usually the current branch or `main`.
- Whether this is a draft release or a published release.

If the user did not provide a tag, propose one from the catalog version or date.

Completion criterion: you know the tag, target ref, release mode, and template IDs included.

## Step 2: Validate the template catalog

Run the template validator before tagging:

```bash
node templates/scripts/validate-templates.js
```

If the repo has validator tests, run them too:

```bash
node --test templates/scripts/validate-templates.test.js
```

Do not create a release when validation fails.
Fix the issue or report the blocker.

Completion criterion: validation passed, or the release is blocked with the failing command and error.

## Step 3: Build the release summary

Write release notes from the template catalog and git diff, not from memory alone.

Include:

- Template IDs and display names.
- Solution zip paths.
- SPA code paths.
- Seed data paths, if present.
- Preview image paths.
- Any known prerequisites from template READMEs.
- Validation commands run.

Keep the summary factual.
Mention known caveats such as Dataverse dependencies, seed import requirements, or file-column seed data.

Completion criterion: the notes explain what ships, how to validate it, and any setup caveats a user needs before installing.

## Step 4: Create and push the tag

Check whether the tag already exists locally or remotely:

```bash
git tag --list TAG_NAME
git ls-remote --tags origin TAG_NAME
```

If the tag exists, stop and ask whether to use a different tag.
Do not move or force-update an existing release tag.

Create an annotated tag:

```bash
git tag -a TAG_NAME -m "Release Power Pages templates TAG_NAME"
git push origin TAG_NAME
```

Completion criterion: the tag exists on the remote and points to the intended commit.

## Step 5: Create the GitHub release

Use the GitHub CLI from the repository root.

For a draft release:

```bash
gh release create TAG_NAME --draft --title "Power Pages templates TAG_NAME" --notes-file RELEASE_NOTES_FILE
```

For a published release:

```bash
gh release create TAG_NAME --title "Power Pages templates TAG_NAME" --notes-file RELEASE_NOTES_FILE
```

Attach template solution zips or SPA code archives only if the user asks for release assets.
The repository contains both assets, so the release can usually link to the immutable tag without duplicating them.

Completion criterion: GitHub shows the release for the tag.

## Step 6: Report the result

Return:

- Tag name.
- Release title.
- Draft or published state.
- Templates included.
- Validation commands run.
- Any follow-up, such as seed importer work or release asset upload.

Do not claim the release is published if it was created as a draft.
