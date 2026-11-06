# Modern CSS Template

The Modern CSS Template is an installable Power Pages SPA for customer support. Signed-in customers create and track their personal cases, reply to support and share documents. Everyone can browse published knowledge articles, with optional generative AI search grounded only in knowledge. New portal cases can be handed to the Dynamics 365 **Case Management Agent**, and representative-approved responses are published back to the case conversation. The template contains a shared unmanaged Dataverse solution and a React SPA site under `variants/react/website-code/`, branded with the fictional **Northwind Field Services** identity.

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
- `knowledgearticle` provides published external knowledge, grouped by `category`.
- `contact` is the signed-in portal identity, optionally linked to a customer `account`.

Sample data in [`seed-data/data.json`](seed-data/data.json) provides a fictional customer, six published knowledge articles in three library topics, and three cases with a customer document. Case conversations aren't seeded, because Portal Comment is a Power Pages table outside this template's solution. Run the website code locally with `npm run dev` to see the same content, including sample conversations, in demo mode without an environment.

The **ModernCSSMetadata** solution adds only the supporting components the site depends on:

| Component | Purpose |
| --- | --- |
| Cloud flow **Northwind - Case Management Agent (review required)** | Dispatches portal-created Web cases to the Case Management Agent in review-required (Semi) mode. |
| Cloud flow **Northwind - Publish reviewed response to portal** | Publishes the reply a representative sent as a customer-visible Portal Comment once Dynamics accepts the Send. |
| Connection reference `cr719_northwindportalresponseconversion` (Content Conversion) | HTML-to-text conversion in the publish flow. |
| System view **Northwind KB Search** on `knowledgearticle` | Knowledge-only scope for AI search. |
| Environment variables `ppst_ModernCss_PortalApplicationUserId`, `ppst_ModernCss_PortalUrl` | The site's application user ID and the site URL. |

The solution contains no plug-ins or other custom code.

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
- Install Dynamics 365 Customer Service with Case Management Agent (Case Management Intelligence) and knowledge management. The solution depends on `PowerPages_RuntimeCore`, `msdynce_Service`, `msdyn_CaseManagementIntelligence` and `msdyn_KBSuggestionsAiBCore`.
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
   - The connection IDs for the Content Conversion connection reference.

4. Import the solution:

   ```bash
   pac solution import --path "$temp_dir/modern-css-metadata-unmanaged.zip" --settings-file "$temp_dir/settings.json" --publish-changes
   ```

5. Confirm that both cloud flows are turned on, and that they use the Dataverse connection reference provided by Case Management Intelligence.

### Import the sample data

The solution import does not import [`seed-data/data.json`](seed-data/data.json).
The seed file contains ordered `tables`: one Account and Contact for the fictional customer, knowledge library topics (categories), six knowledge articles, three cases, and one customer-uploaded case document.
Use an installer or a Dataverse import script that understands this format.

If you write your own importer:
- Process tables in the order stored in `data.json` and preserve every record ID, because later records use those IDs in lookup bindings.
- Create knowledge articles as Draft, then publish them in a separate update (`statecode` 3, `statuscode` 7). Bind `languagelocaleid` to English (LCID 1033) if it is not the environment's default article language, and make sure the `Northwind/KnowledgeLanguageLocaleId` site setting names the same language.
- Create cases Active, then set **Waiting for Details** (3) or **Researching** (4) with an update. Close the resolved case with the `CloseIncident` action (status **Problem Solved**, 5).
- Keep the `*WEB*` prefix on the case document's note text; the site shows only notes with that marker.

The sample cases are created by the importing user, so they don't start the Case Management Agent dispatch flow.
To see them on the portal, sign in with a portal identity linked to the sample Contact, or change each case's **Customer** to your own Contact.
Do not import the sample data into a production environment.

### Configure the Case Management Agent

The solution doesn't include environment content or settings. Configure them in the target environment:

1. Create a business line set to **Require agent confirmation**, with routing rules that select it for Web cases created by the site's application user.
2. Map AI-eligible intents to your published external knowledge articles. Unknown intents hand off to a representative.
3. Configure an approved outgoing mailbox for support replies.

Representatives review the agent's draft email and use the normal **Send** button. When Dynamics accepts the Send (status **Pending Send**), the publish flow posts the reply to the customer's case conversation, even if delivery later fails. A Send that Dynamics rejects, for example to a Contact marked **Do not email**, publishes nothing.
See [Set up Case Management Agent to resolve cases](https://learn.microsoft.com/dynamics365/customer-service/administer/set-up-case-resolution-agent).
