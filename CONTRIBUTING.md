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
- **`traditional/<name>/`** — non-code sites built with Liquid and web templates on the enhanced data model.
- **`server-logic/<name>/`** — server-side JavaScript that runs on the Power Pages runtime and can be called from both code sites and traditional sites.

### Where does my sample go?

- Teaches **one** capability and ships as a single React app → **`spa/snippets/`**.
- A **full, multi-feature** application, or one that ships more than one framework port → **`spa/apps/`**.
- A **non-code** (Liquid / web template) site → **`traditional/`**.
- A reusable **server-side** function → **`server-logic/`**.

**Graduation rule:** a snippet becomes an app when it grows a second framework port (e.g. an Angular or Vue version is added). At that point, move it from `spa/snippets/<topic>/` to `spa/apps/<name>/<framework>/` so every port shares one parent.

When adding a sample, follow the structure and README conventions of an existing sample in the same category (README with setup steps, deployment notes, and a `screenshot.png`).
