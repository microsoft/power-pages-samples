#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const { computeQualitySourceDigest } = require("./validate-templates");

function writeDesignReview({ websiteCodePath, seedDataPath = null, review }) {
  const websiteCode = path.resolve(websiteCodePath);
  const seedData = seedDataPath ? path.resolve(seedDataPath) : null;
  if (!fs.statSync(websiteCode).isDirectory()) {
    throw new Error(`Website code directory does not exist: ${websiteCode}`);
  }
  const output = {
    ...review,
    schemaVersion: 1,
    skill: "exceptional-web-design",
    mode: "rendered",
    sourceDigest: computeQualitySourceDigest(websiteCode, seedData)
  };
  const outputDirectory = path.join(websiteCode, "docs", "design-review");
  fs.mkdirSync(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, "design-review.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
  return { output, outputPath };
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
    if (!args["website-code"] || !args.review) {
      throw new Error("--website-code and --review are required.");
    }
    const review = JSON.parse(fs.readFileSync(path.resolve(args.review), "utf8"));
    const { outputPath } = writeDesignReview({
      websiteCodePath: args["website-code"],
      seedDataPath: args["seed-data"],
      review
    });
    console.log(`Wrote ${outputPath}.`);
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli();
}

module.exports = { writeDesignReview };
