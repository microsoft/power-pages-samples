#!/usr/bin/env node
// Builds the showcase site into a self-contained folder for GitHub Pages.
//
//   node site/build.mjs              -> writes _site/
//   node site/build.mjs --out <dir>  -> writes <dir>/
//
// Every template is generated from templates/manifest.json, so a new template
// shows up once its manifest entry merges. The output holds the site files, a
// generated data.js, and only the images the catalog uses.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const siteDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(siteDir, "..");
const staticFiles = ["index.html", "theme.css", "styles.css", "app.js"];
const staticDirs = ["assets"];

// Display names for manifest variant keys. A key missing here is shown as-is
// with a capital first letter, so a new framework never breaks the build.
const FRAMEWORKS = { react: "React", vue: "Vue", angular: "Angular", astro: "Astro" };

const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const humanize = (value) => capitalize(value.replace(/[-_]+/g, " "));

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
  // Round-trip through JSON so the catalog is a plain object in this realm.
  return JSON.parse(JSON.stringify(context.window.CATALOG));
}

function templateItem(template, override) {
  const folder = `templates/${template.kind}/${template.id}/`;
  const base = {
    id: template.id,
    name: template.displayName,
    path: folder,
    desc: template.description,
    publisher: template.author
  };

  if (template.kind === "spa") {
    // previewImages paths are relative to templates/, e.g. "spa/311-portal/previews/map.png".
    const images = (template.previewImages || []).map((src) => ({
      label: humanize(path.posix.basename(src, path.posix.extname(src))),
      src: `templates/${src}`
    }));
    return {
      ...base,
      tags: Object.keys(template.variants || {}).map((key) => FRAMEWORKS[key] || capitalize(key)),
      features: (template.keywords || []).map(humanize),
      featuresTitle: "Topics",
      images,
      ...override
    };
  }

  // Non-SPA previews come in desktop and mobile pairs, already in device frames.
  const images = (template.responsivePreviews || []).map((preview) => ({
    label: preview.displayName,
    src: `templates/${preview.desktop}`,
    mobile: preview.mobile ? `templates/${preview.mobile}` : undefined
  }));
  return {
    ...base,
    // Every non-SPA template is built in the design studio, so a tag would say nothing.
    tags: [],
    features: template.capabilities || [],
    devices: true,
    images,
    ...override
  };
}

function fillTemplates(catalog, manifest, errors) {
  const group = catalog.groups.find((g) => g.id === "templates");
  const categories = new Map(group.categories.map((c) => [c.id, c]));
  const overrides = catalog.templateOverrides || {};
  delete catalog.templateOverrides;

  for (const template of manifest.templates) {
    const category = categories.get(template.kind);
    if (!category) {
      errors.push(`template ${template.id} has kind "${template.kind}", which has no category in site/data.js`);
      continue;
    }
    category.items.push(templateItem(template, overrides[template.id]));
  }

  const ids = new Set(manifest.templates.map((t) => t.id));
  for (const id of Object.keys(overrides)) {
    if (!ids.has(id)) errors.push(`templateOverrides has ${id}, which is not in templates/manifest.json`);
  }
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
  for (const match of indexHtml.matchAll(/\bsrc="(templates\/[^"]+)"/g)) assets.add(match[1]);
  return [...assets].sort();
}

function validate(catalog, assets, errors) {
  const entries = catalogEntries(catalog);

  const seen = new Set();
  for (const { item } of entries) {
    if (seen.has(item.id)) errors.push(`duplicate catalog id: ${item.id}`);
    seen.add(item.id);
    const dir = path.join(repoRoot, item.path);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) errors.push(`${item.id}: path ${item.path} is not a folder`);
  }

  for (const asset of assets) {
    if (!existsSync(path.join(repoRoot, asset))) errors.push(`missing image: ${asset}`);
  }
}

function build(outDir) {
  // Guard against wiping the repository or the site sources by mistake.
  const relative = path.relative(outDir, repoRoot);
  const containsRepo = relative === "" || !relative.startsWith("..");
  if (containsRepo || outDir === siteDir) {
    throw new Error(`refusing to use ${outDir} as the output folder`);
  }

  const errors = [];
  const catalog = loadCatalog();
  const manifest = JSON.parse(readFileSync(path.join(repoRoot, "templates", "manifest.json"), "utf8"));
  fillTemplates(catalog, manifest, errors);

  const indexHtml = readFileSync(path.join(siteDir, "index.html"), "utf8");
  const assets = collectAssets(catalog, indexHtml);
  validate(catalog, assets, errors);
  if (errors.length) {
    throw new Error(`site catalog is out of date:\n  - ${errors.join("\n  - ")}`);
  }

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  for (const file of staticFiles) cpSync(path.join(siteDir, file), path.join(outDir, file));
  for (const dir of staticDirs) cpSync(path.join(siteDir, dir), path.join(outDir, dir), { recursive: true });
  writeFileSync(
    path.join(outDir, "data.js"),
    `// Generated by site/build.mjs from site/data.js and templates/manifest.json. Do not edit.\nwindow.CATALOG = ${JSON.stringify(catalog, null, 2)};\n`
  );
  for (const asset of assets) {
    const target = path.join(outDir, asset);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(path.join(repoRoot, asset), target);
  }

  const items = catalogEntries(catalog).length;
  console.log(`Built ${items} templates and ${assets.length} images into ${path.relative(process.cwd(), outDir) || "."}`);
}

try {
  build(parseOutDir(process.argv.slice(2)));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
