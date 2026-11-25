#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const KNOWN_FRAMEWORKS = new Set(["react", "angular", "vue", "astro", "none"]);
const TEST_SCRIPT_ORDER = ["test", "build", "test:e2e", "test:a11y"];

function readJson(filePath, description) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read ${description} at ${filePath}: ${error.message}`);
  }
}

function detectFramework(websiteCodePath, variantKey, packageJson = null) {
  if (KNOWN_FRAMEWORKS.has(variantKey)) {
    return variantKey;
  }
  if (fs.existsSync(path.join(websiteCodePath, "angular.json"))) {
    return "angular";
  }
  if (["astro.config.mjs", "astro.config.ts", "astro.config.js"].some((name) =>
    fs.existsSync(path.join(websiteCodePath, name)))) {
    return "astro";
  }
  const dependencies = {
    ...(packageJson?.dependencies ?? {}),
    ...(packageJson?.devDependencies ?? {})
  };
  if (Object.hasOwn(dependencies, "vue")) {
    return "vue";
  }
  if (Object.hasOwn(dependencies, "react")) {
    return "react";
  }
  if (
    fs.existsSync(path.join(websiteCodePath, ".powerpages-site", ".portalconfig")) ||
    !packageJson && fs.existsSync(path.join(websiteCodePath, ".powerpages-site", "website.yml"))
  ) {
    return "none";
  }
  return packageJson ? "generic-spa" : "unknown";
}

function detectPackageManager(websiteCodePath, packageJson, errors) {
  if (!packageJson) {
    return null;
  }
  const lockfiles = [
    { manager: "npm", file: "package-lock.json", restore: "npm ci" },
    { manager: "pnpm", file: "pnpm-lock.yaml", restore: "pnpm install --frozen-lockfile" },
    { manager: "yarn", file: "yarn.lock", restore: "yarn install --immutable" },
    { manager: "bun", file: "bun.lock", restore: "bun install --frozen-lockfile" },
    { manager: "bun", file: "bun.lockb", restore: "bun install --frozen-lockfile" }
  ].filter((entry) => fs.existsSync(path.join(websiteCodePath, entry.file)));

  if (lockfiles.length === 0) {
    errors.push("SPA website code requires exactly one committed dependency lockfile.");
    return null;
  }
  if (lockfiles.length > 1) {
    errors.push(
      `SPA website code contains multiple dependency lockfiles: ${lockfiles.map((entry) => entry.file).join(", ")}.`
    );
    return null;
  }
  return lockfiles[0];
}

function runCommand(packageManager, scriptName) {
  switch (packageManager) {
    case "npm":
      return `npm run ${scriptName}`;
    case "pnpm":
      return `pnpm run ${scriptName}`;
    case "yarn":
      return `yarn ${scriptName}`;
    case "bun":
      return `bun run ${scriptName}`;
    default:
      return null;
  }
}

function discoverVariantRoots(inputPath) {
  const resolvedInput = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInput) || !fs.statSync(resolvedInput).isDirectory()) {
    throw new Error(`Template path does not exist or is not a directory: ${resolvedInput}`);
  }

  const variantsDirectory = path.join(resolvedInput, "variants");
  if (fs.existsSync(variantsDirectory) && fs.statSync(variantsDirectory).isDirectory()) {
    const variants = fs.readdirSync(variantsDirectory, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        variantKey: entry.name,
        websiteCodePath: path.join(variantsDirectory, entry.name, "website-code")
      }))
      .filter((entry) =>
        fs.existsSync(entry.websiteCodePath) &&
        fs.statSync(entry.websiteCodePath).isDirectory()
      );
    if (variants.length === 0) {
      throw new Error(`Template family contains no variants/*/website-code directories: ${resolvedInput}`);
    }
    return { familyRoot: resolvedInput, variants };
  }

  const isWebsiteCode = [
    "package.json",
    "powerpages.config.json"
  ].some((name) => fs.existsSync(path.join(resolvedInput, name))) ||
    fs.existsSync(path.join(resolvedInput, ".powerpages-site", "website.yml"));
  if (!isWebsiteCode) {
    throw new Error(
      `Template path must be a family root with variants/ or a website project containing package.json, ` +
      `powerpages.config.json, or .powerpages-site/website.yml: ${resolvedInput}`
    );
  }

  const parentName = path.basename(path.dirname(resolvedInput));
  const variantKey = KNOWN_FRAMEWORKS.has(parentName) ? parentName : "auto";
  return {
    familyRoot: path.basename(resolvedInput) === "website-code"
      ? path.resolve(resolvedInput, "..", "..", "..")
      : resolvedInput,
    variants: [{ variantKey, websiteCodePath: resolvedInput }]
  };
}

function inspectVariant({ variantKey, websiteCodePath }) {
  const errors = [];
  const packagePath = path.join(websiteCodePath, "package.json");
  const packageJson = fs.existsSync(packagePath)
    ? readJson(packagePath, "package manifest")
    : null;
  const framework = detectFramework(websiteCodePath, variantKey, packageJson);
  const packageManager = detectPackageManager(websiteCodePath, packageJson, errors);
  const scripts = packageJson?.scripts ?? {};
  const isSpa = framework !== "none";

  if (isSpa && !packageJson) {
    errors.push(`SPA variant "${variantKey}" requires package.json.`);
  }
  if (isSpa && typeof scripts.build !== "string") {
    errors.push(`SPA variant "${variantKey}" requires a build script.`);
  }

  const qualityContractPath = path.join(websiteCodePath, "template-quality.json");
  const qualityContract = fs.existsSync(qualityContractPath)
    ? readJson(qualityContractPath, "template quality contract")
    : null;
  if (qualityContract?.framework && qualityContract.framework !== framework) {
    errors.push(
      `template-quality.json declares framework "${qualityContract.framework}" but discovery found "${framework}".`
    );
  }

  const selectedScripts = typeof scripts.quality === "string"
    ? ["quality"]
    : TEST_SCRIPT_ORDER.filter((scriptName) => typeof scripts[scriptName] === "string");
  const commands = packageManager
    ? {
        restore: packageManager.restore,
        checks: selectedScripts.map((scriptName) =>
          runCommand(packageManager.manager, scriptName)),
        previews: typeof scripts.previews === "string"
          ? runCommand(packageManager.manager, "previews")
          : null
      }
    : { restore: null, checks: [], previews: null };

  return {
    variantKey,
    framework,
    siteType: framework === "none" ? "non-spa" : "spa",
    websiteCodePath,
    packageManager: packageManager?.manager ?? null,
    lockfile: packageManager?.file ?? null,
    scripts: Object.fromEntries(
      Object.entries(scripts).filter(([name]) =>
        [...TEST_SCRIPT_ORDER, "quality", "previews", "dev", "preview"].includes(name))
    ),
    commands,
    qualityContract: qualityContract
      ? {
          path: qualityContractPath,
          schemaVersion: qualityContract.schemaVersion,
          routeCount: Array.isArray(qualityContract.routes) ? qualityContract.routes.length : 0,
          viewports: qualityContract.viewports ?? []
        }
      : null,
    hasPowerPagesIdentity: fs.existsSync(
      path.join(websiteCodePath, ".powerpages-site", "website.yml")),
    errors
  };
}

function findRepositoryContext(familyRoot) {
  let current = path.resolve(familyRoot);
  while (true) {
    const manifestPath = path.join(current, "templates", "manifest.json");
    if (fs.existsSync(manifestPath)) {
      const relative = path.relative(path.join(current, "templates"), familyRoot)
        .split(path.sep);
      return {
        repositoryRoot: current,
        manifestPath,
        integrated: relative.length >= 2 && !relative[0].startsWith(".."),
        templateId: relative.length >= 2 ? relative[1] : null
      };
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return {
        repositoryRoot: null,
        manifestPath: null,
        integrated: false,
        templateId: null
      };
    }
    current = parent;
  }
}

function inspectTemplate(inputPath) {
  const discovered = discoverVariantRoots(inputPath);
  const variants = discovered.variants.map(inspectVariant);
  const repository = findRepositoryContext(discovered.familyRoot);
  return {
    inputPath: path.resolve(inputPath),
    familyRoot: discovered.familyRoot,
    repository,
    variants,
    errors: variants.flatMap((variant) =>
      variant.errors.map((error) => `${variant.variantKey}: ${error}`))
  };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key !== "--path" || value === undefined) {
      throw new Error("Usage: node templates/scripts/inspect-template.js --path <template-or-website-code>");
    }
    args.path = value;
  }
  if (!args.path) {
    throw new Error("Usage: node templates/scripts/inspect-template.js --path <template-or-website-code>");
  }
  return args;
}

function runCli() {
  try {
    const result = inspectTemplate(parseArgs(process.argv.slice(2)).path);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    if (result.errors.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  detectFramework,
  inspectTemplate,
  inspectVariant
};
