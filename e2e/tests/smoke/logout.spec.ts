import { test, expect } from "../../src/fixtures";
import { routes } from "../../src/env";
import { loginViaStudentOtp, readStoredToken } from "../../src/auth";

test.describe("@smoke Sign out", () => {
  test("sign out returns to the router and a protected page asks for sign-in", async ({ page }) => {
    await loginViaStudentOtp(page, "student");
    await expect(page.getByRole("heading", { name: /^Hi,/ })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/app\/student\/router$/);
    await expect(page.getByRole("heading", { name: "Choose a door" })).toBeVisible();
    expect(await readStoredToken(page)).toBeNull();

    await page.goto(routes.studentDash);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Hi,/ })).toHaveCount(0);

    await page.goBack();
    await expect(page).toHaveURL(/\/app\/student\/router$/);
    await expect(page.getByRole("heading", { name: "Choose a door" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Hi,/ })).toHaveCount(0);

    await page.goBack();
    await expect(page.getByRole("heading", { name: /^Hi,/ })).toHaveCount(0);
  });
});
