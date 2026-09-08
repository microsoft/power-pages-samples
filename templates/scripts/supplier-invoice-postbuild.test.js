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
