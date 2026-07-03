# Migration guide — samples reorganized

The `samples/` folder was reorganized (July 2026) from a **framework-first**
layout (`samples/spa/react/…`, `samples/spa/angular/…`, `samples/spa/vue/…`) to a
**category-first** layout:

- `spa/apps/` — full, multi-feature reference applications (`<name>/<framework>/`)
- `spa/snippets/` — single-topic samples (React-only, flat)
- `traditional/` — non-code Liquid / web-template sites
- `server-logic/` — server-side runtime code

GitHub does **not** redirect renamed paths, so links that pointed at the old
locations now return 404. Use the table below to find where a sample moved.

## Moved paths (old → new)

| Sample | Old path (before reorg) | New path |
| --- | --- | --- |
| Car Sales Website (React) | `samples/spa/react/car-sales-website/` | `samples/spa/apps/car-sales-website/react/` |
| Car Sales Website (Angular) | `samples/spa/angular/car-sales-website/` | `samples/spa/apps/car-sales-website/angular/` |
| Credit Cards Website (React) | `samples/spa/react/credit-cards-website/` | `samples/spa/apps/credit-cards-website/react/` |
| Vue Admin Template (Vue) | `samples/spa/vue/vue-admin-template/` | `samples/spa/apps/vue-admin-template/vue/` |
| Environment Variables | `samples/spa/react/environment-variables-samples/vite-framework/` | `samples/spa/snippets/environment-variables/` |
| Fluent UI | `samples/spa/react/fluent-ui-sample/` | `samples/spa/snippets/fluent-ui/` |
| Localization | `samples/spa/react/localization-sample/` | `samples/spa/snippets/localization/` |
| Authentication | `samples/spa/react/authentication-sample/` | `samples/spa/snippets/authentication/` |
| Cloud Flow | `samples/spa/react/cloud-flow-sample/` | `samples/spa/snippets/cloud-flow/` |
| File Upload (all variants) | `samples/spa/react/file-upload/` | `samples/spa/snippets/file-upload/` |
| SharePoint server logic | `samples/server-logic/sharepoint-integration/` | _(unchanged)_ |

> Some folders were also renamed during the move (for example
> `environment-variables-samples/vite-framework` → `environment-variables`, and the
> `-sample` suffixes were dropped), so the new name may not match the old one
> exactly — use the table rather than guessing.

For how the categories are organized going forward, see
[CONTRIBUTING.md](CONTRIBUTING.md).
