import { expect, test } from "@playwright/test";

test("browses and filters the article archive", async ({ page }) => {
  await page.goto("/articles");
  await expect(page.getByRole("heading", { level: 1, name: "Browse all articles" })).toBeVisible();
  await page.getByLabel("Topic").selectOption("accessibility");
  await expect(page.getByText("2 articles")).toBeVisible();
  await page.getByLabel("Search articles").fill("alternative text");
  await expect(page.getByRole("heading", { level: 3, name: "Writing useful alternative text" })).toBeVisible();
  await expect(page.getByText("1 articles")).toBeVisible();
});

test("opens a complete article and author profile", async ({ page }) => {
  await page.goto("/articles/designing-readable-guides");
  await expect(page.getByRole("heading", { level: 1, name: "Designing guides people can actually read" })).toBeVisible();
  await page.getByRole("link", { name: "View author profile" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Maya Chen" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Articles by Maya Chen" })).toBeVisible();
});

test("home presents the editorial thesis and featured story", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Notes for people building clearer communities" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Read the featured story" })).toBeVisible();
});
