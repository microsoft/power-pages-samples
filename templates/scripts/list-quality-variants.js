#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

function listQualityVariants(manifest) {
  const variants = [];
  for (const template of manifest.templates ?? []) {
    if (template.qualityStandard !== 1) {
      continue;
    }
    for (const framework of Object.keys(template.variants ?? {})) {
      variants.push({
        id: template.id,
        framework,
        path: `templates/${template.kind}/${template.id}/variants/${framework}/website-code`,
        seedDataPath: template.seedDataPath,
        skip: false
      });
    }
  }
  return variants.sort((left, right) =>
    `${left.id}/${left.framework}`.localeCompare(`${right.id}/${right.framework}`)
  );
}

function runCli() {
  const manifestPath = path.join(__dirname, "..", "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const variants = listQualityVariants(manifest);
  const include = variants.length > 0
    ? variants
    : [{ id: "none", framework: "none", path: ".", seedDataPath: ".", skip: true }];
  process.stdout.write(JSON.stringify({ include }));
}

if (require.main === module) {
  runCli();
}

module.exports = { listQualityVariants };
