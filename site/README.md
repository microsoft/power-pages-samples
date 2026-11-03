# Showcase site

This folder holds the catalog site published at https://microsoft.github.io/power-pages-samples/.
It lists every template and sample with previews and links back to the source on GitHub.

The same GitHub Pages site also serves the repository stats report at https://microsoft.github.io/power-pages-samples/microsoft/power-pages-samples/latest-report/report.html.
The [GitHub Pages workflow](../.github/workflows/pages.yml) copies that report from the `github-repo-stats` branch at deploy time and never writes to that branch.

## Preview locally

Run these from the repository root:

```sh
node site/build.mjs
python3 -m http.server 4610 --directory _site
```

Then open http://localhost:4610/.
Rerun `node site/build.mjs` after each change.

## Add or update an entry

Catalog entries live in [`data.js`](data.js).
When you add a template or sample, add an entry in the matching category with its folder path, a one-sentence description, tags, and its preview images.

The build fails when:

- an entry points to a folder or image that does not exist
- a template in [`templates/manifest.json`](../templates/manifest.json) is missing from `data.js`, or the other way around

Pull requests that touch `site/`, `templates/`, or `samples/` run the build to catch these problems.

## Deployment

Every push to `main` that touches the site, templates, or samples deploys the site.
It also redeploys after each daily GitHub Repo Stats run so the report stays current.
The repository's Pages source must be set to **GitHub Actions** in **Settings > Pages**.
