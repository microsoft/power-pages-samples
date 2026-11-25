# Volunteer Hub template

An accessible public portal for discovering volunteer opportunities, learning about community organizations, and expressing interest.

This installable Power Pages template includes a React opportunity catalog, read-only Dataverse Web API integration,
an unmanaged supporting solution, fictional seed data, responsive previews, and source-bound quality evidence.

## Audience

- partners

## Data model

Power Pages platform tables plus template-owned custom Dataverse tables in a supporting unmanaged solution.

## Experience

- **Volunteer opportunities** (`/`): Search and filter live Dataverse opportunities from community organizations.
- Public Anonymous read-only access to the fictional catalog.
- Explicit Web API field allowlists with no wildcard and no mutation privileges.

## Local development

```powershell
cd variants\react\website-code
npm install
npm run quality
npm run previews
```

## Supporting solution

The unpacked unmanaged `VolunteerHub` solution is under `solutions/VolunteerHub/`. It uses the `vol` publisher prefix
and contains Organization and Opportunity tables plus the required one-to-many relationship.

## Install manually

Use the create-site template installer when available. For a manual installation:

1. Install the Power Platform CLI.
2. Confirm English (LCID 1033) is installed and JavaScript attachments are allowed.
3. Authenticate PAC CLI to the target environment.
4. Pack and import `solutions/VolunteerHub` as unmanaged with `--publish-changes`.
5. Apply `seed-data/data.json`, preserving stable GUIDs and the exact `vol_OrganizationId` lookup navigation property.
6. Restore, build, and upload the SPA:

   ```powershell
   cd variants\react\website-code
   npm ci
   npm run build
   pac pages upload-code-site --rootPath .
   ```

The seed package contains 3 fictional organizations and 8 fictional opportunities. It contains no production,
personal, payment, or credential data.

## Quality and security evidence

- Node unit, production build, and Playwright journey checks
- Desktop/mobile accessibility scans at score 100 with zero violations or incomplete checks
- 1440px full-width desktop preview and mobile preview
- Exceptional-design review score 34/40 with no failed critical gates
- CodeQL JavaScript/TypeScript report with zero findings
- Permissions audit: Safe to go, zero major/minor issues, 5.0 in all categories

Automated accessibility does not prove complete WCAG conformance; perform manual assessment for a production site.
