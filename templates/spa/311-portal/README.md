# 311 Portal template

This folder contains the 311 Portal template entry for the installable `templates/` catalog.

The checked-in supporting solution zip is an unmanaged export with the `spa311` publisher prefix.
The solution metadata lists a dependency on Dataverse knowledge articles through `msdynce_KnowledgeManagementFeatures`.
It contains Dataverse artifacts only. The Power Pages website project is stored separately under `variants/react/spa-code/`.

## Previews

| Home | Service request map |
| --- | --- |
| ![311 Portal home page](previews/home.png) | ![311 Portal service request map](previews/map.png) |

| Knowledge base | Contact |
| --- | --- |
| ![311 Portal knowledge base](previews/knowledge.png) | ![311 Portal contact page](previews/contact.png) |

| Admin access |
| --- |
| ![311 Portal admin access page](previews/admin.png) |

## Use this template manually

Use these steps if you want to install the template yourself instead of using an installer skill.

1. Install the [Power Platform CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction).
2. Allow `*.js` files by removing it from `Blocked Attachments` in `Privacy + Security` settings for your environment from Power Pages Admin Center.
3. Make sure English (LCID 1033) is installed in the target Dataverse environment.
4. Sign in to the target environment:

   ```bash
   pac auth create --url https://YOUR-ENVIRONMENT.crm.dynamics.com
   ```

5. Import the React variant's supporting unmanaged solution from the repository root:

   ```bash
   pac solution import --path templates/spa/311-portal/variants/react/solution/311-portal-unmanaged.zip --publish-changes
   ```

6. Confirm the Dataverse tables were created in the target environment.
7. Import `seed-data/data.json` after the solution import completes.
   The Power Platform CLI solution import command does not import this JSON file.
   Use an installer or a Dataverse import script that understands the seed-data shape below.

Seed data is included under `seed-data/`.
The seed data uses a Dataverse export shape with `tables`.
It does not include file exports.

If you import the seed data without an installer, create or upsert records table by table using the order in `seed-data/data.json`.
Preserve the IDs in each table because later records refer to earlier records by lookup ID.
Do not use Dataverse's spreadsheet import for this file because it will not preserve lookup IDs.

8. Install dependencies, build the React project, and upload the code site:

```bash
cd templates/spa/311-portal/variants/react/spa-code
npm ci
npm run build
pac pages upload-code-site --rootPath .
```

## Customize this template

The `spa-code/` folder includes the React source, package files, Power Pages configuration, and `.powerpages-site` metadata.
Make changes there, rebuild, and run the upload command again.
