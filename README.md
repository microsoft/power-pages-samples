# Power Pages Samples

This repository contains samples and templates for Microsoft Power Pages.
Use the tables below to find a template for a new site or a sample that explains a framework, scenario, or Power Pages capability.

Each sample includes its own README with setup steps, deployment notes, and a screenshot so you can preview the experience before running it locally.

> **Reorganized July 2026.** The `samples/` folder moved from a framework-first to a category-first layout. If you followed an older link, see [MIGRATION.md](MIGRATION.md) for old → new paths.

## Templates at a glance

Templates under [`templates/`](templates/) are starting points for new Power Pages sites.
Samples under [`samples/`](samples/) are learning examples for specific patterns and capabilities.
See the [template guide](templates/README.md) for installation and provisioning workflows, and the [template catalog](templates/manifest.json) for metadata and prerequisites.

### Non-SPA templates (`templates/non-spa/`)

These templates are provisioned by the Power Pages Create Website API.
The repository contains catalog metadata, documentation, and desktop/mobile previews, not downloadable website source or solutions.
See the [non-SPA template guide](templates/non-spa/) for the provisioning workflow.

| Preview | Template | Scenario |
| --- | --- | --- |
| <img src="templates/non-spa/starter-layout-1/previews/desktop-home.png" alt="Starter Layout 1 home page" width="180" /> | [Starter Layout 1](templates/non-spa/starter-layout-1/) | Start a multipage site with navigation and common page building blocks. |
| <img src="templates/non-spa/blank-page/previews/desktop-home.png" alt="Blank Page home page" width="180" /> | [Blank Page](templates/non-spa/blank-page/) | Build a custom site without preset sections or components. |
| <img src="templates/non-spa/program-registration/previews/desktop-event-catalog.png" alt="Program Registration event catalog" width="180" /> | [Program Registration](templates/non-spa/program-registration/) | Browse programs and register for individual or multi-day classes. |
| <img src="templates/non-spa/schedule-and-manage-meetings/previews/desktop-home.png" alt="Schedule and Manage Meetings home page" width="180" /> | [Schedule and Manage Meetings](templates/non-spa/schedule-and-manage-meetings/) | Schedule appointments with staff members for specific topics. |

### SPA templates (`templates/spa/`)

SPA templates include downloadable website code, shared supporting Dataverse solutions, and seed data.
Follow each template's README to import the solutions and seed data, then deploy the website code.

| Preview | Template | Framework | Scenario |
| --- | --- | --- | --- |
| <img src="templates/spa/311-portal/previews/home.png" alt="311 Portal home page" width="180" /> | [311 Portal](templates/spa/311-portal/) | React + Vite | Citizen service requests, request tracking, maps, and knowledge articles. |
| <img src="templates/spa/supplier-invoice-portal/previews/home.png" alt="Supplier Invoice Portal home page" width="180" /> | [Supplier Invoice Portal](templates/spa/supplier-invoice-portal/) | React + Vite | Supplier onboarding, purchase orders, invoice submission, and review. |

## Samples at a glance

Samples are organized under `samples/`:

- **`spa/apps/`** — full, multi-feature reference applications.
- **`spa/snippets/`** — small, single-topic samples that each teach one capability.
- **`traditional/`** — non-SPA sites built with Liquid and web templates on the enhanced data model.
- **`server-logic/`** — server-side JavaScript that runs on the Power Pages runtime, callable from both SPA and non-SPA sites.

### Full applications (`samples/spa/apps/`)

| Preview | Sample | Framework | Use this sample to learn |
| --- | --- | --- | --- |
| <img src="samples/spa/apps/car-sales-website/react/screenshot.png" alt="React car sales dashboard screenshot" width="180" /> | [Car Sales Website](samples/spa/apps/car-sales-website/react/) | React + Vite | Build a dashboard-style SPA site with authentication, web roles, virtual tables, and Power Pages Web API integration. |
| <img src="samples/spa/apps/car-sales-website/angular/screenshot.png" alt="Angular car sales dashboard screenshot" width="180" /> | [Car Sales Website](samples/spa/apps/car-sales-website/angular/) | Angular | Use Angular CLI to build and upload a Power Pages SPA site based on the car sales scenario. |
| <img src="samples/spa/apps/credit-cards-website/react/screenshot.png" alt="Woodgrove Bank credit cards website screenshot" width="180" /> | [Credit Cards Website](samples/spa/apps/credit-cards-website/react/) | React + Vite | Create a customer-facing banking site with card browsing, applications, reviewer workflows, authentication, authorization, and Web API calls. |
| <img src="samples/spa/apps/vue-admin-template/vue/screenshot.png" alt="Vue admin template screenshot" width="180" /> | [Vue Admin Template](samples/spa/apps/vue-admin-template/vue/) | Vue + Vite | Start from a Vue 3 admin-style template that can be uploaded as a Power Pages SPA site. |

### Single-topic snippets (`samples/spa/snippets/`)

| Preview | Sample | Framework | Use this sample to learn |
| --- | --- | --- | --- |
| <img src="samples/spa/snippets/environment-variables/screenshot.png" alt="Vite React environment variables sample screenshot" width="180" /> | [Environment Variables Demo](samples/spa/snippets/environment-variables/) | React + Vite | Understand how Vite exposes client-safe environment variables and compile-time constants. |
| <img src="samples/spa/snippets/fluent-ui/screenshot.png" alt="Bank loan application portal screenshot" width="180" /> | [Fluent UI Bank Loan Application](samples/spa/snippets/fluent-ui/) | React + Fluent UI | Build a form-driven portal using Fluent UI v9 controls, state management, and a dashboard-style data grid. |
| <img src="samples/spa/snippets/localization/screenshot.png" alt="Contoso Blogs localization sample screenshot" width="180" /> | [Localization Sample](samples/spa/snippets/localization/) | React + i18next | Add multilingual content, language switching, and localization patterns to a Power Pages SPA site. |
| <img src="samples/spa/snippets/authentication/screenshot.png" alt="Authentication sample burger website screenshot" width="180" /> | [Authentication Sample](samples/spa/snippets/authentication/) | React + Vite | Explore local sign-in, registration, password reset, invitation redemption, external sign-in, terms acceptance, and role-protected content. |
| <img src="samples/spa/snippets/cloud-flow/screenshot.png" alt="Cloud flow sample screenshot" width="180" /> | [Cloud Flow Sample](samples/spa/snippets/cloud-flow/) | React + Vite | Invoke a registered Power Automate cloud flow from an SPA site with the CSRF token, and render its response. |
| <img src="samples/spa/snippets/file-upload/notes/screenshot.png" alt="File upload sample screenshot" width="180" /> | [File Upload (Notes) Sample](samples/spa/snippets/file-upload/notes/) | React + Vite | Upload, list, download, and delete files via the Web API, stored as Dataverse notes (annotations). |
| <img src="samples/spa/snippets/file-upload/file-column/screenshot.png" alt="File upload file column sample screenshot" width="180" /> | [File Upload (File Column) Sample](samples/spa/snippets/file-upload/file-column/) | React + Vite | Upload, list, download, and delete files via the Web API, stored in a native Dataverse File column (binary, no base64). |
| <img src="samples/spa/snippets/file-upload/sharepoint/screenshot.png" alt="SharePoint file upload sample screenshot" width="180" /> | [File Upload (SharePoint) Sample](samples/spa/snippets/file-upload/sharepoint/) | React + Vite | Upload, list, download, and delete files in a SharePoint document library, reached from an SPA site through server logic and Microsoft Graph. |
| <img src="samples/spa/snippets/file-upload/azure-blob/screenshot.png" alt="Azure Blob file upload sample screenshot" width="180" /> | [File Upload (Azure Blob) Sample](samples/spa/snippets/file-upload/azure-blob/) | React + Vite | Upload, list, download, and delete files via the Web API, stored in your own Azure Blob container (chunked uploads, up to 10 GB). |

### Non-SPA sites (`samples/traditional/`)

Non-SPA sites built with Liquid and web templates on the enhanced data model.

| Sample | Type | Use this sample to learn |
| --- | --- | --- |
| [EDM Liquid Web Template Starter](samples/traditional/edm-liquid-webtemplate-starter/) _(planned — placeholder)_ | Liquid + web template | Render Dataverse data on a non-SPA site with a web template and Liquid on the enhanced data model. |

### Server logic (`samples/server-logic/`)

Server-side JavaScript that runs on the Power Pages runtime, callable from both SPA and non-SPA sites.

| Sample | Integrates | Use this sample to learn |
| --- | --- | --- |
| [SharePoint Integration](samples/server-logic/sharepoint-integration/) | Microsoft Graph + SharePoint | Call Microsoft Graph and SharePoint Online from server logic using an Entra client-credentials app. Pairs with the [File Upload (SharePoint)](samples/spa/snippets/file-upload/sharepoint/) SPA sample. |
| [Unbound Custom API Invocation](samples/server-logic/unbound-custom-api/) | Dataverse Custom APIs | Invoke an unbound Custom Action with `POST` and a parameterized unbound Custom Function with `GET` from server logic using a ready-to-import solution. |
| [CSP Violation Reporting](samples/server-logic/csp-reporting/) | Reporting API + CSP | Receive browser-generated CSP violation reports in a defensive anonymous Server Logic endpoint while preserving antiforgery protection everywhere else. |

## Sample categories

- [SPA Samples](samples/spa/) - SPA samples built with popular frontend frameworks and uploaded to Power Pages with the Power Platform CLI. Split into [full applications](samples/spa/apps/) and [single-topic snippets](samples/spa/snippets/).
- [Non-SPA Samples](samples/traditional/) - non-SPA sites built with Liquid and web templates on the enhanced data model.
- [Server Logic Samples](samples/server-logic/) - server-side JavaScript that runs on the Power Pages runtime.

## Resources

- [Get started with Power Pages tutorials](https://learn.microsoft.com/en-us/power-pages/getting-started/tutorial-overview)
- [Building websites with Power Pages - Online workshop](https://learn.microsoft.com/en-us/training/paths/power-pages-online-workshop/)
- [Power Platform developer docs](https://learn.microsoft.com/power-platform/developer)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guide.

## License

The code in this repo is licensed under the [MIT](LICENSE.txt) license.

---
Trademarks This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft trademarks or logos is subject to and must follow Microsoft’s Trademark & Brand Guidelines. Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship. Any use of third-party trademarks or logos are subject to those third-party’s policies.
