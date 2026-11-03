#!/usr/bin/env node
// Builds the showcase site into a self-contained folder for GitHub Pages.
//
//   node site/build.mjs              -> writes _site/
//   node site/build.mjs --out <dir>  -> writes <dir>/
//
// The build copies the site files plus only the preview images the catalog
// references, and fails when the catalog drifts from the repository.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(siteDir, "..");
const siteFiles = ["index.html", "styles.css", "data.js", "app.js"];

function parseOutDir(argv) {
  const index = argv.indexOf("--out");
  if (index === -1) return path.join(repoRoot, "_site");
  if (!argv[index + 1]) throw new Error("--out needs a directory");
  return path.resolve(process.cwd(), argv[index + 1]);
}

// data.js is a browser script that assigns window.CATALOG, so evaluate it in a
// sandbox with a stand-in window instead of importing it as a module.
function loadCatalog() {
  const context = { window: {} };
  vm.runInNewContext(readFileSync(path.join(siteDir, "data.js"), "utf8"), context, { filename: "data.js" });
  if (!context.window.CATALOG) throw new Error("site/data.js did not define window.CATALOG");
  return context.window.CATALOG;
}

function catalogEntries(catalog) {
  return catalog.groups.flatMap((group) =>
    group.categories.flatMap((category) => category.items.map((item) => ({ group, category, item })))
  );
}

function collectAssets(catalog, indexHtml) {
  const assets = new Set();
  for (const { item } of catalogEntries(catalog)) {
    for (const image of item.images) {
      assets.add(image.src);
      if (image.mobile) assets.add(image.mobile);
    }
  }
  for (const match of indexHtml.matchAll(/\bsrc="((?:templates|samples)\/[^"]+)"/g)) assets.add(match[1]);
  return [...assets].sort();
}

function validate(catalog, assets) {
  const errors = [];
  const entries = catalogEntries(catalog);

  for (const { item } of entries) {
    const dir = path.join(repoRoot, item.path);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) errors.push(`${item.id}: path ${item.path} is not a folder`);
  }

  for (const asset of assets) {
    if (!existsSync(path.join(repoRoot, asset))) errors.push(`missing image: ${asset}`);
  }

  const manifest = JSON.parse(readFileSync(path.join(repoRoot, "templates", "manifest.json"), "utf8"));
  const manifestIds = new Set(manifest.templates.map((t) => t.id));
  const catalogTemplateIds = new Set(entries.filter((e) => e.group.id === "templates").map((e) => e.item.id));
  for (const id of manifestIds) {
    if (!catalogTemplateIds.has(id)) errors.push(`template ${id} is in templates/manifest.json but not in site/data.js`);
  }
  for (const id of catalogTemplateIds) {
    if (!manifestIds.has(id)) errors.push(`template ${id} is in site/data.js but not in templates/manifest.json`);
  }

  return errors;
}

function build(outDir) {
  // Guard against wiping the repository or the site sources by mistake.
  const relative = path.relative(outDir, repoRoot);
  const containsRepo = relative === "" || !relative.startsWith("..");
  if (containsRepo || outDir === siteDir) {
    throw new Error(`refusing to use ${outDir} as the output folder`);
  }

  const catalog = loadCatalog();
  const indexHtml = readFileSync(path.join(siteDir, "index.html"), "utf8");
  const assets = collectAssets(catalog, indexHtml);
  const errors = validate(catalog, assets);
  if (errors.length) {
    throw new Error(`site catalog is out of date:\n  - ${errors.join("\n  - ")}`);
  }

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  for (const file of siteFiles) cpSync(path.join(siteDir, file), path.join(outDir, file));
  for (const asset of assets) {
    const target = path.join(outDir, asset);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(path.join(repoRoot, asset), target);
  }

  const items = catalogEntries(catalog).length;
  console.log(`Built ${items} catalog entries and ${assets.length} images into ${path.relative(process.cwd(), outDir) || "."}`);
}

try {
  build(parseOutDir(process.argv.slice(2)));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
