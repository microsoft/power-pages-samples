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
npm test
pac pages upload-code-site --rootPath .
```

Run `npm test` after building to check the catalog/configuration, compiled bundle patterns, and supporting-solution contract. For browser coverage, start `npm run dev` in another terminal and run `npm run test:smoke`; this includes the retained partner flows and retired-route regression checks.

Run the upload command after building, from this directory. Live invitation actions require the target environment's cloud-flow consumer ID in `VITE_FLOW_SEND_INVITATION`; configure it in a local `.env.production` and keep that file untracked. Source inclusion is enabled, as in the other React SPA templates. See the [template installation instructions](../../../README.md) for managed prerequisites, solution import, flow bindings, and real-user configuration.
