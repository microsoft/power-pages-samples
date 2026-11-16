import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");

function renderDetail(item, kind) {
  const element = () => ({
    dataset: {},
    addEventListener() {},
    setAttribute() {},
    contains() { return false; },
    focus() {},
    querySelector() { return element(); }
  });
  const elements = new Map();
  const getElementById = (id) => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  const search = getElementById("search");
  search.form = element();
  const dialog = getElementById("detail");
  dialog.showModal = () => { dialog.open = true; };
  const category = { id: kind, mat: "spa", tag: "Template", short: "Template", items: [item] };
  const groups = [{ id: "templates", name: "Templates", intro: "", categories: [category] }];
  const document = {
    getElementById,
    createElement: element,
    querySelectorAll: () => [],
    body: { append() {} },
    documentElement: { dataset: {} }
  };
  const window = { CATALOG: { repo: "https://example.test/", groups }, addEventListener() {} };
  vm.runInNewContext(app, {
    window, document, URL, URLSearchParams,
    location: { search: `?item=${item.id}`, hash: "", pathname: "/", href: "https://example.test/" },
    history: { replaceState() {} },
    localStorage: { getItem() { return null; } },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    getComputedStyle: () => ({ getPropertyValue: () => "" })
  });
  return dialog.innerHTML;
}

test("detail panels show escaped publisher names for every template kind", () => {
  const base = { id: "example", name: "Example", desc: "", path: "templates/example/", tags: [], images: [] };
  for (const [kind, extra] of [
    ["spa", {}],
    ["non-spa", { howTo: "See README." }],
    ["non-spa", { devices: true }]
  ]) {
    const html = renderDetail({ ...base, ...extra, publisher: "Northwind & Co" }, kind);
    assert.match(html, /Published by Northwind &amp; Co/);
  }
  assert.doesNotMatch(renderDetail(base, "spa"), /Published by/);
});

test("responsive non-SPA entries expose page and device controls", () => {
  const html = renderDetail({
    id: "community-template",
    name: "Community template",
    desc: "",
    path: "templates/non-spa/community-template/",
    tags: [],
    devices: true,
    images: [
      {
        label: "Home",
        src: "templates/non-spa/community-template/previews/desktop-home.png",
        mobile: "templates/non-spa/community-template/previews/mobile-home.png"
      },
      {
        label: "About",
        src: "templates/non-spa/community-template/previews/desktop-about.png",
        mobile: "templates/non-spa/community-template/previews/mobile-about.png"
      }
    ]
  }, "non-spa");

  assert.match(html, /aria-label="Pages"/);
  assert.match(html, /data-page="home"/);
  assert.match(html, /data-page="about"/);
  assert.match(html, />Desktop</);
  assert.match(html, />Mobile</);
});
