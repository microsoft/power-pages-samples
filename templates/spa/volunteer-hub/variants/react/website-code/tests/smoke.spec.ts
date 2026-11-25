import { expect, test } from "@playwright/test";
import { mockVolunteerHubDataverse } from "./mockDataverse";

test.beforeEach(async ({ page }) => {
  await mockVolunteerHubDataverse(page);
});

test("filters opportunities by focus area and search", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Your time can move a neighborhood forward" })).toBeVisible();
  await page.getByLabel("Focus area").selectOption("Learning");
  await expect(page.getByText("3 opportunities")).toBeVisible();
  await page.getByLabel("Search opportunities").fill("online");
  await expect(page.getByText("1 opportunities")).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Conversation club host" })).toBeVisible();
});

test("shows a clear empty state", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Search opportunities").fill("no matching opportunity");
  await expect(page.getByRole("heading", { level: 3, name: "No opportunities found" })).toBeVisible();
});

test("exposes the catalog through the primary action", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Explore opportunities" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Choose where your time fits" })).toBeVisible();
});
