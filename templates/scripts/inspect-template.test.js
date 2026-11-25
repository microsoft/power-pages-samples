"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { inspectTemplate } = require("./inspect-template");

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function createVariant(familyRoot, variant, packageJson, lockfile) {
  const websiteCode = path.join(familyRoot, "variants", variant, "website-code");
  fs.mkdirSync(websiteCode, { recursive: true });
  if (packageJson) {
    writeJson(path.join(websiteCode, "package.json"), packageJson);
  }
  if (lockfile) {
    fs.writeFileSync(path.join(websiteCode, lockfile), "lock\n");
  }
  return websiteCode;
}

test("discovers framework-agnostic family test plans", () => {
  const familyRoot = fs.mkdtempSync(path.join(os.tmpdir(), "inspect-template-"));
  const reactRoot = createVariant(familyRoot, "react", {
    scripts: {
      quality: "npm test && npm run build",
      previews: "playwright test tests/previews.spec.ts",
      build: "vite build",
      test: "vitest run"
    },
    dependencies: { react: "^18.3.1" },
    devDependencies: { "@playwright/test": "^1.65.0" }
  }, "package-lock.json");
  writeJson(path.join(reactRoot, "template-quality.json"), {
    schemaVersion: 1,
    framework: "react",
    routes: [{ id: "home", path: "/" }],
    viewports: ["desktop", "mobile"]
  });
  createVariant(familyRoot, "vue", {
    scripts: {
      build: "vite build",
      test: "vitest run"
    },
    dependencies: { vue: "^3.5.0" }
  }, "pnpm-lock.yaml");

  const result = inspectTemplate(familyRoot);

  assert.deepEqual(result.errors, []);
  assert.equal(result.variants.length, 2);
  assert.deepEqual(
    result.variants.map((variant) => variant.framework),
    ["react", "vue"]
  );
  assert.equal(result.variants[0].commands.restore, "npm ci");
  assert.equal(
    result.variants[0].commands.installBrowser,
    "npx playwright install chromium"
  );
  assert.deepEqual(result.variants[0].commands.checks, ["npm run quality"]);
  assert.equal(result.variants[0].commands.previews, "npm run previews");
  assert.equal(result.variants[0].qualityContract.routeCount, 1);
  assert.equal(result.variants[1].commands.restore, "pnpm install --frozen-lockfile");
  assert.equal(result.variants[1].commands.installBrowser, null);
  assert.deepEqual(
    result.variants[1].commands.checks,
    ["pnpm run test", "pnpm run build"]
  );
});

test("detects standalone Angular and non-SPA projects", () => {
  const angularRoot = fs.mkdtempSync(path.join(os.tmpdir(), "inspect-angular-"));
  writeJson(path.join(angularRoot, "package.json"), {
    scripts: { build: "ng build", test: "ng test --watch=false" },
    dependencies: { "@angular/core": "^20.0.0" }
  });
  fs.writeFileSync(path.join(angularRoot, "yarn.lock"), "lock\n");
  fs.writeFileSync(path.join(angularRoot, "angular.json"), "{}\n");

  const angular = inspectTemplate(angularRoot);
  assert.equal(angular.variants[0].framework, "angular");
  assert.equal(angular.variants[0].packageManager, "yarn");

  const nonSpaRoot = fs.mkdtempSync(path.join(os.tmpdir(), "inspect-non-spa-"));
  fs.mkdirSync(
    path.join(nonSpaRoot, ".powerpages-site", ".portalconfig"),
    { recursive: true }
  );
  fs.writeFileSync(
    path.join(nonSpaRoot, ".powerpages-site", "website.yml"),
    "id: 2288262c-1753-4f25-b699-d135184b42bd\nname: Example\n"
  );

  const nonSpa = inspectTemplate(nonSpaRoot);
  assert.equal(nonSpa.variants[0].framework, "none");
  assert.equal(nonSpa.variants[0].siteType, "non-spa");
  assert.deepEqual(nonSpa.errors, []);
});

test("fails closed for missing or ambiguous lockfiles", () => {
  const familyRoot = fs.mkdtempSync(path.join(os.tmpdir(), "inspect-locks-"));
  const websiteCode = createVariant(familyRoot, "astro", {
    scripts: { build: "astro build" },
    dependencies: { astro: "^5.0.0" }
  }, "package-lock.json");
  fs.writeFileSync(path.join(websiteCode, "pnpm-lock.yaml"), "lock\n");

  const ambiguous = inspectTemplate(familyRoot);
  assert(ambiguous.errors.some((error) => error.includes("multiple dependency lockfiles")));

  fs.rmSync(path.join(websiteCode, "package-lock.json"));
  fs.rmSync(path.join(websiteCode, "pnpm-lock.yaml"));
  const missing = inspectTemplate(familyRoot);
  assert(missing.errors.some((error) => error.includes("exactly one committed dependency lockfile")));
});
