import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const routesPath = fileURLToPath(new URL("../src/routes.json", import.meta.url));
const routes = JSON.parse(fs.readFileSync(routesPath, "utf8"));

test("route contract uses unique ids and paths", () => {
  assert.equal(new Set(routes.map((route) => route.id)).size, routes.length);
  assert.equal(new Set(routes.map((route) => route.path)).size, routes.length);
});
