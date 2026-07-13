# Contributing

This project welcomes contributions and suggestions. Most contributions require you to
agree to a Contributor License Agreement (CLA) declaring that you have the right to,
and actually do, grant us the rights to use your contribution. For details, visit
<https://cla.microsoft.com>.

When you submit a pull request, a CLA-bot will automatically determine whether you need
to provide a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the
instructions provided by the bot. You will only need to do this once across all repositories using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/)
or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Repository layout

Samples live under `samples/`, grouped by how they are delivered to Power Pages:

- **`spa/`** — code sites (single-page apps) built with a frontend framework and uploaded with the Power Platform CLI, split into two kinds:
  - **`spa/apps/<name>/<framework>/`** — full, multi-feature reference applications. Apps always keep a framework subfolder (e.g. `car-sales-website/react/`, `car-sales-website/angular/`) so multiple ports of the same app sit side by side.
  - **`spa/snippets/<topic>/`** — small, single-topic samples that each teach one capability. Snippets are React-only, so the framework subfolder is omitted and the React app sits directly under the topic folder.
  - **`spa/snippets/<topic>/<variant>/`** — a snippet family: several variants of one topic, each its own React app, with a parent `README.md` that indexes them. Variants are still React-only and still have no framework subfolder. See `spa/snippets/file-upload/` (with `notes/`, `file-column/`, `sharepoint/`, `azure-blob/` variants) as the reference.
- **`traditional/<name>/`** — non-code sites built with Liquid and web templates on the enhanced data model.
- **`server-logic/<name>/`** — server-side JavaScript that runs on the Power Pages runtime and can be called from both code sites and traditional sites.

### Where does my sample go?

- Teaches **one** capability and ships as a single React app → **`spa/snippets/`**. It stays a snippet even if it is polished — teaching one thing is what makes it a snippet.
- Shows several variants of one topic (e.g. "N ways to upload a file") → **`spa/snippets/<topic>/<variant>/`** with a parent index README.
- A **full, multi-feature** application → **`spa/apps/`**. As an objective test, choose `apps/` when the sample has **multiple routes/pages _and_ touches more than one Dataverse table or feature area**, or when it ships **more than one framework port**.
- A **non-code** (Liquid / web template) site → **`traditional/`**.
- A reusable **server-side** function → **`server-logic/`**.

**Snippet → app graduation:** a snippet becomes an app when it grows a second framework port (e.g. an Angular or Vue version is added). At that point, move it from `spa/snippets/<topic>/` to `spa/apps/<name>/<framework>/` so every port shares one parent. Apps are named with a `-website` or `-template` suffix (e.g. `car-sales-website`, `vue-admin-template`), so rename the topic folder accordingly on graduation (a `payments` snippet becomes `apps/payments-website/react/`, not `apps/payments/react/`).

**Server logic → `extensions/` graduation:** `server-logic/` is currently a top-level category because it is the only runtime-feature sample. When a **second, different** runtime-feature category is needed (for example a non-server-logic runtime extension), introduce a shared parent `extensions/` and move `server-logic/` under it (`extensions/server-logic/`) at that point — do not add the new feature as another top-level peer.

When adding a sample, follow the structure and README conventions of an existing sample in the same category (README with setup steps, deployment notes, and a `screenshot.png`).

## Contributing a template

Templates live under `templates/`.
They are installable starting points, not learning examples.
Use `samples/` when the contribution teaches a technique, pattern, or API.
Use `templates/` when the contribution is meant to be imported as a reusable Power Pages site.

The template catalog is `templates/manifest.json`.
Each entry must match `templates/schemas/templates-manifest.schema.json`.
SPA templates use a flat folder path: `templates/spa/<id>/`.
The folder name must match the manifest `id`, and the `id` must be stable kebab-case.
Traditional templates are reserved under `templates/traditional/`.

To contribute a template:

1. Build the SPA code site.
2. Export the Power Pages site solution zip.
3. Capture real PNG preview images.
4. Optionally author seed-data JSON files using this shape: `{ "entitySetName": "<plural entity set>", "records": [...] }`.
5. Create `templates/spa/<id>/` with a `solution/` subfolder and, when screenshots are ready, a `previews/` subfolder.
6. Append the template entry to `templates/manifest.json`.
7. Run `node templates/scripts/validate-templates.js`.
8. Open a pull request and follow the existing CLA bot instructions.

Preview images listed in the manifest must be `.png` files.
Do not list placeholder screenshots.
If screenshots or seed data are not ready, leave `previewImages` empty or omit `seedDataPath`, then add a short README in the template folder that explains what is missing.

The validator checks that referenced paths resolve under `templates/`, that the solution zip is real and contains `solution.xml`, and that the solution managed state is readable.
Managed solution zips are reported as warnings by default because the Supplier Invoice Portal starter zip supplied for the initial catalog entry is managed.
If a consuming pipeline requires unmanaged solutions, run `node templates/scripts/validate-templates.js --enforce-unmanaged` and replace managed zips with unmanaged exports before release.
