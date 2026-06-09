# Power Pages Bring Your Own Code Samples

Bring Your Own Code (BYOC) samples show how to build Power Pages code sites with familiar frontend frameworks, run them locally, and upload them with the Power Platform CLI.

Use this index to choose the sample that best matches the framework or scenario you want to explore.

## Samples

| Preview | Sample | Framework | Scenario | Highlights |
| --- | --- | --- | --- | --- |
| <img src="react/car-sales-website/screenshot.png" alt="React car sales dashboard screenshot" width="220" /> | [Car Sales Website](react/car-sales-website/) | React + Vite | Sales dashboard and operations portal | Authentication, authorization with web roles, virtual tables, and Web API calls. |
| <img src="angular/car-sales-website/screenshot.png" alt="Angular car sales dashboard screenshot" width="220" /> | [Car Sales Website](angular/car-sales-website/) | Angular | Angular version of the car sales portal | Angular CLI workflow, dashboard UI, and Power Pages upload flow. |
| <img src="react/credit-cards-website/screenshot.png" alt="Woodgrove Bank credit cards website screenshot" width="220" /> | [Credit Cards Website](react/credit-cards-website/) | React + Vite | Banking and card application portal | Customer application journey, reviewer role, authentication, authorization, and Dataverse-backed data. |
| <img src="react/environment-variables-samples/vite-framework/screenshot.png" alt="Vite React environment variables sample screenshot" width="220" /> | [Environment Variables Demo](react/environment-variables-samples/vite-framework/) | React + Vite | Configuration and environment variables | Vite environment variable conventions, build-time values, and client-safe configuration. |
| <img src="react/fluent-ui-sample/screenshot.png" alt="Bank loan application portal screenshot" width="220" /> | [Fluent UI Bank Loan Application](react/fluent-ui-sample/) | React + Fluent UI | Loan application form and dashboard | Fluent UI v9 controls, form validation, tab navigation, and a data grid. |
| <img src="react/localization-sample/screenshot.png" alt="Contoso Blogs localization sample screenshot" width="220" /> | [Localization Sample](react/localization-sample/) | React + i18next | Multilingual blog site | Language switching, translated content, persistent locale selection, and i18next patterns. |
| <img src="react/authentication-sample/screenshot.png" alt="Authentication sample burger website screenshot" width="220" /> | [Authentication Sample](react/authentication-sample/) | React + Vite | Authentication flows | Local sign-in, registration, password reset, invitation redemption, external sign-in, terms acceptance, and protected profile content. |
| <img src="vue/vue-admin-template/screenshot.png" alt="Vue admin template screenshot" width="220" /> | [Vue Admin Template](vue/vue-admin-template/) | Vue + Vite | Admin template | Vue 3 app structure, Vite build workflow, and Power Pages upload flow. |

## Common workflow

1. Open the sample folder.
1. Install dependencies with `npm install` or `npm ci`.
1. Run the local development server with the command listed in the sample README.
1. Build the app with `npm run build`.
1. Upload the code site with `pac pages upload-code-site --rootPath .`.

For Power Pages setup details, prerequisites, and sample-specific configuration, see the README in each sample folder.
