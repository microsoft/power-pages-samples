# Power Pages SPA Samples

SPA samples show how to build Power Pages code sites with familiar frontend frameworks, run them locally, and upload them with the Power Platform CLI.

Use this index to choose the sample that best matches the framework or scenario you want to explore. Samples are grouped into **[full applications](apps/)** and **[single-topic snippets](snippets/)**.

## Full applications (`apps/`)

| Preview | Sample | Framework | Scenario | Highlights |
| --- | --- | --- | --- | --- |
| <img src="apps/car-sales-website/react/screenshot.png" alt="React car sales dashboard screenshot" width="220" /> | [Car Sales Website](apps/car-sales-website/react/) | React + Vite | Sales dashboard and operations portal | Authentication, authorization with web roles, virtual tables, and Web API calls. |
| <img src="apps/car-sales-website/angular/screenshot.png" alt="Angular car sales dashboard screenshot" width="220" /> | [Car Sales Website](apps/car-sales-website/angular/) | Angular | Angular version of the car sales portal | Angular CLI workflow, dashboard UI, and Power Pages upload flow. |
| <img src="apps/credit-cards-website/react/screenshot.png" alt="Woodgrove Bank credit cards website screenshot" width="220" /> | [Credit Cards Website](apps/credit-cards-website/react/) | React + Vite | Banking and card application portal | Customer application journey, reviewer role, authentication, authorization, and Dataverse-backed data. |
| <img src="apps/vue-admin-template/vue/screenshot.png" alt="Vue admin template screenshot" width="220" /> | [Vue Admin Template](apps/vue-admin-template/vue/) | Vue + Vite | Admin template | Vue 3 app structure, Vite build workflow, and Power Pages upload flow. |

## Single-topic snippets (`snippets/`)

| Preview | Sample | Framework | Scenario | Highlights |
| --- | --- | --- | --- | --- |
| <img src="snippets/environment-variables/screenshot.png" alt="Vite React environment variables sample screenshot" width="220" /> | [Environment Variables Demo](snippets/environment-variables/) | React + Vite | Configuration and environment variables | Vite environment variable conventions, build-time values, and client-safe configuration. |
| <img src="snippets/fluent-ui/screenshot.png" alt="Bank loan application portal screenshot" width="220" /> | [Fluent UI Bank Loan Application](snippets/fluent-ui/) | React + Fluent UI | Loan application form and dashboard | Fluent UI v9 controls, form validation, tab navigation, and a data grid. |
| <img src="snippets/localization/screenshot.png" alt="Contoso Blogs localization sample screenshot" width="220" /> | [Localization Sample](snippets/localization/) | React + i18next | Multilingual blog site | Language switching, translated content, persistent locale selection, and i18next patterns. |
| <img src="snippets/authentication/screenshot.png" alt="Authentication sample burger website screenshot" width="220" /> | [Authentication Sample](snippets/authentication/) | React + Vite | Authentication flows | Local sign-in, registration, password reset, invitation redemption, external sign-in, terms acceptance, and protected profile content. |
| <img src="snippets/cloud-flow/screenshot.png" alt="Cloud flow sample screenshot" width="220" /> | [Cloud Flow Sample](snippets/cloud-flow/) | React + Vite | Call a Power Automate cloud flow | Invoke a registered flow with `/_api/cloudflow/v1.0/trigger/<id>`, CSRF token, and render the response. |
| <img src="snippets/file-upload/notes/screenshot.png" alt="File upload sample screenshot" width="220" /> | [File Upload (Notes) Sample](snippets/file-upload/notes/) | React + Vite | Upload and download files via the Web API | Store files as Dataverse notes (annotations), with base64 `documentbody`, CSRF, and size/type guards. |
| <img src="snippets/file-upload/file-column/screenshot.png" alt="File upload file column sample screenshot" width="220" /> | [File Upload (File Column) Sample](snippets/file-upload/file-column/) | React + Vite | Upload files to a native File column | Store files in a Dataverse **File column** (`PATCH` raw bytes + `$value` download, no base64), with companion columns, CSRF, and size/type guards. |
| <img src="snippets/file-upload/sharepoint/screenshot.png" alt="SharePoint file upload sample screenshot" width="220" /> | [File Upload (SharePoint) Sample](snippets/file-upload/sharepoint/) | React + Vite | Upload files to SharePoint via server logic | Reach a SharePoint document library from a code site through **server logic** (`/_api/serverlogics`) + Microsoft Graph, with CSRF and per-user folders. Text documents (server logic's HttpClient is text-only). |
| <img src="snippets/file-upload/azure-blob/screenshot.png" alt="Azure Blob file upload sample screenshot" width="220" /> | [File Upload (Azure Blob) Sample](snippets/file-upload/azure-blob/) | React + Vite | Upload files to Azure Blob storage | Store files in your own **Azure Blob** container via the file-management Web API (`/_api/file/...`: initialize → chunked `UploadBlock` → download/delete), tracked by an annotation placeholder. |

## Common workflow

1. Open the sample folder.
1. Install dependencies with `npm install` or `npm ci`.
1. Run the local development server with the command listed in the sample README.
1. Build the app with `npm run build`.
1. Upload the code site with `pac pages upload-code-site --rootPath .`.

For Power Pages setup details, prerequisites, and sample-specific configuration, see the README in each sample folder.
