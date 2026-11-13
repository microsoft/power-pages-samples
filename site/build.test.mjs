import { test } from "node:test";
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("catalog distinguishes repository non-SPA templates from platform and SPA templates", (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "power-pages-catalog-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(path.join(repo, "site"), path.join(root, "site"), { recursive: true });

  const manifest = JSON.parse(readFileSync(path.join(repo, "templates/manifest.json"), "utf8"));
  const spa = manifest.templates.find((entry) => entry.id === "311-portal");
  const platform = manifest.templates.find((entry) => entry.id === "starter-layout-1");
  const community = {
    id: "community-library",
    displayName: "Community Library",
    description: "A library portal",
    kind: "non-spa",
    keywords: ["library"],
    audience: ["makers"],
    author: "Northwind",
    responsivePreviews: [
      {
        id: "home",
        displayName: "Home",
        desktop: "non-spa/community-library/previews/desktop-home.png",
        mobile: "non-spa/community-library/previews/mobile-home.png"
      },
      {
        id: "about",
        displayName: "About",
        desktop: "non-spa/community-library/previews/desktop-about.png",
        mobile: "non-spa/community-library/previews/mobile-about.png"
      }
    ],
    requiredDataverseLanguages: [1033],
    variants: { none: {} }
  };
  const entries = [spa, platform, community];
  mkdirSync(path.join(root, "templates/non-spa/community-library/previews"), { recursive: true });
  for (const entry of [spa, platform]) {
    mkdirSync(path.join(root, "templates", entry.kind, entry.id), { recursive: true });
    const images = entry.previewImages || entry.responsivePreviews.flatMap((preview) => [preview.desktop, preview.mobile]);
    for (const image of images) {
      const target = path.join(root, "templates", image);
      mkdirSync(path.dirname(target), { recursive: true });
      cpSync(path.join(repo, "templates", image), target);
    }
  }
  for (const preview of community.responsivePreviews) {
    for (const image of [preview.desktop, preview.mobile]) {
      cpSync(path.join(repo, "templates/spa/311-portal/previews/home.png"), path.join(root, "templates", image));
    }
  }
  const index = readFileSync(path.join(root, "site/index.html"), "utf8");
  for (const [, image] of index.matchAll(/\bsrc="(templates\/[^"]+)"/g)) {
    const target = path.join(root, image);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(path.join(repo, image), target);
  }
  writeFileSync(path.join(root, "templates/manifest.json"), JSON.stringify({ templates: entries }));
  // The fixture omits other platform entries, so their site-only overrides must be omitted too.
  const dataPath = path.join(root, "site/data.js");
  const data = readFileSync(dataPath, "utf8").replace(/templateOverrides: \{[\s\S]*?\n    \},/, "templateOverrides: {},");
  writeFileSync(dataPath, data);
  const result = spawnSync(process.execPath, ["site/build.mjs", "--out", "out"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);

  const context = { window: {} };
  vm.runInNewContext(readFileSync(path.join(root, "out/data.js"), "utf8"), context);
  const categories = context.window.CATALOG.groups[0].categories;
  const find = (id) => categories.flatMap((category) => category.items).find((item) => item.id === id);
  const actual = find(community.id);
  assert.equal(actual.publisher, "Northwind");
  assert.equal(actual.images.length, 2);
  assert.equal(actual.images[0].label, "Home");
  assert.equal(actual.images[0].src, `templates/${community.responsivePreviews[0].desktop}`);
  assert.equal(actual.images[0].mobile, `templates/${community.responsivePreviews[0].mobile}`);
  assert.equal(actual.images[1].label, "About");
  assert.equal(actual.devices, true);
  assert.equal(actual.prompt, undefined);
  assert.match(actual.howTo, /README/i);
  assert.doesNotMatch(actual.howTo, /Create Website API|design studio/i);
  assert.ok(readFileSync(path.join(root, "out", actual.images[0].src)).length > 0);

  assert.match(find(spa.id).prompt, /\/create-site/);
  assert.equal(find(spa.id).images[0].src, `templates/${spa.previewImages[0]}`);
  assert.match(find(platform.id).prompt, /Create Website template name StarterLayout1/);
  assert.equal(find(platform.id).images[0].mobile, `templates/${platform.responsivePreviews[0].mobile}`);
  assert.equal(find(platform.id).devices, true);
});
