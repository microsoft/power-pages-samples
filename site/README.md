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
The footer's **Repository stats** link only works on the deployed site, because the report is added at deploy time.

## Shareable links

Every view of the catalog has its own URL, so people can share exactly what they see.
The address bar updates as visitors search, filter, and browse previews, and the catalog and the detail panel both have a **Copy link** button.

| Link | Opens |
| --- | --- |
| `?item=311-portal` | The 311 Portal detail panel |
| `?item=program-registration&page=registration-flow&view=mobile` | One preview page, on mobile |
| `?type=spa` | SPA templates only |
| `?publisher=Microsoft` | Templates from one publisher |
| `?q=upload` | Search results for "upload" |
| `#samples`, `#apps`, `#snippets`, `#server-logic`, `#traditional` | A section of the catalog |

Parameters combine, for example `?q=react&type=spa#templates`.
`page` is the preview's label in lowercase with dashes.
Links from the first release that used `#item=<id>` still open the right entry.

## Design

The site follows the design standard in the Power Pages plugin's `exceptional-web-design` skill from [Power Platform Skills](https://aka.ms/ppskills).
Design tokens live in [`theme.css`](theme.css), and [`styles.css`](styles.css) uses only those tokens.
To review a change, build and serve the site, then run the plugin's design review against `http://localhost:4610/`.

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
