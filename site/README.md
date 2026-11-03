# Templates site

This folder holds the Power Pages templates site published at https://microsoft.github.io/power-pages-samples/.
It lists every template in [`templates/manifest.json`](../templates/manifest.json) with previews and links back to the source on GitHub.
Samples are not listed on the site; browse them in [`samples/`](../samples/).

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
| `?q=invoice` | Search results for "invoice" |
| `#templates` | The catalog, scrolled into view |

Parameters combine, for example `?q=react&type=spa#templates`.
`page` is the preview's label in lowercase with dashes.
Links from the first release that used `#item=<id>` still open the right template.

## Design

The site follows the design standard in the Power Pages plugin's `exceptional-web-design` skill from [Power Platform Skills](https://aka.ms/ppskills).
Design tokens live in [`theme.css`](theme.css), and [`styles.css`](styles.css) uses only those tokens.
To review a change, build and serve the site, then run the plugin's design review against `http://localhost:4610/`.

## Add or update a template

The site is generated from [`templates/manifest.json`](../templates/manifest.json).
The build turns each template into a catalog entry: its name, description, SPA or non-SPA type, publisher, frameworks, capabilities or keywords, and preview images.
A new template appears on the site once its manifest entry merges, with no change in this folder.
To give a template different catalog copy than its manifest description, add it to `templateOverrides` in [`data.js`](data.js).

The build fails when:

- a template's folder or preview image does not exist
- a template's `kind` has no matching category in `data.js`
- `templateOverrides` names a template that is not in the manifest

Pull requests that touch `site/` or `templates/` run the build to catch these problems.

## Deployment

Every push to `main` that touches the site or templates deploys the site.
It also redeploys after each daily GitHub Repo Stats run so the report stays current.
The repository's Pages source must be set to **GitHub Actions** in **Settings > Pages**.
