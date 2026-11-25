#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const VALID_AUDIENCES = new Set(["admins", "developers", "makers", "partners"]);
const VALID_DATA_MODELS = new Set(["platform-only", "custom"]);
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readSpec(specPath) {
  return JSON.parse(fs.readFileSync(path.resolve(specPath), "utf8"));
}

function validateSpec(spec) {
  const errors = [];
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    return ["The scaffold spec must be an object."];
  }
  if (spec.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1.");
  }
  if (typeof spec.id !== "string" || !KEBAB_CASE.test(spec.id)) {
    errors.push("id must be stable kebab-case.");
  }
  for (const property of ["displayName", "description", "author"]) {
    if (typeof spec[property] !== "string" || spec[property].trim().length === 0) {
      errors.push(`${property} must be a non-empty string.`);
    }
    if (!VALID_DATA_MODELS.has(spec.dataModel)) {
      errors.push('dataModel must be "platform-only" or "custom".');
    }
  }
  if (!Array.isArray(spec.audience) || spec.audience.length === 0) {
    errors.push("audience must contain at least one supported value.");
  } else {
    for (const audience of spec.audience) {
      if (!VALID_AUDIENCES.has(audience)) {
        errors.push(`Unsupported audience "${audience}".`);
      }
    }
    if (new Set(spec.audience).size !== spec.audience.length) {
      errors.push("audience must not contain duplicates.");
    }
  }
  if (!Array.isArray(spec.routes) || spec.routes.length === 0) {
    errors.push("routes must contain at least one page.");
  } else {
    const ids = new Set();
    const paths = new Set();
    for (const route of spec.routes) {
      if (!route || typeof route !== "object" || !KEBAB_CASE.test(route.id ?? "")) {
        errors.push("Every route must have a kebab-case id.");
        continue;
      }
      if (ids.has(route.id)) {
        errors.push(`Duplicate route id "${route.id}".`);
      }
      ids.add(route.id);
      if (typeof route.path !== "string" || !route.path.startsWith("/")) {
        errors.push(`Route "${route.id}" must have an absolute path.`);
      } else if (paths.has(route.path)) {
        errors.push(`Duplicate route path "${route.path}".`);
      }
      paths.add(route.path);
      for (const property of ["displayName", "summary"]) {
        if (typeof route[property] !== "string" || route[property].trim().length === 0) {
          errors.push(`Route "${route.id}" ${property} must be a non-empty string.`);
        }
      }
    }
  }
  if (spec.dataModel === "custom" && (
    !spec.seedData ||
    typeof spec.seedData !== "object" ||
    Array.isArray(spec.seedData) ||
    !spec.seedData.tables ||
    typeof spec.seedData.tables !== "object" ||
    Array.isArray(spec.seedData.tables) ||
    Object.keys(spec.seedData.tables).length === 0
  )) {
    errors.push("Custom dataModel requires seedData.tables with representative sample data.");
  } else if (spec.dataModel === "custom") {
    for (const [tableName, table] of Object.entries(spec.seedData.tables)) {
      if (!Array.isArray(table?.records) || table.records.length === 0) {
        errors.push(`Seed table "${tableName}" must contain at least one representative record.`);
      }
    }
  }
  if (spec.dataModel === "platform-only" && Object.hasOwn(spec, "seedData")) {
    errors.push("Platform-only dataModel must not define Dataverse seedData; use sampleData for local fixtures.");
  }
  if (
    Object.hasOwn(spec, "sampleData") &&
    (!spec.sampleData || typeof spec.sampleData !== "object" || Array.isArray(spec.sampleData))
  ) {
    errors.push("sampleData must be an object when provided.");
  }
  return errors;
}

function writeFile(root, relativePath, contents) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function json(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

function scaffoldTemplate({ spec, outputDirectory }) {
  const errors = validateSpec(spec);
  if (errors.length > 0) {
    throw new Error(`Invalid scaffold spec:\n- ${errors.join("\n- ")}`);
  }

  const target = path.resolve(outputDirectory, spec.id);
  if (fs.existsSync(target)) {
    throw new Error(`Refusing to overwrite existing template draft: ${target}`);
  }
  fs.mkdirSync(target, { recursive: false });

  const websiteCode = path.join(target, "variants", "react", "website-code");
  for (const directory of [
    "previews",
    "variants/react/website-code/docs/a11y-reports",
    "variants/react/website-code/docs/codeql-reports",
    "variants/react/website-code/docs/design-review",
    "variants/react/website-code/scripts",
    "variants/react/website-code/src/assets",
    "variants/react/website-code/src/components",
    "variants/react/website-code/tests"
  ]) {
    fs.mkdirSync(path.join(target, directory), { recursive: true });
  }
  if (spec.dataModel === "custom") {
    fs.mkdirSync(path.join(target, "solutions"), { recursive: true });
    fs.mkdirSync(path.join(target, "seed-data"), { recursive: true });
  }

  writeFile(target, "README.md", renderReadme(spec));
  if (spec.dataModel === "custom") {
    writeFile(target, "solutions/README.md", renderSolutionReadme(spec));
    writeFile(target, "seed-data/data.json", json(spec.seedData));
  } else if (spec.sampleData) {
    writeFile(
      target,
      "variants/react/website-code/src/sample-data.json",
      json(spec.sampleData)
    );
  }
  writeFile(target, "variants/react/website-code/.gitignore", gitignore());
  writeFile(
    target,
    "variants/react/website-code/.npmrc",
    "omit-lockfile-registry-resolved=true\n"
  );
  writeFile(target, "variants/react/website-code/package.json", json(packageManifest(spec)));
  writeFile(target, "variants/react/website-code/index.html", renderIndex(spec));
  writeFile(target, "variants/react/website-code/tsconfig.json", json(tsconfig()));
  writeFile(target, "variants/react/website-code/vite.config.ts", viteConfig());
  writeFile(target, "variants/react/website-code/playwright.config.ts", playwrightConfig());
  writeFile(
    target,
    "variants/react/website-code/powerpages.config.json",
    json(powerPagesConfig(spec))
  );
  writeFile(
    target,
    "variants/react/website-code/template-quality.json",
    json(qualityContract(spec))
  );
  writeFile(target, "variants/react/website-code/src/main.tsx", mainSource());
  writeFile(
    target,
    "variants/react/website-code/src/vite-env.d.ts",
    "/// <reference types=\"vite/client\" />\n"
  );
  writeFile(
    target,
    "variants/react/website-code/src/routes.json",
    json(spec.routes)
  );
  writeFile(target, "variants/react/website-code/src/routes.ts", routesSource(spec));
  writeFile(target, "variants/react/website-code/src/App.tsx", appSource(spec));
  writeFile(target, "variants/react/website-code/src/styles.css", styles());
  writeFile(
    target,
    "variants/react/website-code/src/components/PowerPagesBadge.tsx",
    powerPagesBadge()
  );
  writeFile(
    target,
    "variants/react/website-code/src/components/PowerPagesBadge.css",
    powerPagesBadgeCss()
  );
  fs.copyFileSync(
    path.join(
      __dirname,
      "..",
      "spa",
      "311-portal",
      "variants",
      "react",
      "website-code",
      "src",
      "assets",
      "PowerPages_scalable.svg"
    ),
    path.join(websiteCode, "src", "assets", "PowerPages_scalable.svg")
  );
  writeFile(target, "variants/react/website-code/tests/routes.test.mjs", routeUnitTest());
  writeFile(target, "variants/react/website-code/tests/smoke.spec.ts", smokeTest());
  writeFile(
    target,
    "variants/react/website-code/tests/accessibility.spec.ts",
    accessibilityTest(spec)
  );
  writeFile(target, "variants/react/website-code/tests/previews.spec.ts", previewTest());
  writeFile(
    target,
    "variants/react/website-code/scripts/prepare-a11y-reports.mjs",
    prepareReportsScript()
  );
  writeFile(
    target,
    "variants/react/website-code/scripts/build-a11y-summary.mjs",
    buildSummaryScript()
  );

  return target;
}

function renderReadme(spec) {
  return `# ${spec.displayName} template draft

${spec.description}

This draft was generated from an approved intent specification. It is not ready for the repository
manifest until the platform-owned artifacts and real quality evidence are complete.

## Audience

${spec.audience.map((audience) => `- ${audience}`).join("\n")}

## Data model

${spec.dataModel === "custom"
    ? "Power Pages platform tables plus template-owned custom Dataverse tables in a supporting unmanaged solution."
    : "Power Pages platform SDM/EDM tables only. This template does not add custom business tables or a supporting solution."}

## Planned pages

${spec.routes.map((route) => `- **${route.displayName}** (\`${route.path}\`): ${route.summary}`).join("\n")}

## Local development

\`\`\`powershell
cd variants\\react\\website-code
npm install
npm run quality
npm run previews
\`\`\`

## Remaining platform stages

${spec.dataModel === "custom"
    ? `1. Create the approved custom Dataverse schema and export a real unmanaged solution into \`solutions/<UniqueName>/\`.
2. Create or select a Power Pages code site and add its real PAC export under \`website-code/.powerpages-site/\`.
3. Reconcile seed logical names, relationships, choices, and navigation properties with exported solution metadata.
4. Deploy, run the consumer path, and repeat automated accessibility against the final URL.
5. Add the validated family to \`templates/manifest.json\`.`
    : `1. Create or select a Power Pages site using its platform SDM/EDM tables and add the real PAC export under \`website-code/.powerpages-site/\`.
2. Deploy, run the consumer path, and repeat automated accessibility against the final URL.
3. Add the validated family to \`templates/manifest.json\` with \`dataModel: "platform-only"\`.`}

Do not replace these stages with fabricated XML, YAML, previews, or quality reports.
`;
}

function renderSolutionReadme(spec) {
  return `# ${spec.displayName} solution pending

Create and export the unmanaged Dataverse solution from an explicitly approved environment.
Remove this file when the real \`solutions/<UniqueName>/\` export is present.
`;
}

function packageManifest(spec) {
  return {
    name: spec.id,
    private: true,
    version: "0.0.0",
    type: "module",
    scripts: {
      dev: "vite",
      test: "node --test tests/*.test.mjs",
      build: "tsc -b && vite build",
      preview: "vite preview",
      previews: "playwright test tests/previews.spec.ts",
      "test:e2e": "playwright test tests/smoke.spec.ts",
      "test:a11y":
        "node scripts/prepare-a11y-reports.mjs && playwright test tests/accessibility.spec.ts && node scripts/build-a11y-summary.mjs",
      quality: "npm test && npm run build && npm run test:e2e && npm run test:a11y"
    },
    dependencies: {
      react: "^18.3.1",
      "react-dom": "^18.3.1",
      "react-router-dom": "^7.18.2"
    },
    devDependencies: {
      "@axe-core/playwright": "4.11.0",
      "@playwright/test": "^1.65.0",
      "@types/node": "^22.0.0",
      "@types/react": "^18.3.20",
      "@types/react-dom": "^18.3.7",
      "@vitejs/plugin-react": "^4.3.0",
      "accessibility-insights-report": "7.7.0",
      typescript: "~5.7.0",
      vite: "^6.4.4"
    }
  };
}

function renderIndex(spec) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${escapeHtml(spec.description)}" />
    <title>${escapeHtml(spec.displayName)}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function tsconfig() {
  return {
    compilerOptions: {
      target: "ES2022",
      useDefineForClassFields: true,
      lib: ["ES2022", "DOM", "DOM.Iterable"],
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      module: "ESNext",
      moduleResolution: "Bundler",
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: "react-jsx"
    },
    include: [
      "src",
      "tests",
      "vite.config.ts",
      "playwright.config.ts"
    ]
  };
}

function viteConfig() {
  return `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { host: "127.0.0.1", port: 4173 },
  preview: { host: "127.0.0.1", port: 4173 }
});
`;
}

function playwrightConfig() {
  return `import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173",
    trace: "retain-on-failure"
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --host 127.0.0.1 --port 4173",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: false
      }
});
`;
}

function powerPagesConfig(spec) {
  return {
    $schema: "https://www.schemastore.org/powerpages.config.json",
    siteName: spec.displayName,
    compiledPath: "dist",
    defaultLandingPage: "index.html",
    includeSource: true
  };
}

function qualityContract(spec) {
  return {
    schemaVersion: 1,
    templateId: spec.id,
    framework: "react",
    dataModel: spec.dataModel,
    routes: spec.routes.map(({ id, path: routePath, displayName }) => ({
      id,
      path: routePath,
      displayName
    })),
    viewports: ["desktop", "mobile"]
  };
}

function mainSource() {
  return `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
`;
}

function routesSource(spec) {
  return `import routeData from "./routes.json";

export const routes = routeData as readonly {
  id: string;
  path: string;
  displayName: string;
  summary: string;
}[];

export type TemplateRoute = (typeof routes)[number];
`;
}

function appSource(spec) {
  return `import { NavLink, Route, Routes } from "react-router-dom";
import PowerPagesBadge from "./components/PowerPagesBadge";
import { routes, type TemplateRoute } from "./routes";

const siteDisplayName = ${JSON.stringify(spec.displayName)};

function TemplatePage({ route }: { route: TemplateRoute }) {
  return (
    <section className="page-shell" aria-labelledby={\`\${route.id}-heading\`}>
      <p className="eyebrow">{siteDisplayName}</p>
      <h1 id={\`\${route.id}-heading\`}>{route.displayName}</h1>
      <p>{route.summary}</p>
      <div className="content-card">
        Replace this baseline with the approved {route.displayName.toLowerCase()} experience.
      </div>
    </section>
  );
}

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="site-header">
        <NavLink className="brand" to="/">{siteDisplayName}</NavLink>
        <nav aria-label="Primary navigation">
          {routes.map((route) => (
            <NavLink key={route.id} to={route.path}>{route.displayName}</NavLink>
          ))}
        </nav>
      </header>
      <main id="main-content">
        <Routes>
          {routes.map((route) => (
            <Route key={route.id} path={route.path} element={<TemplatePage route={route} />} />
          ))}
        </Routes>
      </main>
      <PowerPagesBadge />
    </>
  );
}
`;
}

function styles() {
  return `:root {
  color: #17201b;
  background: #f7f5ef;
  font-family: "Segoe UI", Arial, sans-serif;
  --color-text: #17201b;
  --color-text-muted: #5d685f;
  --color-border: #d8ddd8;
  --font-body: "Segoe UI", Arial, sans-serif;
  --shadow-md: 0 8px 24px rgba(23, 32, 27, 0.15);
  --space-md: 1rem;
}

* { box-sizing: border-box; }
body { margin: 0; min-width: 320px; min-height: 100vh; }
a { color: inherit; }
a:focus-visible { outline: 3px solid #0067b8; outline-offset: 3px; }
.skip-link { position: fixed; left: 1rem; top: -5rem; z-index: 30; background: white; padding: .75rem 1rem; }
.skip-link:focus { top: 1rem; }
.site-header { display: flex; align-items: center; justify-content: space-between; gap: 2rem; padding: 1rem 4vw; background: white; border-bottom: 1px solid var(--color-border); }
.brand { font-size: 1.1rem; font-weight: 700; text-decoration: none; }
nav { display: flex; flex-wrap: wrap; gap: .25rem; }
nav a { min-height: 44px; display: inline-flex; align-items: center; padding: .6rem .8rem; border-radius: .5rem; text-decoration: none; }
nav a.active { background: #deeee6; font-weight: 700; }
.page-shell { max-width: 1100px; margin: 0 auto; padding: clamp(3rem, 8vw, 7rem) clamp(1rem, 5vw, 4rem); }
.page-shell h1 { max-width: 16ch; font-size: clamp(2.5rem, 6vw, 5rem); line-height: 1.05; margin: 0 0 1rem; }
.page-shell > p:not(.eyebrow) { max-width: 65ch; color: var(--color-text-muted); font-size: 1.15rem; }
.eyebrow { color: #195f46; font-size: .8rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.content-card { margin-top: 3rem; min-height: 240px; padding: 2rem; border: 1px solid var(--color-border); border-radius: 1rem; background: white; }

@media (max-width: 700px) {
  .site-header { align-items: flex-start; flex-direction: column; }
  nav { width: 100%; }
  nav a { flex: 1 1 auto; justify-content: center; }
}
`;
}

function powerPagesBadge() {
  return `import powerPagesLogo from "../assets/PowerPages_scalable.svg";
import "./PowerPagesBadge.css";

export default function PowerPagesBadge() {
  return (
    <div className="powered-badge" aria-label="Platform attribution">
      <img src={powerPagesLogo} width="14" height="14" alt="" aria-hidden="true" />
      Built with <span>Microsoft Power Pages</span>
    </div>
  );
}
`;
}

function powerPagesBadgeCss() {
  return `.powered-badge {
  position: fixed;
  right: var(--space-md);
  bottom: var(--space-md);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: var(--shadow-md);
  color: var(--color-text-muted);
  font-family: var(--font-body);
  font-size: 0.7rem;
  line-height: 1;
  white-space: nowrap;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.powered-badge img { display: block; flex: 0 0 auto; }
.powered-badge span { color: var(--color-text); font-weight: 600; }

@media (max-width: 600px) {
  .powered-badge { position: static; width: max-content; margin: 1rem; }
}
`;
}

function routeUnitTest() {
  return `import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const routesPath = fileURLToPath(new URL("../src/routes.json", import.meta.url));
const routes = JSON.parse(fs.readFileSync(routesPath, "utf8"));

test("route contract uses unique ids and paths", () => {
  assert.equal(new Set(routes.map((route) => route.id)).size, routes.length);
  assert.equal(new Set(routes.map((route) => route.path)).size, routes.length);
});
`;
}

function smokeTest() {
  return `import { expect, test } from "@playwright/test";
import { routes } from "../src/routes";

for (const route of routes) {
  test(\`\${route.id} renders its primary heading\`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.getByRole("heading", { level: 1, name: route.displayName })).toBeVisible();
  });
}
`;
}

function accessibilityTest(spec) {
  return `import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import AccessibilityInsightsReport from "accessibility-insights-report";
import { routes } from "../src/routes";

const { reporterFactory } = AccessibilityInsightsReport;
const websiteCodePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportsDirectory = path.join(websiteCodePath, "docs", "a11y-reports");
const generatedDirectory = path.join(reportsDirectory, ".generated");

test("generates automated accessibility evidence", async ({ page }, testInfo) => {
  const viewport = testInfo.project.name === "mobile" ? "mobile" : "desktop";
  const scans = [];

  for (const route of routes) {
    await page.goto(route.path);
    await expect(page.locator("main")).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const reportName = \`automated-\${route.id}-\${viewport}.html\`;
    const reportHtml = reporterFactory().fromAxeResult({
      results,
      description: \`\${route.id} automated accessibility scan at the \${viewport} viewport\`,
      serviceName: ${JSON.stringify(spec.displayName)},
      scanContext: { pageTitle: await page.title() }
    }).asHTML();
    fs.writeFileSync(path.join(reportsDirectory, reportName), reportHtml, "utf8");
    scans.push({
      routeId: route.id,
      viewport,
      engineVersion: results.testEngine.version,
      violations: results.violations.length,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      incompleteRules: results.incomplete.map((result) => result.id).sort(),
      report: reportName
    });
    expect.soft(results.violations, \`\${route.id}:\${viewport}\`).toEqual([]);
  }

  fs.writeFileSync(
    path.join(generatedDirectory, \`\${viewport}.json\`),
    JSON.stringify(scans, null, 2)
  );
});
`;
}

function previewTest() {
  return `import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { routes } from "../src/routes";

const previewsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../previews"
);

for (const route of routes) {
  test(\`captures \${route.id} preview\`, async ({ page }, testInfo) => {
    await page.goto(route.path);
    await expect(page.getByRole("heading", { level: 1, name: route.displayName })).toBeVisible();
    const viewport = testInfo.project.name === "mobile" ? "mobile" : "desktop";
    await page.screenshot({
      path: path.join(previewsDirectory, \`\${viewport}-\${route.id}.png\`),
      fullPage: true
    });
  });
}
`;
}

function prepareReportsScript() {
  return `import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const websiteCodePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportsDirectory = path.join(websiteCodePath, "docs", "a11y-reports");
fs.mkdirSync(reportsDirectory, { recursive: true });

for (const entry of fs.readdirSync(reportsDirectory, { withFileTypes: true })) {
  if (
    entry.name === ".generated" ||
    entry.name === "accessibility-summary.json" ||
    /^automated-.+\\.html$/i.test(entry.name)
  ) {
    fs.rmSync(path.join(reportsDirectory, entry.name), {
      force: true,
      recursive: entry.isDirectory()
    });
  }
}

fs.mkdirSync(path.join(reportsDirectory, ".generated"), { recursive: true });
`;
}

function buildSummaryScript() {
  return `import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const packageMetadata = require("accessibility-insights-report/package.json");
const websiteCodePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportsDirectory = path.join(websiteCodePath, "docs", "a11y-reports");
const generatedDirectory = path.join(reportsDirectory, ".generated");
const qualityContract = JSON.parse(
  fs.readFileSync(path.join(websiteCodePath, "template-quality.json"), "utf8")
);

const scans = [];
for (const viewport of qualityContract.viewports) {
  const fragmentPath = path.join(generatedDirectory, \`\${viewport}.json\`);
  if (!fs.existsSync(fragmentPath)) {
    throw new Error(\`Missing accessibility scan fragment for \${viewport}.\`);
  }
  scans.push(...JSON.parse(fs.readFileSync(fragmentPath, "utf8")));
}

const expected = new Set(
  qualityContract.routes.flatMap((route) =>
    qualityContract.viewports.map((viewport) => \`\${route.id}:\${viewport}\`)
  )
);
const actual = new Set(scans.map((scan) => \`\${scan.routeId}:\${scan.viewport}\`));
for (const expectedScan of expected) {
  if (!actual.has(expectedScan)) {
    throw new Error(\`Missing accessibility scan \${expectedScan}.\`);
  }
}
if (actual.size !== expected.size) {
  throw new Error("Accessibility scan output contains duplicate or unexpected entries.");
}

for (const scan of scans) {
  const reportPath = path.join(reportsDirectory, scan.report);
  scan.sha256 = crypto.createHash("sha256").update(fs.readFileSync(reportPath)).digest("hex");
}
scans.sort((left, right) =>
  \`\${left.routeId}:\${left.viewport}\`.localeCompare(\`\${right.routeId}:\${right.viewport}\`)
);

const totalViolations = scans.reduce((total, scan) => total + scan.violations, 0);
const engineVersions = new Set(scans.map((scan) => scan.engineVersion));
if (engineVersions.size !== 1) {
  throw new Error("Accessibility scans used inconsistent axe-core versions.");
}
const summary = {
  schemaVersion: 1,
  generator: "accessibility-insights-report",
  generatorVersion: packageMetadata.version,
  engine: "axe-core",
  engineVersion: [...engineVersions][0],
  score: totalViolations === 0 ? 100 : 0,
  totalViolations,
  scans: scans.map(({ engineVersion, ...scan }) => scan)
};

fs.writeFileSync(
  path.join(reportsDirectory, "accessibility-summary.json"),
  JSON.stringify(summary, null, 2) + "\\n"
);
fs.rmSync(generatedDirectory, { force: true, recursive: true });

if (totalViolations !== 0) {
  throw new Error(\`Automated accessibility scans found \${totalViolations} violation(s).\`);
}

console.log(\`Generated \${scans.length} accessibility reports with score 100.\`);
`;
}

function gitignore() {
  return `node_modules/
dist/
test-results/
playwright-report/
coverage/
*.tsbuildinfo
.env
.env.*
`;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Expected --name value arguments, received ${key ?? "<end>"}.`);
    }
    args[key.slice(2)] = value;
  }
  return args;
}

function runCli() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args.spec || !args.output) {
      throw new Error("Both --spec and --output are required.");
    }
    const target = scaffoldTemplate({
      spec: readSpec(args.spec),
      outputDirectory: args.output
    });
    console.log(`Created React template draft at ${target}.`);
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  scaffoldTemplate,
  validateSpec
};
