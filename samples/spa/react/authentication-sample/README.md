# Power Pages - SPA - Authentication Sample

This React sample demonstrates authentication flows for a Power Pages code site, including local sign-in, registration, password reset, invitation redemption, external sign-in, terms acceptance, and role-protected profile content.

## Screenshot

![Authentication sample burger website screenshot](screenshot.png)

## Secret and environment placeholders

This sample intentionally replaces tenant- and site-specific values with placeholders. Update these before deploying to your own Power Pages environment.

Generated bundles under `.powerpages-site/web-files/index-*.js` are not listed below because they are refreshed by the build and upload process.

| Placeholder | Update in | Description |
| --- | --- | --- |
| `https://<your-tenant-name>.ciamlogin.com/<your-tenant-id>` | `src/services/authService.ts`; `.powerpages-site/site-settings/Authentication-OpenIdConnect-OpenIdConnect_1-AuthenticationType.sitesetting.yml`; `.powerpages-site/site-settings/Authentication-OpenIdConnect-OpenIdConnect_1-Authority.sitesetting.yml` | Your configured external identity provider issuer/authority. |
| `https://<your-tenant-name>.ciamlogin.com/<your-tenant-id>/v2.0/.well-known/openid-configuration` | `.powerpages-site/site-settings/Authentication-OpenIdConnect-OpenIdConnect_1-MetadataAddress.sitesetting.yml` | OIDC metadata document for your tenant. |
| `https://<your-power-pages-site>.powerappsportals.com/signin-openid_1` | `.powerpages-site/site-settings/Authentication-OpenIdConnect-OpenIdConnect_1-RedirectUri.sitesetting.yml` | Redirect URI registered for the Power Pages site and identity provider. |
| `<development-only-anti-forgery-token>` | `src/services/authService.ts` | Development-only mock value used by the external-login confirmation flow. Runtime anti-forgery tokens are fetched from Power Pages. |

## Prerequisites

- Node.js 18 or later
- npm
- Microsoft Power Platform CLI 1.43.6 or later
- A Power Pages site with authentication providers configured

## Local development

1. Install dependencies:

   ```powershell
   npm install
   ```

1. Start the dev server:

   ```powershell
   npm run dev
   ```

The app runs at `http://localhost:5173`. In local development it uses mock authenticated user data so the UI can be explored without a deployed Power Pages site.

## Build

```powershell
npm run build
```

The build output is written to `dist`.

## Running on Power Pages

1. Update the placeholders listed above for your environment.
1. Authenticate with Power Platform CLI:

   ```powershell
   pac auth create --environment <Environment URL>
   ```

1. Build and upload the code site:

   ```powershell
   npm run build
   pac pages upload-code-site --rootPath .
   ```

1. Activate the site from Power Pages and preview it.

## Project structure

```text
authentication-sample/
├── .powerpages-site/
├── src/
│   ├── components/
│   ├── data/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   └── utils/
├── index.html
├── package.json
├── powerpages.config.json
└── vite.config.ts
```

## License

MIT
