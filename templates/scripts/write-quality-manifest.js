#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const { computeQualitySourceDigest } = require("./validate-templates");

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Expected --name value arguments, received ${key ?? "<end>"}.`);
    }
    result[key.slice(2)] = value;
  }
  return result;
}

function writeQualityManifest(websiteCodePath, seedDataPath) {
  const resolvedWebsiteCodePath = path.resolve(websiteCodePath);
  const resolvedSeedDataPath = path.resolve(seedDataPath);
  if (!fs.statSync(resolvedWebsiteCodePath).isDirectory()) {
    throw new Error(`Website code directory does not exist: ${resolvedWebsiteCodePath}`);
  }
  if (!fs.statSync(resolvedSeedDataPath).isFile()) {
    throw new Error(`Seed data file does not exist: ${resolvedSeedDataPath}`);
  }

  const docsDirectory = path.join(resolvedWebsiteCodePath, "docs");
  fs.mkdirSync(docsDirectory, { recursive: true });
  const manifest = {
    schemaVersion: 1,
    sourceDigest: computeQualitySourceDigest(resolvedWebsiteCodePath, resolvedSeedDataPath)
  };
  const manifestPath = path.join(docsDirectory, "quality-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  return { manifest, manifestPath };
}

function runCli() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (!args["website-code"] || !args["seed-data"]) {
      throw new Error("Both --website-code and --seed-data are required.");
    }
    const { manifestPath } = writeQualityManifest(args["website-code"], args["seed-data"]);
    console.log(`Wrote ${manifestPath}.`);
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli();
}

module.exports = { writeQualityManifest };
