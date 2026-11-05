# Partner Portal (Enhanced) website code

This React + Vite project is the downloadable website-code variant of the [Partner Portal (Enhanced) template](../../../README.md). Local development and browser tests use the in-memory/localStorage mock data; Power Pages-hosted deployments use live services.

The partner workspace supports Partner Admin, Partner Manager, and Partner Seller: customers, opportunities, deal registrations, and access administration. Public partner-program, authentication, and profile pages are retained. Unrecognized live web roles use non-partner pages and receive no partner capabilities.

Older browser databases are migrated without resetting sales edits: retired workspace collections, exclusive contacts, obsolete contact selections, and unsupported recent-search destinations are discarded. Retired work-order URLs now render **Page not found**. Legacy bundle patterns in `powerpages.config.json` are deletion patterns only, retained so the next upload cleans stale deployed chunks.

```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm run format:check
npm run build
pac pages upload-code-site --rootPath .
```

Run the upload command after building, from this directory. Live invitation actions require the target environment's cloud-flow consumer ID in `VITE_FLOW_SEND_INVITATION`; configure it in a local `.env.production` and keep that file untracked.
