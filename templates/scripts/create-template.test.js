"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const { scaffoldTemplate, validateSpec } = require("./create-template");

function validSpec() {
  return {
    schemaVersion: 1,
    id: "community-shop",
    displayName: "Community Shop",
    description: "An accessible storefront starting point.",
    author: "Contoso",
    dataModel: "custom",
    audience: ["makers", "developers"],
    routes: [
      {
        id: "home",
        path: "/",
        displayName: "Home",
        summary: "Introduce the storefront."
      },
      {
        id: "catalog",
        path: "/catalog",
        displayName: "Catalog",
        summary: "Browse available products."
      }
    ],
    seedData: {
      schemaVersion: 1,
      tables: {
        products: {
          logicalName: "sample_product",
          entitySet: "sample_products",
          idColumn: "sample_productid",
          records: [
            {
              sample_productid: "10000000-0000-4000-8000-000000000001",
              sample_name: "Sample product"
            }
          ]
        }
      }
    }
  };
}

test("creates a canonical React template draft without fabricated platform artifacts", () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "template-scaffold-"));
  const target = scaffoldTemplate({ spec: validSpec(), outputDirectory: output });

  for (const relativePath of [
    "README.md",
    "seed-data/data.json",
    "solutions/README.md",
    "variants/react/website-code/.npmrc",
    "variants/react/website-code/package.json",
    "variants/react/website-code/playwright.config.ts",
    "variants/react/website-code/powerpages.config.json",
    "variants/react/website-code/template-quality.json",
    "variants/react/website-code/src/App.tsx",
    "variants/react/website-code/src/assets/PowerPages_scalable.svg",
    "variants/react/website-code/src/components/PowerPagesBadge.tsx",
    "variants/react/website-code/src/routes.json",
    "variants/react/website-code/src/vite-env.d.ts",
    "variants/react/website-code/tests/accessibility.spec.ts",
    "variants/react/website-code/tests/previews.spec.ts",
    "variants/react/website-code/tests/routes.test.mjs"
  ]) {
    assert(fs.existsSync(path.join(target, relativePath)), `${relativePath} should exist`);
  }

  assert.equal(
    fs.existsSync(path.join(target, "variants/react/website-code/.powerpages-site")),
    false
  );
  assert.equal(
    fs.existsSync(path.join(target, "variants/react/website-code/docs/a11y-reports/accessibility-summary.json")),
    false
  );
  assert.equal(
    fs.existsSync(path.join(target, "variants/react/website-code/docs/codeql-reports/codeql-results.sarif")),
    false
  );

  const quality = JSON.parse(fs.readFileSync(
    path.join(target, "variants/react/website-code/template-quality.json"),
    "utf8"
  ));
  assert.equal(quality.templateId, "community-shop");
  assert.deepEqual(quality.viewports, ["desktop", "mobile"]);
  assert.deepEqual(quality.routes.map((route) => route.id), ["home", "catalog"]);

  const packageJson = JSON.parse(fs.readFileSync(
    path.join(target, "variants/react/website-code/package.json"),
    "utf8"
  ));
  assert.equal(packageJson.dependencies.react, "^18.3.1");
  assert.equal(packageJson.dependencies["react-dom"], "^18.3.1");
  assert.equal(packageJson.devDependencies["@axe-core/playwright"], "4.11.0");
  assert.equal(packageJson.devDependencies["accessibility-insights-report"], "7.7.0");
  assert.equal(packageJson.devDependencies.vitest, undefined);
  assert.equal(packageJson.scripts.test, "node --test tests/routes.test.mjs");
  assert.match(packageJson.scripts.quality, /^npm test/);
  assert.equal(
    fs.readFileSync(path.join(target, "variants/react/website-code/.npmrc"), "utf8"),
    "omit-lockfile-registry-resolved=true\n"
  );

  const badgeSource = fs.readFileSync(
    path.join(target, "variants/react/website-code/src/components/PowerPagesBadge.tsx"),
    "utf8"
  );
  assert.match(
    badgeSource,
    /<div className="powered-badge" role="group" aria-label="Platform attribution">/
  );
  assert.doesNotMatch(badgeSource, /<aside/);

  const routeTest = spawnSync(
    process.execPath,
    ["--test", path.join(target, "variants/react/website-code/tests/routes.test.mjs")],
    { encoding: "utf8" }
  );
  assert.equal(routeTest.status, 0, routeTest.stderr || routeTest.stdout);

  for (const testFile of [
    "tests/smoke.spec.ts",
    "tests/accessibility.spec.ts",
    "tests/previews.spec.ts"
  ]) {
    const contents = fs.readFileSync(
      path.join(target, "variants/react/website-code", testFile),
      "utf8"
    );
    assert.match(contents, /routes\.json/);
    assert.doesNotMatch(contents, /from "\.\.\/src\/routes"/);
  }

  const playwrightConfig = fs.readFileSync(
    path.join(target, "variants/react/website-code/playwright.config.ts"),
    "utf8"
  );
  assert.match(playwrightConfig, /viewport: \{ width: 1440, height: 1000 \}/);
});

test("rejects unsafe, incomplete, and duplicate scaffold input", () => {
  const spec = validSpec();
  spec.id = "Not Valid";
  spec.audience = ["makers", "makers", "unknown"];
  spec.routes[1].id = "home";
  spec.routes[1].path = "/";
  spec.seedData.tables.products.records = [];

  const errors = validateSpec(spec);
  assert(errors.some((error) => error.includes("kebab-case")));
  assert(errors.some((error) => error.includes("Unsupported audience")));
  assert(errors.some((error) => error.includes("duplicates")));
  assert(errors.some((error) => error.includes("Duplicate route id")));
  assert(errors.some((error) => error.includes("Duplicate route path")));
  assert(errors.some((error) => error.includes("representative record")));
});

test("refuses to overwrite an existing template draft", () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "template-scaffold-"));
  scaffoldTemplate({ spec: validSpec(), outputDirectory: output });

  assert.throws(
    () => scaffoldTemplate({ spec: validSpec(), outputDirectory: output }),
    /Refusing to overwrite/
  );
});

test("creates a platform-only draft without custom solution or seed artifacts", () => {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "template-scaffold-"));
  const spec = validSpec();
  spec.id = "platform-shop";
  spec.dataModel = "platform-only";
  delete spec.seedData;
  spec.sampleData = {
    products: [{ id: "sample-product", name: "Sample product" }]
  };

  const target = scaffoldTemplate({ spec, outputDirectory: output });

  assert.equal(fs.existsSync(path.join(target, "solutions")), false);
  assert.equal(fs.existsSync(path.join(target, "seed-data")), false);
  assert(fs.existsSync(path.join(
    target,
    "variants/react/website-code/src/sample-data.json"
  )));
  const quality = JSON.parse(fs.readFileSync(
    path.join(target, "variants/react/website-code/template-quality.json"),
    "utf8"
  ));
  assert.equal(quality.dataModel, "platform-only");
});
