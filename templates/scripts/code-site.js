#!/usr/bin/env node

"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
  normalizeEnvironmentUrl,
  stableStringify
} = require("./dataverse-solution");

const EXCLUDED_DIRECTORIES = new Set([
  ".powerpages-site",
  "node_modules",
  "playwright-report",
  "test-results"
]);

function hashDirectory(root) {
  const files = [];
  collectFiles(root, root, files);
  files.sort((left, right) => left.relative.localeCompare(right.relative));
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash.update(file.relative.replaceAll(path.sep, "/"));
    hash.update("\0");
    hash.update(fs.readFileSync(file.fullPath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function collectFiles(root, current, files) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Code-site source must not contain symbolic links: ${path.relative(root, fullPath)}`);
    }
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
        collectFiles(root, fullPath, files);
      }
    } else {
      files.push({ fullPath, relative: path.relative(root, fullPath) });
    }
  }
}

function inspectSource(rootPath, { requireNew = true } = {}) {
  const root = path.resolve(rootPath);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Code-site root does not exist: ${root}`);
  }
  for (const requiredFile of ["package.json", "powerpages.config.json", ".npmrc"]) {
    if (!fs.existsSync(path.join(root, requiredFile))) {
      throw new Error(`Code-site root requires ${requiredFile}.`);
    }
  }
  if (requireNew && fs.existsSync(path.join(root, ".powerpages-site"))) {
    throw new Error("Code-site root already contains .powerpages-site; refusing a second create.");
  }
  const config = JSON.parse(fs.readFileSync(path.join(root, "powerpages.config.json"), "utf8"));
  if (typeof config.compiledPath !== "string" || !config.compiledPath.trim()) {
    throw new Error("powerpages.config.json requires compiledPath.");
  }
  const compiledPath = path.resolve(root, config.compiledPath);
  if (!isPathInside(root, compiledPath)) {
    throw new Error("compiledPath must resolve inside the code-site root.");
  }
  if (!fs.existsSync(path.join(compiledPath, config.defaultLandingPage ?? "index.html"))) {
    throw new Error("Compiled output does not contain the configured landing page.");
  }
  return { root, config, compiledPath, sourceDigest: hashDirectory(root) };
}

function isPathInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function planInactiveSite({ rootPath, environmentUrl, siteName }) {
  environmentUrl = normalizeEnvironmentUrl(environmentUrl);
  if (typeof siteName !== "string" || !siteName.trim() || siteName.length > 100 || /[\r\n]/.test(siteName)) {
    throw new Error("siteName must be a non-empty single-line value up to 100 characters.");
  }
  const source = inspectSource(rootPath, { requireNew: true });
  const core = {
    planVersion: 1,
    operation: "create-inactive-code-site",
    environmentUrl,
    siteName: siteName.trim(),
    rootPath: source.root,
    compiledPath: path.relative(source.root, source.compiledPath).replaceAll(path.sep, "/"),
    sourceDigest: source.sourceDigest
  };
  return {
    ...core,
    approvalHash: crypto.createHash("sha256").update(stableStringify(core)).digest("hex")
  };
}

function planInactiveSiteUpdate({ rootPath, environmentUrl }) {
  environmentUrl = normalizeEnvironmentUrl(environmentUrl);
  const source = inspectSource(rootPath, { requireNew: false });
  const identity = parseWebsiteYaml(path.join(source.root, ".powerpages-site", "website.yml"));
  const core = {
    planVersion: 1,
    operation: "update-inactive-code-site",
    environmentUrl,
    websiteRecordId: identity.websiteRecordId,
    siteName: identity.siteName,
    rootPath: source.root,
    compiledPath: path.relative(source.root, source.compiledPath).replaceAll(path.sep, "/"),
    sourceDigest: source.sourceDigest
  };
  return {
    ...core,
    approvalHash: crypto.createHash("sha256").update(stableStringify(core)).digest("hex")
  };
}

function assertApprovedPlan(plan, approvedHash) {
  if (plan?.operation !== "create-inactive-code-site" || plan.approvalHash !== approvedHash) {
    throw new Error("Approval hash does not match an inactive code-site plan.");
  }
  const { approvalHash: ignored, ...core } = plan;
  const expected = crypto.createHash("sha256").update(stableStringify(core)).digest("hex");
  if (expected !== plan.approvalHash) {
    throw new Error("Inactive code-site plan contents do not match its approval hash.");
  }
}

function assertApprovedUpdatePlan(plan, approvedHash) {
  if (plan?.operation !== "update-inactive-code-site" || plan.approvalHash !== approvedHash) {
    throw new Error("Approval hash does not match an inactive code-site update plan.");
  }
  const { approvalHash: ignored, ...core } = plan;
  const expected = crypto.createHash("sha256").update(stableStringify(core)).digest("hex");
  if (expected !== plan.approvalHash) {
    throw new Error("Inactive code-site update plan contents do not match its approval hash.");
  }
}

function parseWebsiteYaml(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error("PAC did not create .powerpages-site/website.yml.");
  }
  const values = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*?)\s*$/.exec(line);
    if (match) values[match[1]] = match[2];
  }
  if (!/^[0-9a-f-]{36}$/i.test(values.id ?? "") || !values.name) {
    throw new Error("website.yml does not contain a valid website id and name.");
  }
  return { websiteRecordId: values.id.toLowerCase(), siteName: values.name };
}

function parseSiteList(output, websiteRecordId) {
  const line = output.split(/\r?\n/).find((candidate) =>
    candidate.toLowerCase().includes(websiteRecordId.toLowerCase())
  );
  if (!line) {
    throw new Error(`pac pages list did not return website ${websiteRecordId}.`);
  }
  const inactive = /\sNo\s*$/.test(line);
  const active = /\sYes\s*$/.test(line);
  if (!inactive && !active) {
    throw new Error("Could not determine whether the website is active.");
  }
  return {
    isActive: active,
    hasPortalUrl: !/\sN\/A\s+N\/A\s+Yes\s+No\s*$/.test(line) && !/\sN\/A\s+N\/A\s+Yes\s+Yes\s*$/.test(line),
    rawLine: line.trim()
  };
}

function runPac(args) {
  const result = spawnSync("pac", args, {
    encoding: "utf8",
    windowsHide: true
  });
  if (result.status !== 0) {
    throw new Error(
      `pac ${args.join(" ")} failed: ` +
      (result.error?.message || result.stderr || result.stdout || "unknown error").trim()
    );
  }
  return result.stdout;
}

function inspectInactiveSite({ rootPath, environmentUrl, pacRunner = runPac }) {
  const root = path.resolve(rootPath);
  const identity = parseWebsiteYaml(path.join(root, ".powerpages-site", "website.yml"));
  const list = pacRunner(["pages", "list", "-v"]);
  const state = parseSiteList(list, identity.websiteRecordId);
  if (state.isActive) {
    throw new Error(`Website ${identity.websiteRecordId} is active; expected an inactive template source.`);
  }
  return {
    environmentUrl: normalizeEnvironmentUrl(environmentUrl),
    ...identity,
    isActive: false,
    hasPortalUrl: state.hasPortalUrl
  };
}

function createInactiveSite({ plan, approvedHash, pacRunner = runPac }) {
  assertApprovedPlan(plan, approvedHash);
  const source = inspectSource(plan.rootPath, { requireNew: true });
  if (source.sourceDigest !== plan.sourceDigest) {
    throw new Error("Code-site source changed after approval.");
  }
  pacRunner(["env", "select", "--environment", plan.environmentUrl]);
  pacRunner([
    "pages",
    "upload-code-site",
    "--rootPath",
    plan.rootPath,
    "--siteName",
    plan.siteName
  ]);
  return inspectInactiveSite({
    rootPath: plan.rootPath,
    environmentUrl: plan.environmentUrl,
    pacRunner
  });
}

function updateInactiveSite({ plan, approvedHash, pacRunner = runPac }) {
  assertApprovedUpdatePlan(plan, approvedHash);
  const source = inspectSource(plan.rootPath, { requireNew: false });
  if (source.sourceDigest !== plan.sourceDigest) {
    throw new Error("Code-site source changed after update approval.");
  }
  const identity = parseWebsiteYaml(path.join(source.root, ".powerpages-site", "website.yml"));
  if (identity.websiteRecordId !== plan.websiteRecordId || identity.siteName !== plan.siteName) {
    throw new Error("Local code-site identity changed after update approval.");
  }

  pacRunner(["env", "select", "--environment", plan.environmentUrl]);
  const before = parseSiteList(
    pacRunner(["pages", "list", "-v"]),
    plan.websiteRecordId
  );
  if (before.isActive || before.hasPortalUrl) {
    throw new Error(
      `Website ${plan.websiteRecordId} must remain inactive and have no public URL before update.`
    );
  }

  pacRunner([
    "pages",
    "upload-code-site",
    "--rootPath",
    plan.rootPath
  ]);
  const result = inspectInactiveSite({
    rootPath: plan.rootPath,
    environmentUrl: plan.environmentUrl,
    pacRunner
  });
  if (result.websiteRecordId !== plan.websiteRecordId || result.hasPortalUrl) {
    throw new Error("Updated code site no longer matches the approved inactive source identity.");
  }
  return { ...result, sourceDigest: plan.sourceDigest };
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command };
  for (let index = 0; index < rest.length; index += 2) {
    const key = rest[index];
    const value = rest[index + 1];
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
    if (args.command === "plan") {
      if (!args.root || !args.environment || !args["site-name"] || !args.out) {
        throw new Error("plan requires --root, --environment, --site-name, and --out.");
      }
      const plan = planInactiveSite({
        rootPath: args.root,
        environmentUrl: args.environment,
        siteName: args["site-name"]
      });
      fs.writeFileSync(path.resolve(args.out), JSON.stringify(plan, null, 2) + "\n");
      console.log(JSON.stringify(plan, null, 2));
      return;
    }
    if (args.command === "create") {
      if (!args.plan || !args.approve || !args.journal) {
        throw new Error("create requires --plan, --approve, and --journal.");
      }
      const plan = JSON.parse(fs.readFileSync(path.resolve(args.plan), "utf8"));
      const result = createInactiveSite({ plan, approvedHash: args.approve });
      fs.writeFileSync(path.resolve(args.journal), JSON.stringify(result, null, 2) + "\n");
      console.log(`Created inactive code site ${result.siteName} (${result.websiteRecordId}).`);
      return;
    }
    if (args.command === "plan-update") {
      if (!args.root || !args.environment || !args.out) {
        throw new Error("plan-update requires --root, --environment, and --out.");
      }
      const plan = planInactiveSiteUpdate({
        rootPath: args.root,
        environmentUrl: args.environment
      });
      fs.writeFileSync(path.resolve(args.out), JSON.stringify(plan, null, 2) + "\n");
      console.log(JSON.stringify(plan, null, 2));
      return;
    }
    if (args.command === "update") {
      if (!args.plan || !args.approve || !args.journal) {
        throw new Error("update requires --plan, --approve, and --journal.");
      }
      const plan = JSON.parse(fs.readFileSync(path.resolve(args.plan), "utf8"));
      const result = updateInactiveSite({ plan, approvedHash: args.approve });
      fs.writeFileSync(path.resolve(args.journal), JSON.stringify(result, null, 2) + "\n");
      console.log(`Updated inactive code site ${result.siteName} (${result.websiteRecordId}).`);
      return;
    }
    if (args.command === "inspect") {
      if (!args.root || !args.environment) {
        throw new Error("inspect requires --root and --environment.");
      }
      console.log(JSON.stringify(inspectInactiveSite({
        rootPath: args.root,
        environmentUrl: args.environment
      }), null, 2));
      return;
    }
    throw new Error("Command must be plan, create, plan-update, update, or inspect.");
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  assertApprovedPlan,
  assertApprovedUpdatePlan,
  createInactiveSite,
  hashDirectory,
  inspectInactiveSite,
  inspectSource,
  parseSiteList,
  parseWebsiteYaml,
  planInactiveSite,
  planInactiveSiteUpdate,
  updateInactiveSite
};
