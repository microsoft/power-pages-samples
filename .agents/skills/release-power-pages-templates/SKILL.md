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

If the user provided a tag, use it and check for conflicts in Step 4.
Otherwise, read the latest published release from GitHub:

```bash
gh api 'repos/{owner}/{repo}/releases/latest' --jq .tag_name
```

Use that release tag as the version baseline.
GitHub's latest-release endpoint excludes drafts and prereleases.
Keep the tag prefix and parse its semantic version, such as `templates-v1.1.0`.
Read the diff and commit history between that tag and the intended target ref, focusing on the changes being released.
Choose the increment from those changes:

- Major for breaking changes to installation, configuration, or supported template behavior.
- Minor for new templates or backward-compatible functionality.
- Patch for backward-compatible fixes, documentation, or maintenance without new functionality.

Use the highest applicable increment.
Reset the minor and patch numbers to zero for a major increment, and the patch number to zero for a minor increment.
For example, from `templates-v1.1.0`, propose `templates-v1.1.1` for fixes, `templates-v1.2.0` for a new template, or `templates-v2.0.0` for a breaking change.
Explain the increment using the changes found and confirm the proposed tag.
If compatibility is unclear, ask the user before choosing the increment.

Catalog and individual template versions describe template metadata; they do not determine the release tag.
If no published release exists, ask the user for the initial tag.
If the lookup fails for another reason, report the error and resolve it before proposing a version.
If the latest tag has no recognizable semantic version, ask the user for the next tag.
Do not substitute a catalog version, date, draft, prerelease, or local tag when the published-release baseline is unavailable.

Completion criterion: you know the confirmed tag, target ref, release mode, and template IDs included; an inferred tag is based on the latest published release and the changes since it.

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
Use the latest published release tag as the comparison base when one exists.

Include:

- Template IDs and display names.
- Derived unpacked solution source paths.
- Derived website code paths.
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

Attach packed solution zips or website code archives only if the user asks for release assets.
Website code lives under `templates/<kind>/<template-id>/variants/<variant>/website-code/`.
Shared supporting solutions live under `templates/<kind>/<template-id>/solutions/<solution-unique-name>/`.
When solution zips are requested, discover every direct folder under the template family's `solutions/` directory, sort them by case-insensitive unique name, pack each into a temporary directory with `pac solution pack --packagetype Unmanaged`, attach the results, and remove the temporary directory.
The repository stores the unpacked solution source, so a release can usually link to the immutable tag without duplicating it.

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
