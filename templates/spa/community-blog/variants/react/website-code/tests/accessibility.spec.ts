import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import AccessibilityInsightsReport from "accessibility-insights-report";
import { routes } from "../src/routes";

const { reporterFactory } = AccessibilityInsightsReport;
const websiteCodePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportsDirectory = path.join(websiteCodePath, "docs", "a11y-reports");
const generatedDirectory = path.join(reportsDirectory, ".generated");

test("generates automated accessibility evidence", async ({ page }, testInfo) => {
  const viewport = testInfo.project.name === "mobile" ? "mobile" : "desktop";
  const scans = [];

  for (const route of routes) {
    await page.goto(route.path);
    await expect(page.locator("main")).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const reportName = `automated-${route.id}-${viewport}.html`;
    const reportHtml = reporterFactory().fromAxeResult({
      results,
      description: `${route.id} automated accessibility scan at the ${viewport} viewport`,
      serviceName: "Community Blog",
      scanContext: { pageTitle: await page.title() }
    }).asHTML();
    fs.writeFileSync(path.join(reportsDirectory, reportName), reportHtml, "utf8");
    scans.push({
      routeId: route.id,
      viewport,
      engineVersion: results.testEngine.version,
      violations: results.violations.length,
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      incompleteRules: results.incomplete.map((result) => result.id).sort(),
      report: reportName
    });
    expect.soft(results.violations, `${route.id}:${viewport}`).toEqual([]);
  }

  fs.writeFileSync(
    path.join(generatedDirectory, `${viewport}.json`),
    JSON.stringify(scans, null, 2)
  );
});
