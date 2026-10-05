"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

test("generates stable deployment patterns for Vite hashes containing hyphens", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "supplier-postbuild-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const scripts = path.join(root, "scripts");
  const assets = path.join(root, "dist", "assets");
  fs.mkdirSync(scripts);
  fs.mkdirSync(assets, { recursive: true });
  const script = path.join(scripts, "postbuild.mjs");
  fs.copyFileSync(
    path.join(__dirname, "../spa/supplier-invoice-portal/variants/react/website-code/scripts/postbuild.js"),
    script
  );
  const configPath = path.join(root, "powerpages.config.json");
  fs.writeFileSync(configPath, JSON.stringify({
    siteName: "test-site",
    bundleFilePatterns: ["stale-*.js"]
  }));

  for (const name of [
    "SubmitInvoice-C-5NEgfP.js",
    "SubmitInvoice-abcdefgh.js",
    "circle-check-CNq-eRNn.js",
    "send-c-123456.js",
    "index--abc123_.css",
    "icon-abc123_-.svg",
    "index.js",
    "index-abcdefgh.js.map"
  ]) {
    fs.writeFileSync(path.join(assets, name), "");
  }

  execFileSync(process.execPath, [script], { cwd: root });
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  assert.equal(config.siteName, "test-site");
  assert.deepEqual(config.bundleFilePatterns, [
    "SubmitInvoice-*.js",
    "circle-check-*.js",
    "icon-*.svg",
    "index-*.css",
    "send-*.js"
  ]);

  const firstOutput = fs.readFileSync(configPath, "utf8");
  execFileSync(process.execPath, [script], { cwd: root });
  assert.equal(fs.readFileSync(configPath, "utf8"), firstOutput);
});

test("syncs rebuilt site bundles without changing existing web-file identities", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "supplier-assets-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const scripts = path.join(root, "scripts");
  const assets = path.join(root, "dist/assets");
  const webFiles = path.join(root, ".powerpages-site/web-files");
  fs.mkdirSync(scripts);
  fs.mkdirSync(assets, { recursive: true });
  fs.mkdirSync(webFiles, { recursive: true });
  const script = path.join(scripts, "sync-site-assets.mjs");
  fs.copyFileSync(
    path.join(__dirname, "../spa/supplier-invoice-portal/variants/react/website-code/scripts/sync-site-assets.mjs"),
    script
  );
  const oldName = "supplierService-abcdefgh.js";
  const oldFolder = oldName.toLowerCase();
  fs.mkdirSync(path.join(webFiles, oldFolder));
  fs.writeFileSync(path.join(webFiles, oldFolder, oldName), "legacy Supplier code");
  fs.writeFileSync(path.join(webFiles, oldFolder, `${oldName}.webfile.yml`), [
    "id: 11111111-1111-4111-8111-111111111111",
    "objectid: 11111111-1111-4111-8111-111111111111",
    "annotationid: 22222222-2222-4222-8222-222222222222",
    "mimetype: application/javascript",
    `filename: ${oldName}`,
    `name: ${oldName}`,
    `partialurl: ${oldName}`
  ].join("\n"));
  fs.mkdirSync(path.join(webFiles, "index.html"));
  fs.writeFileSync(path.join(webFiles, "index.html/index.html"), "old landing page");
  fs.writeFileSync(path.join(root, "dist/index.html"), "new landing page");
  fs.writeFileSync(path.join(assets, "supplierService-C-5NEgfP.js"), "Account code");
  fs.writeFileSync(path.join(assets, "supplier-abcdefgh.js"), "Account choices");
  execFileSync(process.execPath, [script], { cwd: root });

  assert.equal(fs.existsSync(path.join(webFiles, oldFolder)), false);
  const metadataPath = path.join(webFiles, "supplierService-C-5NEgfP.js/supplierService-C-5NEgfP.js.webfile.yml");
  const metadata = fs.readFileSync(metadataPath, "utf8");
  assert.match(metadata, /id: 11111111-1111-4111-8111-111111111111/);
  assert.match(metadata, /annotationid: 22222222-2222-4222-8222-222222222222/);
  assert.match(metadata, /filename: supplierService-C-5NEgfP.js/);
  assert.equal(fs.readFileSync(path.join(webFiles, "supplierService-C-5NEgfP.js/supplierService-C-5NEgfP.js"), "utf8"), "Account code");
  assert.equal(fs.readFileSync(path.join(webFiles, "index.html/index.html"), "utf8"), "new landing page");
  const newMetadataPath = path.join(webFiles, "supplier-abcdefgh.js/supplier-abcdefgh.js.webfile.yml");
  const newMetadata = fs.readFileSync(newMetadataPath, "utf8");
  execFileSync(process.execPath, [script], { cwd: root });
  assert.equal(fs.readFileSync(newMetadataPath, "utf8"), newMetadata);

  fs.unlinkSync(path.join(assets, "supplier-abcdefgh.js"));
  assert.throws(() => execFileSync(process.execPath, [script], { cwd: root, stdio: "pipe" }),
    /Exported bundle is no longer generated/);
  assert.equal(fs.existsSync(newMetadataPath), true);
  execFileSync(process.execPath, [script, "--remove-stale"], { cwd: root });
  assert.equal(fs.existsSync(newMetadataPath), false);
  fs.writeFileSync(metadataPath, metadata.replace("filename: supplierService-C-5NEgfP.js",
    "filename: ../../outside-abcdefgh.js"));
  assert.throws(() => execFileSync(process.execPath, [script, "--remove-stale"], { cwd: root, stdio: "pipe" }),
    /Invalid exported asset filename/);
});
