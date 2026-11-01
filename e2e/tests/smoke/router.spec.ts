import { test, expect } from "../../src/fixtures";
import { routes } from "../../src/env";

test.describe("@smoke Role router", () => {
  test("product home opens the role router", async ({ page }) => {
    await page.goto(routes.home);
    await expect(page).toHaveURL(/\/app\/student\/router$/);
    await expect(page.getByRole("heading", { name: "Choose a door" })).toBeVisible();
    await expect(page.getByRole("link", { name: /I’m here to learn/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /I’m a teacher/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /I’m a parent/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Workspace Owner \/ Admin/ })).toBeVisible();
  });

  test("student door opens the catalog student sign-in", async ({ page }) => {
    await page.goto(routes.router);
    await page.getByRole("link", { name: /I’m here to learn/ }).click();
    await expect(page).toHaveURL(/\/app\/student\/student-login$/);
    await expect(page.getByRole("heading", { name: "Enter the 6-digit code" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Phone", exact: true })).toBeVisible();
    await expect(page.getByLabel("Digit 1")).toBeVisible();
    await expect(page.getByRole("button", { name: "Verify", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Magic link" })).toBeVisible();
  });

  test("parent door opens the parent-link screen behind a sign-in", async ({ page }) => {
    await page.goto(routes.router);
    await page.getByRole("link", { name: /I’m a parent/ }).click();
    await expect(page).toHaveURL(/\/app\/parent\/parent-link$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
});
