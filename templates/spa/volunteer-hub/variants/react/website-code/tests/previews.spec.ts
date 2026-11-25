import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { mockVolunteerHubDataverse } from "./mockDataverse";

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const websiteCodePath = path.resolve(testsDirectory, "..");
const routes = JSON.parse(
  fs.readFileSync(path.join(websiteCodePath, "src", "routes.json"), "utf8")
);
const previewsDirectory = path.resolve(testsDirectory, "../../../../previews");

for (const route of routes) {
  test(`captures ${route.id} preview`, async ({ page }, testInfo) => {
    await mockVolunteerHubDataverse(page);
    await page.goto(route.path);
    await expect(page.locator("h1")).toBeVisible();
    const viewport = testInfo.project.name === "mobile" ? "mobile" : "desktop";
    await page.screenshot({
      path: path.join(previewsDirectory, `${viewport}-${route.id}.png`),
      fullPage: true
    });
  });
}
