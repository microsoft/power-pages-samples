# Partner Portal website code

This React + Vite project is the downloadable website-code variant of the [Partner Portal template](../../../README.md). Local development and browser tests use the in-memory/localStorage mock data; Power Pages-hosted deployments use live services.

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
