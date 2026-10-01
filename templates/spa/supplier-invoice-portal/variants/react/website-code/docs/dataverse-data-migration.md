# Dataverse data migration scripts

Use these scripts to export Supplier Invoice Portal sample data from Dataverse and import it into another Dataverse environment using the Dataverse Web API.

The import script does not use PAC commands. It sends Dataverse Web API requests directly to the target environment.

## What gets exported

The export includes:

- `contact` records scoped to Amy and Bob only
- `spnvc_supplier`
- `spnvc_purchaseorder`
- `spnvc_invoice`
- `spnvc_invoicecomment`
- `spnvc_invoiceattachment`
- `spnvc_invoiceattachment.spnvc_file` file-column binaries

The default export folder is ignored by Git because it can contain contact data and file binaries:

```powershell
dataverse-export\supplier-portal
```

## Prerequisites

1. Install dependencies:

```powershell
npm install
```

2. Ensure the target environment already has the app schema deployed.

The scripts move data only. They do not create Dataverse tables, columns, choices, web roles, or table permissions.

## Authentication

By default, the scripts use Microsoft device-code sign-in through MSAL. When prompted, open the provided URL and enter the displayed code.

For automation, provide a Dataverse access token through `DATAVERSE_ACCESS_TOKEN`:

```powershell
$env:DATAVERSE_ACCESS_TOKEN = "<access-token-for-the-environment>"
```

The token must be issued for the same Dataverse environment URL used by the command.

## Export from PPCC 2025

The source environment defaults to PPCC 2025:

```powershell
npm run dataverse:export
```

Equivalent explicit command:

```powershell
npm run dataverse:export -- --source https://org8e8f5664.crm.dynamics.com --out dataverse-export\supplier-portal
```

The export writes:

- `dataverse-export\supplier-portal\data.json`
- `dataverse-export\supplier-portal\files\*`

## Dry-run an import

Run a dry-run before importing into a target environment:

```powershell
npm run dataverse:import -- --target https://TARGET.crm.dynamics.com --in dataverse-export\supplier-portal --dry-run
```

Dry-run validates record ordering, contact mapping, lookup payloads, and file-upload targets without writing data.

## Import into another environment

After reviewing the dry-run output, import with:

```powershell
npm run dataverse:import -- --target https://TARGET.crm.dynamics.com --in dataverse-export\supplier-portal
```

Replace `https://TARGET.crm.dynamics.com` with the target Dataverse environment URL.

## Import behavior

- App table records are upserted with their source GUIDs, making the import repeatable.
- Amy and Bob contacts are matched by `fullname` in the target environment.
- If Amy or Bob do not exist in the target, the script creates them.
- Contact lookups to users outside Amy/Bob are skipped with warnings.
- Supplier, purchase order, invoice, comment, and attachment lookups are preserved.
- Attachment file-column content is uploaded after attachment records are created.

## Troubleshooting

If authentication fails, rerun the command and complete the device-code sign-in promptly.

If import fails with missing table or column errors, deploy the app solution/schema to the target environment before importing data.

If file uploads fail, confirm the target table has the `spnvc_file` Dataverse File column and that the importing user has write permission for `spnvc_invoiceattachment`.
