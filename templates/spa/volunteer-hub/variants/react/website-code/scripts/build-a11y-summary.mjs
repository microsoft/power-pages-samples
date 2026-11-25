import crypto from "node:crypto";
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
  const fragmentPath = path.join(generatedDirectory, `${viewport}.json`);
  if (!fs.existsSync(fragmentPath)) {
    throw new Error(`Missing accessibility scan fragment for ${viewport}.`);
  }
  scans.push(...JSON.parse(fs.readFileSync(fragmentPath, "utf8")));
}

const expected = new Set(
  qualityContract.routes.flatMap((route) =>
    qualityContract.viewports.map((viewport) => `${route.id}:${viewport}`)
  )
);
const actual = new Set(scans.map((scan) => `${scan.routeId}:${scan.viewport}`));
for (const expectedScan of expected) {
  if (!actual.has(expectedScan)) {
    throw new Error(`Missing accessibility scan ${expectedScan}.`);
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
  `${left.routeId}:${left.viewport}`.localeCompare(`${right.routeId}:${right.viewport}`)
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
  JSON.stringify(summary, null, 2) + "\n"
);
fs.rmSync(generatedDirectory, { force: true, recursive: true });

if (totalViolations !== 0) {
  throw new Error(`Automated accessibility scans found ${totalViolations} violation(s).`);
}

console.log(`Generated ${scans.length} accessibility reports with score 100.`);
