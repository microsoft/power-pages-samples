"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { computeQualitySourceDigest } = require("./validate-templates");
const { writeQualityManifest } = require("./write-quality-manifest");

test("writes a source-bound quality manifest", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "quality-manifest-"));
  const websiteCodePath = path.join(root, "website-code");
  const seedDataPath = path.join(root, "seed-data", "data.json");
  fs.mkdirSync(path.join(websiteCodePath, "src"), { recursive: true });
  fs.mkdirSync(path.dirname(seedDataPath), { recursive: true });
  fs.writeFileSync(path.join(websiteCodePath, "src", "App.tsx"), "export const App = () => null;\n");
  fs.writeFileSync(seedDataPath, "{\"records\":[]}\n");

  const { manifest, manifestPath } = writeQualityManifest(websiteCodePath, seedDataPath);

  assert.equal(manifest.schemaVersion, 1);
  assert.equal(
    manifest.sourceDigest,
    computeQualitySourceDigest(websiteCodePath, seedDataPath)
  );
  assert.deepEqual(JSON.parse(fs.readFileSync(manifestPath, "utf8")), manifest);
});
