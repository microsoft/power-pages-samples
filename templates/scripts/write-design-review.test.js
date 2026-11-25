"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { computeQualitySourceDigest } = require("./validate-templates");
const { writeDesignReview } = require("./write-design-review");

test("writes exceptional design evidence bound to current source", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-review-"));
  const websiteCodePath = path.join(root, "website-code");
  const seedDataPath = path.join(root, "seed-data", "data.json");
  fs.mkdirSync(path.join(websiteCodePath, "src"), { recursive: true });
  fs.mkdirSync(path.dirname(seedDataPath), { recursive: true });
  fs.writeFileSync(path.join(websiteCodePath, "src", "App.tsx"), "export const App = () => null;\n");
  fs.writeFileSync(seedDataPath, "{}\n");

  const { output, outputPath } = writeDesignReview({
    websiteCodePath,
    seedDataPath,
    review: {
      rounds: 1,
      verdict: "crafted",
      totalScore: 30,
      categories: [],
      criticalGates: [],
      routes: []
    }
  });

  assert.equal(output.schemaVersion, 1);
  assert.equal(output.skill, "exceptional-web-design");
  assert.equal(output.mode, "rendered");
  assert.equal(
    output.sourceDigest,
    computeQualitySourceDigest(websiteCodePath, seedDataPath)
  );
  assert.deepEqual(JSON.parse(fs.readFileSync(outputPath, "utf8")), output);
});
