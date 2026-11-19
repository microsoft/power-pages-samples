import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { routes } from "../src/routes";

const previewsDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../previews"
);

for (const route of routes) {
  test(`captures ${route.id} preview`, async ({ page }, testInfo) => {
    await page.goto(route.path);
    await expect(page.locator("h1")).toBeVisible();
    const viewport = testInfo.project.name === "mobile" ? "mobile" : "desktop";
    await page.screenshot({
      path: path.join(previewsDirectory, `${viewport}-${route.id}.png`),
      fullPage: true
    });
  });
}
