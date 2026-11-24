# Modern CSS Template

The Modern CSS Template is an installable Power Pages SPA for customer support. Signed-in customers create and track their personal cases, reply to support and share documents. Everyone can browse published knowledge articles, with optional generative AI search grounded only in knowledge. New portal cases can be handed to the Dynamics 365 **Case Management Agent** in Full automation mode, and accepted outgoing email responses are published back to the case conversation. The template contains a shared unmanaged Dataverse solution and a React SPA site under `variants/react/website-code/`, branded with the fictional **Northwind Field Services** identity.

## Previews

| Home | My cases |
| --- | --- |
| ![Modern CSS Template home page](previews/home.png) | ![Modern CSS Template case list](previews/cases.png) |

| Case details | Knowledge article |
| --- | --- |
| ![Modern CSS Template case details](previews/case-detail.png) | ![Modern CSS Template knowledge article](previews/knowledge.png) |

| Account and support |
| --- |
| ![Modern CSS Template account and support page](previews/account.png) |

## Data model

The site uses standard Dynamics 365 Customer Service and Power Pages tables, with no custom tables:
- `incident` stores the customer's cases (Web origin, Contact as customer).
- `adx_portalcomment` stores the customer-visible case conversation.
- `annotation` stores customer documents and internal automation records.
- `knowledgearticle` provides published external knowledge.
- `contact` is the signed-in portal identity.

There is no seed data. The site works with your environment's cases and published knowledge articles. Run the website code locally with `npm run dev` to see the built-in demonstration content.

The **ModernCSSMetadata** solution adds only the supporting components the site depends on:

| Component | Purpose |
| --- | --- |
| Cloud flow **Case Management Agent (full automation)** | Dispatches portal-created Web cases only when effective resolution settings allow Full automation. |
| Cloud flow **Publish reviewed response to portal** | Publishes an outgoing case reply as a customer-visible Portal Comment once Dynamics accepts the Send. Native Send acceptance does not prove human review. |
| Cloud flow **Document Verifier - Verify document**, **Document Verifier** Copilot Studio agent, **Document Verification** AI prompt | Optional case-attachment verification building blocks; the separate card-name continuation flow is not packaged. |
| Content Conversion and Copilot Studio connection references | Target-specific connections must be bound on import. |
| System view **Support KB Search** on `knowledgearticle` | Knowledge-only scope for AI search. |
| Environment variables `ppst_ModernCss_PortalApplicationUserId`, `ppst_ModernCss_PortalUrl` | The site's application user ID and the site URL. |

The solution contains no plug-ins. Component display names are brand-neutral. Existing schema names, component IDs and historical receipt markers are retained to preserve solution lineage and duplicate-processing protection.

See the [website code README](variants/react/website-code/README.md) for the site architecture, permissions, server logic, AI search and agent integration details.

## Install manually

Use these steps when installing the template without an installer skill.

The catalog marks `ModernCSSMetadata` with `"publishChanges": true`.
Import it with `pac solution import --publish-changes` so the knowledge search view is published.
The PAC publication step can include other pending customizations in the target environment.

Unlike templates whose solutions only add tables, this solution needs the site's application user ID as an environment variable value. Upload the site first so that user exists, then import the solution.

### Prerequisites

- Install the [Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction).
- Install English (LCID 1033) in the target Dataverse environment.
- Install Dynamics 365 Customer Service with Case Management Agent, Customer Intent Agent, knowledge management, Copilot Studio and AI Builder prompt support. The refreshed export declares dependencies on `PowerPages_RuntimeCore`, `msdynce_Service`, `msdyn_IntentAssist`, `msdyn_AISolution` and `msdyn_FieldServiceExperienceComponents` (the source environment's Knowledge Article layer). Resolve the declared dependencies before import; packing locally is not a target-environment import check.
- In Power Pages Admin Center, open the environment's **Privacy + Security** settings and remove `*.js` from **Blocked Attachments**.
- Install Node.js 20 or newer and npm for the React project.
- For AI knowledge search, enable Dataverse search and Power Pages generative AI site search for the environment.

### Build and upload the SPA site

Run these commands from the repository root:

```bash
cd templates/spa/modern-css-template/variants/react/website-code
npm ci
npm run build
pac pages upload-code-site --rootPath .
```

Set `VITE_KB_AI_SEARCH_ENABLED=true` before `npm run build` to turn on AI search.
For the connected support assistant, set `VITE_BOT_ENVIRONMENT_ID` and `VITE_BOT_SCHEMA_NAME` before building. Publish the target Copilot Studio agent, enable its web channel and configure Power Pages authentication. No bot or environment is selected by default; missing settings show a configuration error while ticket creation remains available. See the [website code README](variants/react/website-code/README.md#support-assistant-bot) for setup and network requirements.
Uploading creates the site and its **Portals-&lt;site name&gt;** application user.
After upload, update environment-specific site settings such as `Northwind/KnowledgeLanguageLocaleId`, as described in the website code README.

### Import the supporting solution

1. Sign in to the target environment:

   ```bash
   pac auth create --url https://YOUR-ENVIRONMENT.crm.dynamics.com
   ```

2. From the repository root, pack the unmanaged solution and create a deployment settings file:

   ```bash
   temp_dir="$(mktemp -d)"
   trap 'rm -rf "$temp_dir"' EXIT
   pac solution pack --zipfile "$temp_dir/modern-css-metadata-unmanaged.zip" --folder templates/spa/modern-css-template/solutions/ModernCSSMetadata --packagetype Unmanaged
   pac solution create-settings --solution-zip "$temp_dir/modern-css-metadata-unmanaged.zip" --settings-file "$temp_dir/settings.json"
   ```

3. Edit `settings.json`:
   - `ppst_ModernCss_PortalApplicationUserId`: the `systemuserid` of the site's **Portals-&lt;site name&gt;** application user.
   - `ppst_ModernCss_PortalUrl`: the site URL, for example `https://contoso.powerappsportals.com`.
   - Target connection IDs for Content Conversion, Copilot Studio and the managed Dataverse connection reference `IA.cr.IAPluginDVConnector`. The exported solution retains legacy schema names for compatibility; choose connections by their neutral display names and connector types.

4. Import the solution:

   ```bash
   pac solution import --path "$temp_dir/modern-css-metadata-unmanaged.zip" --settings-file "$temp_dir/settings.json" --publish-changes
   ```

5. Review and enable the required cloud flows in the target environment. The export contains three flows, and their definitions are shipped in Draft state. Publish the optional document-verifier agent if using it; importing the solution does not configure or enable a complete verification process.

### Configure the Case Management Agent

The solution doesn't include environment content or settings. Configure them in the target environment:

1. Configure a business line set to **Full**, with routing rules that select it only for Web cases created by the site's application user. Full automation can send customer email and resolve cases; review this deliberately before enabling the dispatch flow. The previous template's Semi/review-required gate has changed.
2. Map AI-eligible intents to your published external knowledge articles. Unknown intents hand off to a representative.
3. Configure an approved outgoing mailbox for support replies.

When Dynamics accepts an outgoing case email's Send (status **Pending Send**), the publish flow posts the reply to the customer's case conversation, even if delivery later fails. This applies to qualifying autonomous emails as well as representative-sent replies. A rejected Send, for example to a Contact marked **Do not email**, publishes nothing.
See [Set up Case Management Agent to resolve cases](https://learn.microsoft.com/dynamics365/customer-service/administer/set-up-case-resolution-agent).

Intents, lines of business, mappings and some CMA configuration are solution-aware in the source environment, but are **not included** in this export. See [configuration portability](variants/react/website-code/README.md#intent-and-cma-configuration-portability) before attempting to reproduce the card-name scenario.
